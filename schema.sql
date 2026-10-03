-- Team Connect DISC — D1 schema
CREATE TABLE IF NOT EXISTS companies (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS people (
  id         TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name       TEXT,                 -- null for a shared company link
  token      TEXT UNIQUE NOT NULL,
  mode       TEXT NOT NULL,        -- 'individual' | 'company'
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_people_company ON people(company_id);
CREATE INDEX IF NOT EXISTS idx_people_token   ON people(token);

CREATE TABLE IF NOT EXISTS assessments (
  id              TEXT PRIMARY KEY,
  person_id       TEXT,
  company_id      TEXT NOT NULL,
  token           TEXT NOT NULL,
  respondent_name TEXT,
  setting         TEXT,
  submitted_at    TEXT NOT NULL,
  m_d INTEGER, m_i INTEGER, m_s INTEGER, m_c INTEGER, m_x INTEGER,
  l_d INTEGER, l_i INTEGER, l_s INTEGER, l_c INTEGER, l_x INTEGER,
  answers         TEXT
);
CREATE INDEX IF NOT EXISTS idx_assess_company ON assessments(company_id);
CREATE INDEX IF NOT EXISTS idx_assess_token   ON assessments(token);
