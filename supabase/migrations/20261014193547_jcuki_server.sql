CREATE SCHEMA IF NOT EXISTS jcuki;
REVOKE ALL ON SCHEMA jcuki FROM PUBLIC, anon, authenticated;
SET search_path = jcuki, public;
CREATE TABLE profiles (
  id TEXT PRIMARY KEY, nickname TEXT NOT NULL, zone TEXT NOT NULL,
  avatar_base64 TEXT, avatar_mime TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE groups (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT UNIQUE NOT NULL,
  creator TEXT NOT NULL REFERENCES profiles(id), created_at TEXT NOT NULL
);
CREATE TABLE members (
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TEXT NOT NULL, slots TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX member_users ON members(user_id, joined_at, group_id);
CREATE TABLE events (
  id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL, start TEXT NOT NULL, "end" TEXT NOT NULL,
  minimum INTEGER NOT NULL CHECK(minimum >= 1 AND minimum <= 50),
  creator TEXT NOT NULL REFERENCES profiles(id), cancelled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX group_events ON events(group_id, start, id);
CREATE TABLE responses (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  value TEXT NOT NULL CHECK(value IN ('yes','maybe','no')),
  PRIMARY KEY(event_id, user_id)
);

-- Confirmed local calendar dates are independent of optional playing hours.
ALTER TABLE members ADD COLUMN days_off TEXT NOT NULL DEFAULT '[]';

CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES profiles(id),
  kind TEXT NOT NULL,
  event_id TEXT,
  actor_name TEXT NOT NULL,
  group_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX activities_group_date ON activities(group_id, created_at DESC, id DESC);
CREATE TABLE push_devices (
  user_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL CHECK(language IN ('id','en')),
  sound INTEGER NOT NULL DEFAULT 1,
  enabled INTEGER NOT NULL DEFAULT 1,
  zone TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE push_outbox (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  payload TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt TEXT NOT NULL,
  ticket_id TEXT,
  ticket_created_at TEXT,
  error TEXT,
  UNIQUE(activity_id, user_id)
);
CREATE INDEX push_outbox_delivery ON push_outbox(state, next_attempt);

CREATE TABLE rate_limits (key TEXT PRIMARY KEY, bucket BIGINT NOT NULL, hits INTEGER NOT NULL);
CREATE INDEX rate_limits_bucket ON rate_limits(bucket);
CREATE INDEX groups_creator ON groups(creator);
CREATE INDEX events_creator ON events(creator);
CREATE INDEX responses_user ON responses(user_id);
CREATE INDEX activities_actor ON activities(actor_id);
CREATE INDEX push_outbox_user ON push_outbox(user_id);
CREATE FUNCTION enforce_member_limits() RETURNS trigger LANGUAGE plpgsql SET search_path = jcuki, pg_temp AS $$
BEGIN
  -- Serialize capacity checks on the group and user, including concurrent joins.
  PERFORM 1 FROM groups WHERE id = NEW.group_id FOR UPDATE;
  PERFORM 1 FROM profiles WHERE id = NEW.user_id FOR UPDATE;
  IF (SELECT count(*) FROM members WHERE group_id=NEW.group_id) >= 50 THEN
    RAISE EXCEPTION 'GROUP_FULL';
  END IF;
  IF (SELECT count(*) FROM members WHERE user_id=NEW.user_id) >= 50 THEN
    RAISE EXCEPTION 'GROUP_LIMIT';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER member_limits BEFORE INSERT ON members FOR EACH ROW EXECUTE FUNCTION enforce_member_limits();
REVOKE ALL ON ALL TABLES IN SCHEMA jcuki FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA jcuki FROM PUBLIC, anon, authenticated;
ALTER TABLE jcuki.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jcuki.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE jcuki.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE jcuki.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE jcuki.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE jcuki.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE jcuki.push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE jcuki.push_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE jcuki.rate_limits ENABLE ROW LEVEL SECURITY;
RESET search_path;
