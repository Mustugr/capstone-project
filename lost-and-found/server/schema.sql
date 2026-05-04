-- Lost & Found Portal — Database Schema

CREATE TABLE IF NOT EXISTS profiles (
  id         SERIAL PRIMARY KEY,
  full_name  VARCHAR(100) NOT NULL,
  email      VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role       VARCHAR(10) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMP DEFAULT NOW()
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
  id              SERIAL PRIMARY KEY,
  student_id      INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  item_name       VARCHAR(100) NOT NULL,
  category        VARCHAR(50),
  location_lost   VARCHAR(150),
  date_lost       DATE,
  description     TEXT,
  image_url       TEXT,
  status          VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Matched', 'Resolved')),
  matched_item_id INTEGER REFERENCES found_items(id),
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  report_id   INTEGER REFERENCES lost_reports(id) ON DELETE CASCADE,
  sender_id   INTEGER REFERENCES profiles(id),
  sender_role VARCHAR(10) CHECK (sender_role IN ('student', 'admin')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);
