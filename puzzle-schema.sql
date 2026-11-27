-- Team Connect Puzzle Challenge — D1 schema (run once, safe to re-run)
CREATE TABLE IF NOT EXISTS puzzle_clients (
  code          TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  test          INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'waiting',   -- waiting | running | paused | ended
  duration_ms   INTEGER NOT NULL,
  elapsed_base  INTEGER NOT NULL DEFAULT 0,        -- clock time banked before running_since
  running_since INTEGER,
  started_at    INTEGER,
  ended_at      INTEGER,
  ended_by      TEXT                               -- timer | facilitator
);

CREATE TABLE IF NOT EXISTS puzzle_teams (
  id             TEXT PRIMARY KEY,
  client_code    TEXT NOT NULL,
  name           TEXT NOT NULL,
  name_key       TEXT NOT NULL,
  token          TEXT UNIQUE NOT NULL,
  joined_at      INTEGER NOT NULL,
  wrong_pw       INTEGER NOT NULL DEFAULT 0,
  wrong_ans      INTEGER NOT NULL DEFAULT 0,
  finish_elapsed INTEGER,
  finish_left    INTEGER,
  last_seen      INTEGER NOT NULL DEFAULT 0,
  UNIQUE (client_code, name_key)
);
CREATE INDEX IF NOT EXISTS idx_puzzle_teams_client ON puzzle_teams(client_code);

-- kind: 'file' (unlocked) or 'q' (answered correctly)
CREATE TABLE IF NOT EXISTS puzzle_progress (
  team_id TEXT NOT NULL,
  kind    TEXT NOT NULL,
  key     TEXT NOT NULL,
  at_ms   INTEGER NOT NULL,
  shown   TEXT,
  PRIMARY KEY (team_id, kind, key)
);

CREATE TABLE IF NOT EXISTS puzzle_events (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id TEXT NOT NULL,
  t       INTEGER NOT NULL,
  at      INTEGER NOT NULL,
  type    TEXT NOT NULL,
  text    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_puzzle_events_team ON puzzle_events(team_id);

CREATE TABLE IF NOT EXISTS puzzle_login_fail (
  ip TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_puzzle_login_fail ON puzzle_login_fail(ip, at);
