const pool = require('../src/config/database');

const apply = async () => {
  try {
    console.log('Applying GitHub-related DB fields...');
    const sql = `
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS github_id VARCHAR(100) UNIQUE,
  ADD COLUMN IF NOT EXISTS github_username VARCHAR(255),
  ADD COLUMN IF NOT EXISTS github_connected_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS user_skills
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
    `;
    await pool.query(sql);
    console.log('GitHub DB fields applied successfully');
    process.exit(0);
  } catch (err) {
    console.error('Applying GitHub fields failed:', err);
    process.exit(1);
  }
};

apply();
