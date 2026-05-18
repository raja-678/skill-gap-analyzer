const timestampTables = [
  'users',
  'companies',
  'resumes',
  'skills',
  'user_skills',
  'job_roles',
  'job_role_requirements',
  'skill_gap_analysis',
  'learning_paths',
  'learning_resources',
  'chat_messages',
  'job_description_analysis',
  'user_learning_history',
  'job_postings',
  'job_applications',
  'bulk_resume_uploads',
  'analytics',
  'audit_log',
  'user_sessions',
  'skill_relations',
  'user_target_roles'
];

exports.up = (pgm) => {
  pgm.sql(`
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS skill_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  target_skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  relation_type VARCHAR(50) NOT NULL,
  strength DECIMAL(4,3) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  UNIQUE (source_skill_id, target_skill_id, relation_type)
);

CREATE TABLE IF NOT EXISTS user_target_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_role_id INTEGER NOT NULL REFERENCES job_roles(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1,
  target_date DATE,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  UNIQUE (user_id, job_role_id)
);

ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS companies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS resumes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS skills ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE IF EXISTS skills ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS user_skills ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS job_roles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS job_role_requirements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE IF EXISTS job_role_requirements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS skill_gap_analysis ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS learning_paths ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS learning_resources ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE IF EXISTS learning_resources ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS job_description_analysis ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS user_learning_history ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS job_postings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS job_applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE IF EXISTS job_applications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS bulk_resume_uploads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS analytics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE IF EXISTS analytics ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_skill_relations_source_skill_id ON skill_relations(source_skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_relations_target_skill_id ON skill_relations(target_skill_id);
CREATE INDEX IF NOT EXISTS idx_user_target_roles_user_id ON user_target_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_target_roles_job_role_id ON user_target_roles(job_role_id);
  `);

  timestampTables.forEach((tableName) => {
    pgm.sql(`
DROP TRIGGER IF EXISTS trg_${tableName}_updated_at ON ${tableName};
CREATE TRIGGER trg_${tableName}_updated_at
BEFORE UPDATE ON ${tableName}
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
    `);
  });
};

exports.down = (pgm) => {
  timestampTables.forEach((tableName) => {
    pgm.sql(`DROP TRIGGER IF EXISTS trg_${tableName}_updated_at ON ${tableName};`);
  });

  pgm.sql(`
DROP FUNCTION IF EXISTS set_updated_at();

DROP INDEX IF EXISTS idx_user_target_roles_job_role_id;
DROP INDEX IF EXISTS idx_user_target_roles_user_id;
DROP INDEX IF EXISTS idx_skill_relations_target_skill_id;
DROP INDEX IF EXISTS idx_skill_relations_source_skill_id;
DROP INDEX IF EXISTS idx_user_sessions_expires_at;
DROP INDEX IF EXISTS idx_user_sessions_user_id;
DROP INDEX IF EXISTS idx_audit_log_created_at;
DROP INDEX IF EXISTS idx_audit_log_action;
DROP INDEX IF EXISTS idx_audit_log_user_id;

DROP TABLE IF EXISTS user_target_roles;
DROP TABLE IF EXISTS skill_relations;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS audit_log;

ALTER TABLE IF EXISTS analytics DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE IF EXISTS analytics DROP COLUMN IF EXISTS updated_at;
ALTER TABLE IF EXISTS bulk_resume_uploads DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE IF EXISTS job_applications DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE IF EXISTS job_applications DROP COLUMN IF EXISTS updated_at;
ALTER TABLE IF EXISTS job_postings DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE IF EXISTS user_learning_history DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE IF EXISTS job_description_analysis DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE IF EXISTS chat_messages DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE IF EXISTS chat_messages DROP COLUMN IF EXISTS updated_at;
ALTER TABLE IF EXISTS learning_resources DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE IF EXISTS learning_resources DROP COLUMN IF EXISTS updated_at;
ALTER TABLE IF EXISTS learning_paths DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE IF EXISTS skill_gap_analysis DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE IF EXISTS job_role_requirements DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE IF EXISTS job_role_requirements DROP COLUMN IF EXISTS updated_at;
ALTER TABLE IF EXISTS job_roles DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE IF EXISTS user_skills DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE IF EXISTS skills DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE IF EXISTS skills DROP COLUMN IF EXISTS updated_at;
ALTER TABLE IF EXISTS resumes DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE IF EXISTS companies DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS deleted_at;
  `);
};
