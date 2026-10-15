const DEVICE = /^[a-f0-9]{64}$/;
const JWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
export async function identityHash(value) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (n) => n.toString(16).padStart(2, "0"),
  ).join("");
}
const clean = (value, fallback, max) =>
  typeof value === "string" &&
  value.trim().length >= 2 &&
  value.trim().length <= max &&
  !/[\u0000-\u001f]/.test(value)
    ? value.trim()
    : fallback;
/** Auth metadata supplies display text only. The verified Auth user ID owns the account. */
export function accountAuthenticator({ db, verifyUser }) {
  return async (request) => {
    const token = request.headers
      .get("Authorization")
      ?.match(/^Bearer ([^\s]+)$/)?.[1];
    if (!token) return null;
    if (DEVICE.test(token)) {
      const id = await identityHash(token);
      const row = await db
        .prepare("SELECT auth_user_id FROM profiles WHERE id=?")
        .bind(id)
        .first();
      return row?.auth_user_id ? null : id;
    }
    if (token.length > 8192 || !JWT.test(token)) return null;
    const user = await verifyUser(token);
    if (
      !user?.id ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
        user.id,
      ) ||
      !user.email ||
      !user.email_confirmed_at ||
      user.is_anonymous
    )
      return null;
    const legacy = request.headers.get("X-Jcuki-Device");
    const legacyId = DEVICE.test(legacy || "")
      ? await identityHash(legacy)
      : null;
    const resolve = async (connection) => {
      const known = await connection
        .prepare("SELECT id FROM profiles WHERE auth_user_id=?")
        .bind(user.id)
        .first();
      if (known) return known.id;
      const fullName = clean(user.user_metadata?.full_name, "Jcuki friend", 80);
      if (legacyId) {
        const candidate = await connection
          .prepare("SELECT id,auth_user_id FROM profiles WHERE id=?")
          .bind(legacyId)
          .first();
        if (candidate && !candidate.auth_user_id) {
          const claimed = await connection
            .prepare(
              "UPDATE profiles SET auth_user_id=?,full_name=? WHERE id=? AND auth_user_id IS NULL RETURNING id",
            )
            .bind(user.id, fullName, legacyId)
            .first();
          if (claimed) return claimed.id;
        }
      }
      const id = await identityHash("account:" + user.id),
        now = new Date().toISOString();
      const nickname = clean(user.user_metadata?.nickname, "Friend", 24);
      let zone = user.user_metadata?.zone || "UTC";
      try {
        new Intl.DateTimeFormat("en", { timeZone: zone }).format();
      } catch {
        zone = "UTC";
      }
      await connection
        .prepare(
          "INSERT INTO profiles(id,nickname,zone,created_at,updated_at,auth_user_id,full_name) VALUES(?,?,?,?,?,?,?)",
        )
        .bind(id, nickname, zone, now, now, user.id, fullName)
        .run();
      return id;
    };
    return db.withAccountLock
      ? db.withAccountLock(user.id, resolve)
      : resolve(db);
  };
}
