CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(255) UNIQUE,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  user_type VARCHAR(50) DEFAULT 'candidate',
  company_id INTEGER,
  bio TEXT,
  profile_picture_url VARCHAR(500),
  target_role_id INTEGER,
  target_role_set_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (target_role_id) REFERENCES job_roles(id) ON DELETE SET NULL
);

-- Companies table (for recruiters)
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(255),
  size VARCHAR(50),
  website VARCHAR(500),
  logo_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Resumes table
CREATE TABLE IF NOT EXISTS resumes (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_path TEXT,
  file_size INTEGER,
  extracted_text TEXT,
  parsed_data JSONB,
  is_primary BOOLEAN DEFAULT FALSE,
  upload_status VARCHAR(50) DEFAULT 'processing',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  name VARCHAR(255) UNIQUE NOT NULL,
  category VARCHAR(100),
  description TEXT,
  industry_demand DECIMAL(5,2),
  average_salary_impact INTEGER,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- User skills (skills possessed by users)
CREATE TABLE IF NOT EXISTS user_skills (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  skill_id INTEGER NOT NULL,
  proficiency_level INTEGER DEFAULT 1,
  years_of_experience DECIMAL(4,2),
  endorsement_count INTEGER DEFAULT 0,
  last_used_date DATE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  UNIQUE (user_id, skill_id)
);

-- Job roles table
CREATE TABLE IF NOT EXISTS job_roles (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  seniority_level VARCHAR(50),
  avg_salary INTEGER,
  market_demand DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Job role requirements (skills required for a role)
CREATE TABLE IF NOT EXISTS job_role_requirements (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  job_role_id INTEGER NOT NULL,
  skill_id INTEGER NOT NULL,
  proficiency_level INTEGER DEFAULT 5,
  importance_level VARCHAR(50) DEFAULT 'required',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_role_id) REFERENCES job_roles(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  UNIQUE (job_role_id, skill_id)
);

-- Skill gap analysis results
CREATE TABLE IF NOT EXISTS skill_gap_analysis (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  job_role_id INTEGER NOT NULL,
  resume_id INTEGER,
  match_percentage DECIMAL(5,2),
  skills_possessed INTEGER,
  skills_missing INTEGER,
  skills_strong INTEGER,
  estimated_learning_time_days INTEGER,
  analysis_data JSON,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_role_id) REFERENCES job_roles(id) ON DELETE CASCADE,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
);

-- Readiness snapshots for progress tracking
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

-- Learning paths / recommendations
CREATE TABLE IF NOT EXISTS learning_paths (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  job_role_id INTEGER NOT NULL,
  target_proficiency INTEGER,
  estimated_weeks INTEGER,
  status VARCHAR(50) DEFAULT 'not_started',
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_role_id) REFERENCES job_roles(id) ON DELETE CASCADE
);

-- Learning resources
CREATE TABLE IF NOT EXISTS learning_resources (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  skill_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  url VARCHAR(500),
  resource_type VARCHAR(100),
  provider VARCHAR(255),
  difficulty_level VARCHAR(50),
  duration_hours DECIMAL(6,2),
  cost DECIMAL(8,2),
  rating DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- Chat messages
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

-- Job description analysis
CREATE TABLE IF NOT EXISTS job_description_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL,
  job_description TEXT,
  extracted_skills JSONB,
  matched_skills JSONB,
  missing_skills JSONB,
  match_percentage DECIMAL(5,2),
  ats_score DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Skill demand signals (tracks skill mentions in job descriptions)
CREATE TABLE IF NOT EXISTS skill_demand_signals (
  id SERIAL PRIMARY KEY,
  skill_id INTEGER NOT NULL,
  signal_date DATE DEFAULT CURRENT_DATE,
  occurrence_count INTEGER DEFAULT 1,
  job_role_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  FOREIGN KEY (job_role_id) REFERENCES job_roles(id) ON DELETE SET NULL,
  UNIQUE (skill_id, signal_date, job_role_id)
);

-- User learning history
CREATE TABLE IF NOT EXISTS user_learning_history (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  resource_id INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'not_started',
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resource_id) REFERENCES learning_resources(id) ON DELETE CASCADE
);

-- Job postings (for recruiters to post)
CREATE TABLE IF NOT EXISTS job_postings (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  company_id INTEGER NOT NULL,
  created_by_user_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  requirements TEXT,
  location VARCHAR(255),
  job_type VARCHAR(50),
  salary_min INTEGER,
  salary_max INTEGER,
  status VARCHAR(50) DEFAULT 'active',
  applications_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Job applications (candidates applying to jobs)
CREATE TABLE IF NOT EXISTS job_applications (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  candidate_id INTEGER NOT NULL,
  job_posting_id INTEGER NOT NULL,
  resume_id INTEGER,
  cover_letter TEXT,
  status VARCHAR(50) DEFAULT 'applied',
  match_score DECIMAL(5,2),
  applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMPTZ,
  FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_posting_id) REFERENCES job_postings(id) ON DELETE CASCADE,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
);

-- Bulk resume uploads (for recruiters)
CREATE TABLE IF NOT EXISTS bulk_resume_uploads (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  recruiter_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  batch_name VARCHAR(255),
  total_files INTEGER,
  processed_files INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'processing',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recruiter_id) REFERENCES users(id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Analytics table
CREATE TABLE IF NOT EXISTS analytics (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  user_id INTEGER,
  event_type VARCHAR(100),
  event_data JSON,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs (GDPR compliance - tracks all key actions)
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(255),
  metadata JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Emerging skills (unknown skills from resumes, tracked for promotion)
CREATE TABLE IF NOT EXISTS emerging_skills (
  id SERIAL PRIMARY KEY,
  raw_name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) UNIQUE NOT NULL,
  occurrence_count INTEGER DEFAULT 1,
  suggested_category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  last_occurrence TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Skill aliases (alternative names for skills)
CREATE TABLE IF NOT EXISTS skill_aliases (
  id SERIAL PRIMARY KEY,
  skill_id INTEGER NOT NULL,
  alias VARCHAR(200) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- Skill implications (if you know X, you likely know Y at proficiency >= threshold)
CREATE TABLE IF NOT EXISTS skill_implications (
  id SERIAL PRIMARY KEY,
  source_skill_id INTEGER NOT NULL,
  implied_skill_id INTEGER NOT NULL,
  min_proficiency_threshold INTEGER DEFAULT 5,
  implied_proficiency INTEGER DEFAULT 3,
  confidence_score DECIMAL(3,2) DEFAULT 0.75,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  FOREIGN KEY (implied_skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  UNIQUE (source_skill_id, implied_skill_id)
);

-- Guest analysis sessions (for pre-signup analysis)
CREATE TABLE IF NOT EXISTS guest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token VARCHAR(64) UNIQUE NOT NULL,
  analysis_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_by_user_id INTEGER,
  claimed_at TIMESTAMPTZ,
  FOREIGN KEY (claimed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_created_at ON resumes(created_at);
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_job_roles_title ON job_roles(title);
CREATE INDEX IF NOT EXISTS idx_job_role_requirements_job_role_id ON job_role_requirements(job_role_id);
CREATE INDEX IF NOT EXISTS idx_skill_gap_analysis_user_id ON skill_gap_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_gap_analysis_match_percentage ON skill_gap_analysis(match_percentage);
CREATE INDEX IF NOT EXISTS idx_skill_gap_created_at ON skill_gap_analysis(created_at);
CREATE INDEX IF NOT EXISTS idx_learning_paths_user_id ON learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_status ON learning_paths(status);
CREATE INDEX IF NOT EXISTS idx_learning_resources_skill_id ON learning_resources(skill_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_job_description_analysis_user_id ON job_description_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_company_id ON job_postings(company_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_candidate_id ON job_applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_posting_id ON job_applications(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_bulk_resume_uploads_status ON bulk_resume_uploads(status);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_emerging_skills_normalized_name ON emerging_skills(normalized_name);
CREATE INDEX IF NOT EXISTS idx_emerging_skills_status ON emerging_skills(status);
CREATE INDEX IF NOT EXISTS idx_emerging_skills_occurrence_count ON emerging_skills(occurrence_count);
CREATE INDEX IF NOT EXISTS idx_skill_aliases_skill_id ON skill_aliases(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_aliases_alias ON skill_aliases(alias);
CREATE INDEX IF NOT EXISTS idx_skill_implications_source_skill_id ON skill_implications(source_skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_implications_implied_skill_id ON skill_implications(implied_skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_demand_signals_skill_id ON skill_demand_signals(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_demand_signals_signal_date ON skill_demand_signals(signal_date);
CREATE INDEX IF NOT EXISTS idx_skill_demand_signals_job_role_id ON skill_demand_signals(job_role_id);
CREATE INDEX IF NOT EXISTS idx_skill_demand_signals_occurrence ON skill_demand_signals(occurrence_count DESC);

-- Soft delete indexes
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_resumes_deleted_at ON resumes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_user_skills_deleted_at ON user_skills(deleted_at);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Guest sessions indexes
CREATE INDEX IF NOT EXISTS idx_guest_sessions_token ON guest_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires_at ON guest_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_claimed_by ON guest_sessions(claimed_by_user_id);

