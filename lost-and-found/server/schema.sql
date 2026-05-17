-- Lost & Found Portal — Database Schema

CREATE TABLE IF NOT EXISTS profiles (
  id                SERIAL PRIMARY KEY,
  full_name         VARCHAR(100) NOT NULL,
  email             VARCHAR(100) UNIQUE NOT NULL,
  password_hash     TEXT NOT NULL,
  role              VARCHAR(10) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  chat_locked_until TIMESTAMP,
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS found_items (
  id               SERIAL PRIMARY KEY,
  item_name        VARCHAR(100) NOT NULL,
  category         VARCHAR(50),
  location_found   VARCHAR(150),
  date_found       DATE,
  description      TEXT,
  image_url        TEXT,
  storage_location VARCHAR(100),
  status           VARCHAR(20) DEFAULT 'Unclaimed' CHECK (status IN ('Unclaimed', 'Matched', 'Returned')),
  added_by         INTEGER REFERENCES profiles(id),
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lost_reports (
  id                    SERIAL PRIMARY KEY,
  ticket_number         VARCHAR(20) UNIQUE NOT NULL,
  student_id            INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  item_name             VARCHAR(100) NOT NULL,
  category              VARCHAR(50),
  location_lost         VARCHAR(150),
  date_lost             DATE,
  description           TEXT,
  image_url             TEXT,
  status                VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Matched', 'Resolved')),
  matched_item_id       INTEGER REFERENCES found_items(id),
  viewed_by_admin       BOOLEAN NOT NULL DEFAULT false,
  student_last_read_at  TIMESTAMP,
  admin_last_read_at    TIMESTAMP,
  created_at            TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  report_id   INTEGER REFERENCES lost_reports(id) ON DELETE CASCADE,
  sender_id   INTEGER REFERENCES profiles(id),
  sender_role VARCHAR(10) CHECK (sender_role IN ('student', 'admin')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Audit log for every Hawk AI chat turn and tool call.
-- Admins use this to spot probing patterns.
CREATE TABLE IF NOT EXISTS chat_logs (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  kind         VARCHAR(20) NOT NULL CHECK (kind IN ('user_message', 'assistant_message', 'tool_call', 'tool_result', 'blocked')),
  content      TEXT,
  tool_name    VARCHAR(50),
  tool_input   JSONB,
  tool_output  JSONB,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_logs_user_created ON chat_logs(user_id, created_at DESC);

-- Structured ownership claims gathered by Hawk AI on behalf of a student.
-- The AI does NOT validate these; it only collects and stores. Admins review.
CREATE TABLE IF NOT EXISTS claims (
  id                    SERIAL PRIMARY KEY,
  report_id             INTEGER REFERENCES lost_reports(id) ON DELETE CASCADE,
  student_id            INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  color                 VARCHAR(100),
  brand                 VARCHAR(100),
  contents              TEXT,
  distinguishing_marks  TEXT,
  approximate_location  VARCHAR(150),
  approximate_date      VARCHAR(100),
  status                VARCHAR(20) DEFAULT 'Pending Review' CHECK (status IN ('Pending Review', 'Approved', 'Rejected')),
  rejected_reason       TEXT,
  is_fraudulent         BOOLEAN DEFAULT FALSE,
  reviewed_by           INTEGER REFERENCES profiles(id),
  reviewed_at           TIMESTAMP,
  created_at            TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_report   ON claims(report_id);
CREATE INDEX IF NOT EXISTS idx_claims_student  ON claims(student_id);
CREATE INDEX IF NOT EXISTS idx_claims_status   ON claims(status);
