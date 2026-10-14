const SOUND = "jcuki_chime.wav";
const messages = {
  id: {
    member_joined: "bergabung dengan grup",
    schedule_updated: "memperbarui jadwal",
    event_created: "mengajak membuat rencana",
    response_updated: "menjawab rencana",
    event_cancelled: "membatalkan rencana",
    profile_updated: "memperbarui profil",
  },
  en: {
    member_joined: "joined the group",
    schedule_updated: "updated their schedule",
    event_created: "proposed a plan",
    response_updated: "responded to a plan",
    event_cancelled: "cancelled a plan",
    profile_updated: "updated their profile",
  },
};
export function pushContent(activity, device) {
  const language = device.language === "id" ? "id" : "en";
  return {
    to: device.token,
    title: activity.groupName,
    body: `${activity.actorName} ${messages[language][activity.kind] || (language === "id" ? "membagikan kabar baru" : "shared an update")}.`,
    sound: device.sound ? SOUND : null,
    channelId: device.sound ? "jcuki-activity-v2" : "jcuki-activity-silent-v2",
    priority: "high",
    data: {
      kind: "activity",
      activityId: activity.id,
      groupId: activity.groupId,
      eventId: activity.eventId || "",
      activityKind: activity.kind,
      soundEnabled: !!device.sound,
    },
  };
}
export async function activityStatements(
  db,
  groupId,
  actorId,
  kind,
  eventId = null,
  actorName,
) {
  const identity = await db
    .prepare(
      "SELECT p.nickname,g.name FROM profiles p JOIN groups g ON g.id=? WHERE p.id=?",
    )
    .bind(groupId, actorId)
    .first();
  if (!identity) return [];
  const activity = {
    id: crypto.randomUUID(),
    groupId,
    actorId,
    kind,
    eventId,
    actorName: actorName || identity.nickname,
    groupName: identity.name,
    createdAt: new Date().toISOString(),
  };
  const devices = (
    await db
      .prepare(
        "SELECT d.* FROM push_devices d JOIN members m ON m.user_id=d.user_id WHERE m.group_id=? AND d.user_id<>? AND d.enabled=1",
      )
      .bind(groupId, actorId)
      .all()
  ).results;
  return [
    db
      .prepare(
        "INSERT INTO activities(id,group_id,actor_id,kind,event_id,actor_name,group_name,created_at) VALUES(?,?,?,?,?,?,?,?)",
      )
      .bind(
        activity.id,
        groupId,
        actorId,
        kind,
        eventId,
        activity.actorName,
        activity.groupName,
        activity.createdAt,
      ),
    ...devices.map((device) =>
      db
        .prepare(
          "INSERT INTO push_outbox(id,activity_id,user_id,token,payload,next_attempt) VALUES(?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          activity.id,
          device.user_id,
          device.token,
          JSON.stringify(pushContent(activity, device)),
          activity.createdAt,
        ),
    ),
  ];
}
const stamp = (offset = 0) => new Date(Date.now() + offset).toISOString();
async function postpone(db, job, code) {
  const dead = job.attempts >= 8;
  await db
    .prepare(
      "UPDATE push_outbox SET state=?,error=?,next_attempt=? WHERE id=? AND state='sending'",
    )
    .bind(
      dead ? "failed" : "pending",
      String(code).slice(0, 120),
      stamp(Math.min(3600000, 30000 * 2 ** job.attempts)),
      job.id,
    )
    .run();
}
async function retire(db, job, code) {
  await db.batch([
    db
      .prepare("UPDATE push_outbox SET state='failed',error=? WHERE id=?")
      .bind(code, job.id),
    db
      .prepare("UPDATE push_devices SET enabled=0 WHERE user_id=? AND token=?")
      .bind(job.user_id, job.token),
  ]);
}
async function expoRequest(path, body, env) {
  const response = await (env.PUSH_FETCH || fetch)(
    `https://exp.host/--/api/v2/push/${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.EXPO_PUSH_ACCESS_TOKEN
          ? { Authorization: `Bearer ${env.EXPO_PUSH_ACCESS_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok) throw new Error(`EXPO_HTTP_${response.status}`);
  const result = await response.json();
  if (!result.data) throw new Error("EXPO_INVALID_RESPONSE");
  return result.data;
}
export async function deliverPush(env) {
  if (env.PUSH_ENABLED !== "true" || !env.DB) return;
  const db = env.DB,
    now = stamp();
  const candidates = (
    await db
      .prepare(
        "SELECT * FROM push_outbox WHERE state IN ('pending','sending') AND next_attempt<=? ORDER BY next_attempt,id LIMIT 100",
      )
      .bind(now)
      .all()
  ).results;
  if (candidates.length) {
    const claims = await db.batch(
      candidates.map((job) =>
        db
          .prepare(
            "UPDATE push_outbox SET state='sending',attempts=attempts+1,next_attempt=? WHERE id=? AND state IN ('pending','sending') AND next_attempt<=?",
          )
          .bind(stamp(120000), job.id, now),
      ),
    );
    const jobs = candidates
      .filter((_, index) => claims[index].meta.changes === 1)
      .map((job) => ({ ...job, attempts: job.attempts + 1 }));
    if (jobs.length) {
      // Recheck opt-out before sending, including payloads queued with older preferences.
      const active = [];
      for (const job of jobs) {
        const device = await db
          .prepare(
            "SELECT d.* FROM push_devices d JOIN activities a ON a.id=? JOIN members m ON m.user_id=d.user_id AND m.group_id=a.group_id WHERE d.user_id=? AND d.token=? AND d.enabled=1",
          )
          .bind(job.activity_id, job.user_id, job.token)
          .first();
        if (!device) {
          await db
            .prepare("UPDATE push_outbox SET state='skipped' WHERE id=?")
            .bind(job.id)
            .run();
          continue;
        }
        // Rebuild the localized message if the recipient changed language while queued.
        const activity = await db
          .prepare("SELECT * FROM activities WHERE id=?")
          .bind(job.activity_id)
          .first();
        active.push({
          ...job,
          message: pushContent(
            {
              id: activity.id,
              groupId: activity.group_id,
              eventId: activity.event_id,
              actorName: activity.actor_name,
              groupName: activity.group_name,
              kind: activity.kind,
            },
            device,
          ),
        });
      }
      if (active.length) {
        try {
          const tickets = await expoRequest(
            "send",
            active.map((job) => job.message),
            env,
          );
          for (let i = 0; i < active.length; i++) {
            const job = active[i],
              ticket = tickets[i];
            if (ticket?.status === "ok" && typeof ticket.id === "string")
              await db
                .prepare(
                  "UPDATE push_outbox SET state='ticket',ticket_id=?,ticket_created_at=?,next_attempt=? WHERE id=? AND state='sending'",
                )
                .bind(ticket.id, stamp(), stamp(15 * 60000), job.id)
                .run();
            else if (ticket?.details?.error === "DeviceNotRegistered")
              await retire(db, job, "DeviceNotRegistered");
            else
              await postpone(
                db,
                job,
                ticket?.details?.error || "EXPO_TICKET_ERROR",
              );
          }
        } catch (error) {
          for (const job of active) await postpone(db, job, error.message);
        }
      }
    }
  }
  const waiting = (
    await db
      .prepare(
        "SELECT * FROM push_outbox WHERE state='ticket' AND next_attempt<=? ORDER BY next_attempt LIMIT 100",
      )
      .bind(now)
      .all()
  ).results;
  if (waiting.length) {
    try {
      const receipts = await expoRequest(
        "getReceipts",
        { ids: waiting.map((job) => job.ticket_id) },
        env,
      );
      for (const job of waiting) {
        const receipt = receipts[job.ticket_id];
        if (receipt?.status === "ok")
          await db
            .prepare(
              "UPDATE push_outbox SET state='delivered' WHERE id=? AND state='ticket'",
            )
            .bind(job.id)
            .run();
        else if (receipt?.details?.error === "DeviceNotRegistered")
          await retire(db, job, "DeviceNotRegistered");
        else if (receipt)
          await db
            .prepare("UPDATE push_outbox SET state='failed',error=? WHERE id=?")
            .bind(receipt.details?.error || "EXPO_RECEIPT_ERROR", job.id)
            .run();
        else if (Date.now() - Date.parse(job.ticket_created_at) >= 24 * 3600000)
          await db
            .prepare(
              "UPDATE push_outbox SET state='failed',error='RECEIPT_EXPIRED' WHERE id=?",
            )
            .bind(job.id)
            .run();
        else
          await db
            .prepare(
              "UPDATE push_outbox SET next_attempt=? WHERE id=? AND state='ticket'",
            )
            .bind(stamp(15 * 60000), job.id)
            .run();
      }
    } catch {
      // Retry receipt checks, never resend an accepted notification.
      await db.batch(
        waiting.map((job) =>
          db
            .prepare(
              "UPDATE push_outbox SET state=?,error=?,next_attempt=? WHERE id=? AND state='ticket'",
            )
            .bind(
              Date.now() - Date.parse(job.ticket_created_at) >= 24 * 3600000
                ? "failed"
                : "ticket",
              "RECEIPT_UNAVAILABLE",
              stamp(15 * 60000),
              job.id,
            ),
        ),
      );
    }
  }
}
