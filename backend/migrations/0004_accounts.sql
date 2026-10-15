-- The Cloudflare alternative and SQLite integration harness share the account fields.
-- JWT verification must be supplied by the hosting adapter, never by the client.
ALTER TABLE profiles ADD COLUMN auth_user_id TEXT;
ALTER TABLE profiles ADD COLUMN full_name TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX profiles_auth_user ON profiles(auth_user_id);
