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
