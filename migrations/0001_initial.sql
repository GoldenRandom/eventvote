-- Enable foreign key constraints (required for D1)
PRAGMA foreign_keys = ON;

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, closed
  created_at INTEGER NOT NULL,
  qr_code TEXT NOT NULL UNIQUE
);

-- Images table
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  uploaded_at INTEGER NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  image_id TEXT NOT NULL,
  voter_id TEXT NOT NULL,
  stars INTEGER NOT NULL CHECK(stars >= 1 AND stars <= 5),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
  UNIQUE(event_id, image_id, voter_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_images_event_id ON images(event_id);
CREATE INDEX IF NOT EXISTS idx_votes_event_id ON votes(event_id);
CREATE INDEX IF NOT EXISTS idx_votes_image_id ON votes(image_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_id ON votes(voter_id);

