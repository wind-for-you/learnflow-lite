-- Rate limiting counters
CREATE TABLE IF NOT EXISTS rate_limit_counters (
  key TEXT NOT NULL,
  date TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (key, date)
);

CREATE INDEX idx_rate_limit_date ON rate_limit_counters(date);

-- Waitlist and feedback
CREATE TABLE IF NOT EXISTS waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT,
  feedback TEXT,
  device_id TEXT NOT NULL,
  page TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_waitlist_created_at ON waitlist(created_at DESC);
CREATE INDEX idx_waitlist_email ON waitlist(email) WHERE email IS NOT NULL;
CREATE INDEX idx_waitlist_device_id ON waitlist(device_id);
