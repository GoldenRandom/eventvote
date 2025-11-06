-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at INTEGER NOT NULL,
  qr_code TEXT NOT NULL UNIQUE,
  current_image_index INTEGER NOT NULL DEFAULT 0
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

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  voter_id TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  UNIQUE(event_id, voter_id)
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_images_event_id ON images(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_votes_event_id ON votes(event_id);
CREATE INDEX IF NOT EXISTS idx_votes_image_id ON votes(image_id);

