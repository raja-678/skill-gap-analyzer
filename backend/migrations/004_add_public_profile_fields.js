exports.up = (pgm) => {
  pgm.sql(`
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS is_public_profile BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_headline VARCHAR(200);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
ALTER TABLE IF EXISTS users
  DROP COLUMN IF EXISTS is_public_profile,
  DROP COLUMN IF EXISTS profile_headline;
  `);
};
