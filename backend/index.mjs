import { registrationInput } from "./registration.mjs";
import { activityStatements, deliverPush } from "./notifications.mjs";
const MAX_BODY = 300000;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const UID = /^[a-f0-9]{64}$/;
const STATUSES = ["yes", "maybe", "no"];
class ApiError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.status = status;
  }
}
const json = (value, status = 200, extra = {}) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });
const fail = (code, status) => {
  throw new ApiError(code, status);
};
const text = (value, min, max) =>
  typeof value === "string" &&
  value.trim().length >= min &&
  value.trim().length <= max &&
  !/[\u0000-\u001f]/.test(value);
const hash = async (value) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
const nowISO = () => new Date().toISOString();
function validZone(zone) {
  if (typeof zone !== "string" || zone.length > 80) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone }).format();
    return true;
  } catch {
    return false;
  }
}
function instant(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    fail("INVALID_RANGE");
  const result = new Date(value).toISOString();
  if (result.replace(".000Z", "Z") !== value.replace(".000Z", "Z"))
    fail("INVALID_RANGE");
  return result;
}
function interval(start, end) {
  const a = instant(start),
    b = instant(end),
    length = Date.parse(b) - Date.parse(a);
  if (length <= 0 || length > 86400000) fail("INVALID_RANGE");
  return { start: a, end: b };
}
function validateSlots(input) {
  if (!Array.isArray(input) || input.length > 150) fail("INVALID_AVAILABILITY");
  const ids = new Set();
  return input.map((slot) => {
    if (
      !slot ||
      !text(slot.id, 1, 64) ||
      ids.has(slot.id) ||
      !STATUSES.includes(slot.status)
    )
      fail("INVALID_AVAILABILITY");
    ids.add(slot.id);
    return {
      id: slot.id,
      ...interval(slot.start, slot.end),
      status: slot.status,
    };
  });
}
function localDay(now, zone) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date(now))
      .map((p) => [p.type, p.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}
function validateDaysOff(input, previous) {
  if (!Array.isArray(input) || input.length > 150) fail("INVALID_DAY_OFF");
  const dates = new Set(),
    now = nowISO();
  return input.map((day) => {
    if (
      !day ||
      typeof day.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(day.date) ||
      !validZone(day.zone)
    )
      fail("INVALID_DAY_OFF");
    const stamp = new Date(day.date + "T12:00:00Z");
    if (
      !Number.isFinite(stamp.getTime()) ||
      stamp.toISOString().slice(0, 10) !== day.date ||
      dates.has(day.date)
    )
      fail("INVALID_DAY_OFF");
    dates.add(day.date);
    const old = previous.find(
      (d) => d.date === day.date && d.zone === day.zone,
    );
    if (!old && day.date < localDay(now, day.zone)) fail("INVALID_DAY_OFF");
    return {
      date: day.date,
      zone: day.zone,
      confirmedAt: old?.confirmedAt || now,
    };
  });
}
function inviteCode() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array.from(
    crypto.getRandomValues(new Uint8Array(12)),
    (byte) => alphabet[byte % alphabet.length],
  ).join("");
}
const one = (db, sql, ...values) =>
  db
    .prepare(sql)
    .bind(...values)
    .first();
const rows = async (db, sql, ...values) =>
  (
    await db
      .prepare(sql)
      .bind(...values)
      .all()
  ).results;
const run = (db, sql, ...values) =>
  db
    .prepare(sql)
    .bind(...values)
    .run();
const cursorEncode = (scope, key, id) =>
  btoa(JSON.stringify({ scope, key, id }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
function pageOptions(url, scope) {
  const rawLimit = url.searchParams.get("limit") ?? "20";
  const limit = Number(rawLimit);
  if (
    !/^\d+$/.test(rawLimit) ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50
  )
    fail("INVALID_PAGE");
  const cursor = url.searchParams.get("cursor");
  let after;
  if (cursor) {
    if (!/^[a-zA-Z0-9_-]{1,512}$/.test(cursor)) fail("INVALID_CURSOR");
    try {
      after = JSON.parse(atob(cursor.replace(/-/g, "+").replace(/_/g, "/")));
    } catch {
      fail("INVALID_CURSOR");
    }
    if (
      after.scope !== scope ||
      !text(after.key, 1, 80) ||
      !text(after.id, 1, 80)
    )
      fail("INVALID_CURSOR");
  }
  return { limit, after };
}
async function parseBody(request) {
  const contentType = request.headers.get("Content-Type")?.split(";")[0];
  if (contentType !== "application/json") fail("JSON_REQUIRED", 415);
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > MAX_BODY) fail("BODY_TOO_LARGE", 413);
  // Read with a hard bound even if a client omits Content-Length or streams its request.
  const reader = request.body?.getReader();
  if (!reader) fail("INVALID_BODY");
  const chunks = [];
  let length = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    length += result.value.length;
    if (length > MAX_BODY) {
      await reader.cancel();
      fail("BODY_TOO_LARGE", 413);
    }
    chunks.push(result.value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  let value;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    fail("INVALID_BODY");
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("INVALID_BODY");
  return value;
}
function profileShape(row, origin) {
  return {
    id: row.id,
    nickname: row.nickname,
    zone: row.zone,
    updatedAt: row.updated_at,
    ...(row.full_name !== undefined ? { fullName: row.full_name } : {}),
    ...(row.avatar_mime
      ? {
          avatarUri: `${origin}/api/avatars/${row.id}?v=${encodeURIComponent(row.updated_at)}`,
        }
      : {}),
  };
}
function groupShape(row) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    creator: row.creator,
    createdAt: row.created_at,
    memberCount: row.member_count,
  };
}
async function groupRow(db, groupId) {
  return one(
    db,
    "SELECT g.*, (SELECT COUNT(*) FROM members m WHERE m.group_id=g.id) member_count FROM groups g WHERE g.id=?",
    groupId,
  );
}
async function eventShapes(db, list) {
  if (!list.length) return [];
  const responses = await rows(
    db,
    `SELECT * FROM responses WHERE event_id IN (${list.map(() => "?").join(",")})`,
    ...list.map((event) => event.id),
  );
  return list.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    minimum: event.minimum,
    creator: event.creator,
    cancelled: !!event.cancelled,
    createdAt: event.created_at,
    responses: Object.fromEntries(
      responses
        .filter((row) => row.event_id === event.id)
        .map((row) => [row.user_id, row.value]),
    ),
  }));
}
async function eventPage(db, groupId, url) {
  const view = url.searchParams.get("view") || "upcoming";
  if (!["upcoming", "history", "all"].includes(view)) fail("INVALID_PAGE");
  const scope = `events:${groupId}:${view}`,
    { limit, after } = pageOptions(url, scope);
  const direction = view === "history" ? "DESC" : "ASC",
    comparison = view === "history" ? "<" : ">";
  const conditions = ["group_id=?"],
    values = [groupId];
  if (view !== "all") {
    conditions.push(view === "history" ? "end < ?" : "end >= ?");
    values.push(nowISO());
  }
  if (after) {
    conditions.push(
      `(start ${comparison} ? OR (start=? AND id ${comparison} ?))`,
    );
    values.push(after.key, after.key, after.id);
  }
  const result = await rows(
    db,
    `SELECT * FROM events WHERE ${conditions.join(" AND ")} ORDER BY start ${direction}, id ${direction} LIMIT ?`,
    ...values,
    limit + 1,
  );
  const included = result.slice(0, limit),
    last = included.at(-1);
  return {
    items: await eventShapes(db, included),
    nextCursor:
      result.length > limit && last
        ? cursorEncode(scope, last.start, last.id)
        : null,
  };
}
function avatarBytes(body) {
  if (
    !["image/jpeg", "image/png"].includes(body.mime) ||
    typeof body.base64 !== "string" ||
    body.base64.length < 40 ||
    body.base64.length > 262144 ||
    body.base64.length % 4 !== 0 ||
    !/^[a-zA-Z0-9+/]+={0,2}$/.test(body.base64)
  )
    fail("INVALID_IMAGE");
  let binary;
  try {
    binary = atob(body.base64);
  } catch {
    fail("INVALID_IMAGE");
  }
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  if (bytes.length > 196608) fail("IMAGE_TOO_LARGE", 413);
  let width = 0,
    height = 0;
  if (body.mime === "image/png") {
    if (
      bytes.length < 33 ||
      ![137, 80, 78, 71, 13, 10, 26, 10].every(
        (byte, index) => bytes[index] === byte,
      ) ||
      String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR"
    )
      fail("INVALID_IMAGE");
    const view = new DataView(bytes.buffer);
    width = view.getUint32(16);
    height = view.getUint32(20);
  } else {
    if (
      bytes[0] !== 255 ||
      bytes[1] !== 216 ||
      bytes.at(-2) !== 255 ||
      bytes.at(-1) !== 217
    )
      fail("INVALID_IMAGE");
    let offset = 2;
    while (offset + 3 < bytes.length) {
      if (bytes[offset++] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 218 || marker === 217) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      const length = bytes[offset] * 256 + bytes[offset + 1];
      if (length < 2 || offset + length > bytes.length) fail("INVALID_IMAGE");
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker)
      ) {
        if (length < 8) fail("INVALID_IMAGE");
        height = bytes[offset + 3] * 256 + bytes[offset + 4];
        width = bytes[offset + 5] * 256 + bytes[offset + 6];
        break;
      }
      offset += length;
    }
  }
  if (width < 1 || height < 1 || width > 1024 || height > 1024)
    fail("INVALID_IMAGE");
  return bytes;
}

export async function handleAPI(request, env, context) {
  const url = new URL(request.url),
    origin = request.headers.get("Origin");
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const cors =
    origin && (origin === url.origin || allowed.includes(origin))
      ? {
          "Access-Control-Allow-Origin": origin,
          Vary: "Origin",
          "Access-Control-Allow-Headers":
            "Authorization, Content-Type, X-Jcuki-Device",
          "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
        }
      : {};
  try {
    if (origin && !cors["Access-Control-Allow-Origin"])
      fail("ORIGIN_NOT_ALLOWED", 403);
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors });
    if (url.pathname === "/health" && request.method === "GET")
      return json({ service: "JCuki API", version: 1 }, 200, cors);
    if (!env.DB || !env.RATE_LIMITER) fail("BACKEND_NOT_CONFIGURED", 503);
    if (
      url.pathname === "/auth/register" &&
      request.method === "POST" &&
      env.REGISTER_ACCOUNT
    ) {
      const input = registrationInput(await parseBody(request));
      if (input.error) return json({ error: input.error }, 400, cors);
      const result = await env.REGISTER_ACCOUNT(input, request);
      return json(
        result.error ? { error: result.error } : { created: true },
        result.status || 201,
        cors,
      );
    }
    let uid;
    if (env.AUTHENTICATE) uid = await env.AUTHENTICATE(request);
    else {
      const token = request.headers
        .get("Authorization")
        ?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
      if (token) uid = await hash(token);
    }
    if (!uid) fail("IDENTITY_REQUIRED", 401);
    if (!(await env.RATE_LIMITER.limit({ key: "device:" + uid })).success)
      fail("RATE_LIMITED", 429);
    const db = env.DB,
      method = request.method,
      path = url.pathname.split("/").filter(Boolean);
    if (path[0] !== "api") fail("NOT_FOUND", 404);
    const body = ["POST", "PUT"].includes(method)
      ? await parseBody(request)
      : {};
    const profile = await one(
      db,
      "SELECT id,nickname,zone,avatar_mime,updated_at,full_name FROM profiles WHERE id=?",
      uid,
    );
    if (path.length === 2 && path[1] === "me" && method === "PUT") {
      if (!text(body.nickname, 2, 24)) fail("INVALID_NICKNAME");
      if (!validZone(body.zone)) fail("INVALID_ZONE");
      if (body.fullName !== undefined && !text(body.fullName, 2, 80))
        fail("INVALID_FULL_NAME");
      // A second registration limiter reduces bursts of new device identities from one network.
      if (!profile) {
        const address = request.headers.get("CF-Connecting-IP");
        if (
          address &&
          !(
            await env.RATE_LIMITER.limit({
              key: "registration:" + (await hash(address)),
            })
          ).success
        )
          fail("RATE_LIMITED", 429);
      }
      const now = nowISO();
      const memberships =
        profile &&
        (profile.nickname !== body.nickname.trim() ||
          profile.zone !== body.zone)
          ? await rows(db, "SELECT group_id FROM members WHERE user_id=?", uid)
          : [];
      const notices = (
        await Promise.all(
          memberships.map((m) =>
            activityStatements(
              db,
              m.group_id,
              uid,
              "profile_updated",
              null,
              body.nickname.trim(),
            ),
          ),
        )
      ).flat();
      await db.batch([
        db
          .prepare(
            "INSERT INTO profiles(id,nickname,zone,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET nickname=excluded.nickname,zone=excluded.zone,updated_at=excluded.updated_at",
          )
          .bind(uid, body.nickname.trim(), body.zone, now, now),
        ...(body.fullName !== undefined
          ? [
              db
                .prepare("UPDATE profiles SET full_name=? WHERE id=?")
                .bind(body.fullName.trim(), uid),
            ]
          : []),
        ...notices,
      ]);
      context?.waitUntil(deliverPush(env));
      return json(
        profileShape(
          await one(
            db,
            "SELECT id,nickname,zone,avatar_mime,updated_at,full_name FROM profiles WHERE id=?",
            uid,
          ),
          env.PUBLIC_API_URL || url.origin,
        ),
        200,
        cors,
      );
    }
    if (!profile) fail("PROFILE_REQUIRED", 401);
    if (path.length === 2 && path[1] === "me" && method === "GET")
      return json(
        profileShape(profile, env.PUBLIC_API_URL || url.origin),
        200,
        cors,
      );
    if (path.length === 3 && path[1] === "me" && path[2] === "push") {
      if (method === "DELETE") {
        await run(db, "UPDATE push_devices SET enabled=0 WHERE user_id=?", uid);
        return json({ ok: true }, 200, cors);
      }
      if (method !== "PUT") fail("NOT_FOUND", 404);
      if (
        !/^(?:ExponentPushToken|ExpoPushToken)\[[a-zA-Z0-9_-]{8,128}\]$/.test(
          body.token || "",
        ) ||
        !["id", "en"].includes(body.language) ||
        typeof body.sound !== "boolean" ||
        !validZone(body.zone)
      )
        fail("INVALID_PUSH_DEVICE");
      const existing = await one(
        db,
        "SELECT user_id FROM push_devices WHERE token=?",
        body.token,
      );
      if (existing && existing.user_id !== uid) fail("PUSH_TOKEN_IN_USE", 409);
      await run(
        db,
        "INSERT INTO push_devices(user_id,token,language,sound,enabled,zone,updated_at) VALUES(?,?,?,?,1,?,?) ON CONFLICT(user_id) DO UPDATE SET token=excluded.token,language=excluded.language,sound=excluded.sound,enabled=1,zone=excluded.zone,updated_at=excluded.updated_at",
        uid,
        body.token,
        body.language,
        body.sound ? 1 : 0,
        body.zone,
        nowISO(),
      );
      return json(
        { ok: true, deliveryEnabled: env.PUSH_ENABLED === "true" },
        200,
        cors,
      );
    }
    if (path.length === 3 && path[1] === "me" && path[2] === "avatar") {
      const memberships = await rows(
        db,
        "SELECT group_id FROM members WHERE user_id=?",
        uid,
      );
      const notices = (
        await Promise.all(
          memberships.map((m) =>
            activityStatements(db, m.group_id, uid, "profile_updated"),
          ),
        )
      ).flat();
      if (method === "PUT") {
        avatarBytes(body);
        await db.batch([
          db
            .prepare(
              "UPDATE profiles SET avatar_base64=?,avatar_mime=?,updated_at=? WHERE id=?",
            )
            .bind(body.base64, body.mime, nowISO(), uid),
          ...notices,
        ]);
      } else if (method === "DELETE")
        await db.batch([
          db
            .prepare(
              "UPDATE profiles SET avatar_base64=NULL,avatar_mime=NULL,updated_at=? WHERE id=?",
            )
            .bind(nowISO(), uid),
          ...(profile.avatar_mime ? notices : []),
        ]);
      else fail("NOT_FOUND", 404);
      context?.waitUntil(deliverPush(env));
      return json(
        profileShape(
          await one(
            db,
            "SELECT id,nickname,zone,avatar_mime,updated_at,full_name FROM profiles WHERE id=?",
            uid,
          ),
          env.PUBLIC_API_URL || url.origin,
        ),
        200,
        cors,
      );
    }
    if (
      path.length === 3 &&
      path[1] === "avatars" &&
      UID.test(path[2]) &&
      method === "GET"
    ) {
      const target = path[2];
      if (
        target !== uid &&
        !(await one(
          db,
          "SELECT 1 FROM members a JOIN members b ON a.group_id=b.group_id WHERE a.user_id=? AND b.user_id=? LIMIT 1",
          uid,
          target,
        ))
      )
        fail("NO_PERMISSION", 403);
      const avatar = await one(
        db,
        "SELECT avatar_base64,avatar_mime FROM profiles WHERE id=?",
        target,
      );
      if (!avatar?.avatar_base64) fail("NOT_FOUND", 404);
      return new Response(
        Uint8Array.from(atob(avatar.avatar_base64), (char) =>
          char.charCodeAt(0),
        ),
        {
          headers: {
            "Content-Type": avatar.avatar_mime,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            ...cors,
          },
        },
      );
    }
    if (path.length === 2 && path[1] === "groups" && method === "GET") {
      const scope = "groups:" + uid,
        { limit, after } = pageOptions(url, scope);
      const result = await rows(
        db,
        `SELECT g.*,m.joined_at,(SELECT COUNT(*) FROM members x WHERE x.group_id=g.id) member_count FROM members m JOIN groups g ON g.id=m.group_id WHERE m.user_id=? ${after ? "AND (m.joined_at<? OR (m.joined_at=? AND g.id<?))" : ""} ORDER BY m.joined_at DESC,g.id DESC LIMIT ?`,
        uid,
        ...(after ? [after.key, after.key, after.id] : []),
        limit + 1,
      );
      const included = result.slice(0, limit),
        last = included.at(-1);
      return json(
        {
          items: included.map(groupShape),
          nextCursor:
            result.length > limit && last
              ? cursorEncode(scope, last.joined_at, last.id)
              : null,
        },
        200,
        cors,
      );
    }
    if (path.length === 2 && path[1] === "groups" && method === "POST") {
      if (!text(body.name, 2, 40)) fail("INVALID_GROUP_NAME");
      const id = crypto.randomUUID(),
        code = inviteCode(),
        now = nowISO();
      await db.batch([
        db
          .prepare(
            "INSERT INTO groups(id,name,code,creator,created_at) VALUES(?,?,?,?,?)",
          )
          .bind(id, body.name.trim(), code, uid, now),
        db
          .prepare(
            "INSERT INTO members(group_id,user_id,joined_at) VALUES(?,?,?)",
          )
          .bind(id, uid, now),
      ]);
      return json(groupShape(await groupRow(db, id)), 201, cors);
    }
    if (path.length === 2 && path[1] === "join" && method === "POST") {
      const code =
        typeof body.code === "string"
          ? body.code.trim().toUpperCase().replace(/[ -]/g, "")
          : "";
      if (!/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{12}$/.test(code))
        fail("GROUP_NOT_FOUND", 404);
      const group = await one(db, "SELECT * FROM groups WHERE code=?", code);
      if (!group) fail("GROUP_NOT_FOUND", 404);
      const joined = await one(
        db,
        "SELECT 1 FROM members WHERE group_id=? AND user_id=?",
        group.id,
        uid,
      );
      if (!joined)
        await db.batch([
          db
            .prepare(
              "INSERT INTO members(group_id,user_id,joined_at) VALUES(?,?,?)",
            )
            .bind(group.id, uid, nowISO()),
          ...(await activityStatements(db, group.id, uid, "member_joined")),
        ]);
      context?.waitUntil(deliverPush(env));
      return json(groupShape(await groupRow(db, group.id)), 200, cors);
    }
    if (path[1] !== "groups" || !UUID.test(path[2] || ""))
      fail("NOT_FOUND", 404);
    const groupId = path[2],
      member = await one(
        db,
        "SELECT * FROM members WHERE group_id=? AND user_id=?",
        groupId,
        uid,
      );
    if (!member) fail("NO_PERMISSION", 403);
    if (path.length === 3 && method === "GET") {
      const members = await rows(
        db,
        "SELECT p.id,p.nickname,p.zone,p.avatar_mime,p.updated_at,m.slots,m.days_off,m.joined_at FROM members m JOIN profiles p ON p.id=m.user_id WHERE m.group_id=? ORDER BY m.joined_at,p.id",
        groupId,
      );
      const page = await eventPage(
        db,
        groupId,
        new URL(url.origin + "/?limit=20&view=upcoming"),
      );
      return json(
        {
          ...groupShape(await groupRow(db, groupId)),
          members: members.map((row) => ({
            ...profileShape(row, env.PUBLIC_API_URL || url.origin),
            slots: JSON.parse(row.slots),
            daysOff: JSON.parse(row.days_off),
            joinedAt: row.joined_at,
          })),
          events: page.items,
          eventsNextCursor: page.nextCursor,
        },
        200,
        cors,
      );
    }
    if (path.length === 4 && path[3] === "activity" && method === "GET") {
      const scope = "activity:" + groupId,
        { limit, after } = pageOptions(url, scope);
      const result = await rows(
        db,
        `SELECT * FROM activities WHERE group_id=? ${after ? "AND (created_at<? OR (created_at=? AND id<?))" : ""} ORDER BY created_at DESC,id DESC LIMIT ?`,
        groupId,
        ...(after ? [after.key, after.key, after.id] : []),
        limit + 1,
      );
      const included = result.slice(0, limit),
        last = included.at(-1);
      return json(
        {
          items: included.map((a) => ({
            id: a.id,
            groupId: a.group_id,
            actorId: a.actor_id,
            actorName: a.actor_name,
            groupName: a.group_name,
            kind: a.kind,
            eventId: a.event_id,
            createdAt: a.created_at,
          })),
          nextCursor:
            result.length > limit && last
              ? cursorEncode(scope, last.created_at, last.id)
              : null,
        },
        200,
        cors,
      );
    }
    if (path.length === 4 && path[3] === "availability" && method === "PUT") {
      const slots = validateSlots(body.slots);
      await db.batch([
        db
          .prepare("UPDATE members SET slots=? WHERE group_id=? AND user_id=?")
          .bind(JSON.stringify(slots), groupId, uid),
        ...(JSON.stringify(slots) !== member.slots
          ? await activityStatements(db, groupId, uid, "schedule_updated")
          : []),
      ]);
      context?.waitUntil(deliverPush(env));
      return json({ ok: true }, 200, cors);
    }
    if (path.length === 4 && path[3] === "days-off" && method === "PUT") {
      const daysOff = validateDaysOff(
        body.daysOff,
        JSON.parse(member.days_off),
      );
      const slots =
        body.slots === undefined
          ? JSON.parse(member.slots)
          : validateSlots(body.slots);
      await db.batch([
        db
          .prepare(
            "UPDATE members SET days_off=?,slots=? WHERE group_id=? AND user_id=?",
          )
          .bind(JSON.stringify(daysOff), JSON.stringify(slots), groupId, uid),
        ...(JSON.stringify(daysOff) !== member.days_off ||
        JSON.stringify(slots) !== member.slots
          ? await activityStatements(db, groupId, uid, "schedule_updated")
          : []),
      ]);
      context?.waitUntil(deliverPush(env));
      return json({ daysOff }, 200, cors);
    }
    if (path.length === 4 && path[3] === "events" && method === "GET")
      return json(await eventPage(db, groupId, url), 200, cors);
    if (path.length === 4 && path[3] === "events" && method === "POST") {
      if (!text(body.title, 1, 60)) fail("INVALID_EVENT_TITLE");
      const range = interval(body.start, body.end);
      if (Date.parse(range.start) <= Date.now()) fail("EVENT_IN_PAST");
      const count = (
        await one(
          db,
          "SELECT COUNT(*) count FROM members WHERE group_id=?",
          groupId,
        )
      ).count;
      if (
        !Number.isInteger(body.minimum) ||
        body.minimum < 1 ||
        body.minimum > count
      )
        fail("INVALID_MINIMUM");
      const id = crypto.randomUUID(),
        now = nowISO();
      await db.batch([
        db
          .prepare(
            "INSERT INTO events(id,group_id,title,start,end,minimum,creator,created_at) VALUES(?,?,?,?,?,?,?,?)",
          )
          .bind(
            id,
            groupId,
            body.title.trim(),
            range.start,
            range.end,
            body.minimum,
            uid,
            now,
          ),
        db
          .prepare(
            "INSERT INTO responses(event_id,user_id,value) VALUES(?,?,?)",
          )
          .bind(id, uid, "yes"),
        ...(await activityStatements(db, groupId, uid, "event_created", id)),
      ]);
      context?.waitUntil(deliverPush(env));
      return json(
        (
          await eventShapes(db, [
            await one(db, "SELECT * FROM events WHERE id=?", id),
          ])
        )[0],
        201,
        cors,
      );
    }
    if (path[3] === "events" && UUID.test(path[4] || "")) {
      const eventId = path[4],
        event = await one(
          db,
          "SELECT * FROM events WHERE id=? AND group_id=?",
          eventId,
          groupId,
        );
      if (!event) fail("NOT_FOUND", 404);
      if (event.cancelled || Date.parse(event.end) < Date.now())
        fail("EVENT_CLOSED", 409);
      if (path.length === 6 && path[5] === "response" && method === "PUT") {
        if (!STATUSES.includes(body.value)) fail("INVALID_RESPONSE");
        const prior = await one(
          db,
          "SELECT value FROM responses WHERE event_id=? AND user_id=?",
          eventId,
          uid,
        );
        await db.batch([
          db
            .prepare(
              "INSERT INTO responses(event_id,user_id,value) VALUES(?,?,?) ON CONFLICT(event_id,user_id) DO UPDATE SET value=excluded.value",
            )
            .bind(eventId, uid, body.value),
          ...(prior?.value !== body.value
            ? await activityStatements(
                db,
                groupId,
                uid,
                "response_updated",
                eventId,
              )
            : []),
        ]);
        context?.waitUntil(deliverPush(env));
        return json({ ok: true }, 200, cors);
      }
      if (path.length === 5 && method === "DELETE") {
        if (event.creator !== uid) fail("NO_PERMISSION", 403);
        await db.batch([
          db.prepare("UPDATE events SET cancelled=1 WHERE id=?").bind(eventId),
          ...(await activityStatements(
            db,
            groupId,
            uid,
            "event_cancelled",
            eventId,
          )),
        ]);
        context?.waitUntil(deliverPush(env));
        return json({ ok: true }, 200, cors);
      }
    }
    fail("NOT_FOUND", 404);
  } catch (error) {
    const known = error instanceof ApiError;
    const constraint = /GROUP_FULL|GROUP_LIMIT/.exec(error?.message || "")?.[0];
    return json(
      { error: known ? error.message : constraint || "SERVER_ERROR" },
      known ? error.status : constraint ? 409 : 500,
      cors,
    );
  }
}
export default {
  fetch: handleAPI,
  scheduled: (_event, env, context) => context.waitUntil(deliverPush(env)),
};
