exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS readiness_snapshots (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      job_role_id INTEGER NOT NULL,
      match_percentage DECIMAL(5,2) NOT NULL,
      skills_possessed INTEGER NOT NULL,
      skills_missing INTEGER NOT NULL,
      snapshot_date DATE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_role_id) REFERENCES job_roles(id) ON DELETE CASCADE,
      UNIQUE (user_id, job_role_id, snapshot_date)
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS readiness_snapshots;`);
};
