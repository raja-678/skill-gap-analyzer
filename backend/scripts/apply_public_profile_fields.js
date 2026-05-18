const pool = require('../src/config/database');

const apply = async () => {
  try {
    console.log('Applying public profile fields migration...');
    const sql = `ALTER TABLE IF EXISTS users
      ADD COLUMN IF NOT EXISTS is_public_profile BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS profile_headline VARCHAR(200);`;
    await pool.query(sql);
    console.log('Migration applied successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

apply();
