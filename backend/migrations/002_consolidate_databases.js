exports.up = (pgm) => {
  pgm.sql(`
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE IF EXISTS resumes
  ADD COLUMN IF NOT EXISTS parsed_data JSONB,
  ADD COLUMN IF NOT EXISTS file_path TEXT;

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL,
  role VARCHAR(20),
  content TEXT,
  provider VARCHAR(50),
  model VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
DROP INDEX IF EXISTS idx_chat_messages_created_at;
DROP INDEX IF EXISTS idx_chat_messages_user_id;
DROP TABLE IF EXISTS chat_messages;

ALTER TABLE IF EXISTS resumes
  DROP COLUMN IF EXISTS parsed_data,
  DROP COLUMN IF EXISTS file_path;
  `);
};
