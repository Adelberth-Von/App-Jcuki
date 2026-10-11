PRAGMA foreign_keys = ON;
CREATE TABLE profiles (
  id TEXT PRIMARY KEY, nickname TEXT NOT NULL, zone TEXT NOT NULL,
  avatar_base64 TEXT, avatar_mime TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE groups (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT UNIQUE NOT NULL,
  creator TEXT NOT NULL REFERENCES profiles(id), created_at TEXT NOT NULL
) STRICT;
CREATE TABLE members (
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TEXT NOT NULL, slots TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (group_id, user_id)
) STRICT;
CREATE INDEX member_users ON members(user_id, joined_at, group_id);
CREATE TABLE events (
  id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL, start TEXT NOT NULL, end TEXT NOT NULL,
  minimum INTEGER NOT NULL CHECK(minimum >= 1 AND minimum <= 50),
  creator TEXT NOT NULL REFERENCES profiles(id), cancelled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
) STRICT;
CREATE INDEX group_events ON events(group_id, start, id);
CREATE TABLE responses (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  value TEXT NOT NULL CHECK(value IN ('yes','maybe','no')),
  PRIMARY KEY(event_id, user_id)
) STRICT;
-- Constraints run inside the same SQLite write transaction, including concurrent joins.
CREATE TRIGGER group_member_limit BEFORE INSERT ON members
WHEN (SELECT COUNT(*) FROM members WHERE group_id = NEW.group_id) >= 50
BEGIN SELECT RAISE(ABORT, 'GROUP_FULL'); END;
CREATE TRIGGER user_group_limit BEFORE INSERT ON members
WHEN (SELECT COUNT(*) FROM members WHERE user_id = NEW.user_id) >= 50
BEGIN SELECT RAISE(ABORT, 'GROUP_LIMIT'); END;
