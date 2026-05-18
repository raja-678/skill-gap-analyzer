# Skill Management System - Implementation Guide

## Overview
Advanced skill management system with emerging skills tracking, skill implications, and admin controls.

## Database Schema

### New Tables

#### `emerging_skills`
Tracks unrecognized/new skills from resumes for review and promotion.

```sql
CREATE TABLE emerging_skills (
  id SERIAL PRIMARY KEY,
  raw_name VARCHAR(255),              -- Original skill name from resume
  normalized_name VARCHAR(255) UNIQUE,-- Lowercased, no special chars
  occurrence_count INTEGER DEFAULT 1, -- Auto-incremented on duplicate
  suggested_category VARCHAR(100),    -- Inferred category
  status VARCHAR(50) DEFAULT 'pending',-- 'pending', 'approved', 'rejected'
  last_occurrence TIMESTAMPTZ,        -- Updated when skill re-appears
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### `skill_aliases`
Alternative names/spellings for skills (database-managed, replaces hardcoded object).

```sql
CREATE TABLE skill_aliases (
  id SERIAL PRIMARY KEY,
  skill_id INTEGER NOT NULL,
  alias VARCHAR(200) UNIQUE,         -- E.g., "js" for "JavaScript"
  created_at TIMESTAMPTZ,
  FOREIGN KEY (skill_id) REFERENCES skills(id)
);
```

#### `skill_implications`
Skill prerequisite/related mappings: if React (level 5+) → implies JavaScript (level 3).

```sql
CREATE TABLE skill_implications (
  id SERIAL PRIMARY KEY,
  source_skill_id INTEGER NOT NULL,
  implied_skill_id INTEGER NOT NULL,
  min_proficiency_threshold INTEGER,  -- User must have this proficiency in source
  implied_proficiency INTEGER,        -- Proficiency level to assign to implied skill
  confidence_score DECIMAL(3,2),      -- 0.5-1.0 (currently informational)
  created_at TIMESTAMPTZ,
  UNIQUE (source_skill_id, implied_skill_id),
  FOREIGN KEY (source_skill_id) REFERENCES skills(id),
  FOREIGN KEY (implied_skill_id) REFERENCES skills(id)
);
```

## Backend Changes

### skillExtractorService.js

**New Methods:**
- `loadSkillAliases()`: Cache skill aliases from DB; falls back to built-in aliases
- `loadSkillImplications()`: Cache skill implications; lazy-loaded
- `clearCaches()`: Called after admin updates to invalidate caches
- `trackEmergingSkill(skillName, category)`: Inserts or increments emerging_skills count
- `canonicalSkillKey(value, dbAliases)`: Resolves skill name using aliases

**Modified Methods:**
- `extractSkillsWithLlm()`: Tracks unmatched skills as emerging
- `extractSkillsWithKeywords()`: Accepts `dbAliases` parameter
- `addSkillsToUser()`: **Two-pass approach:**
  - **Pass 1**: Add extracted skills to user_skills
  - **Pass 2**: Apply implications (if user has React level 5+, add JavaScript level 3)

**Cache Behavior:**
- On first call, loads aliases and implications from DB
- Subsequent calls use cached data
- Admin endpoints call `clearCaches()` on POST/DELETE

### Flow: Resume → Skills → Implications

```
Resume Text
    ↓
extractSkills() calls LLM/Keywords
    ↓
Skill found in DB? 
    ├─ YES: Return matched skill
    └─ NO: INSERT/UPDATE emerging_skills, continue
    ↓
addSkillsToUser()
    ├─ Pass 1: INSERT user_skills (extracted)
    ├─ Pass 2: Load skill_implications
    └─ For each extracted skill:
        If proficiency >= threshold
        → INSERT implied skill at implied_proficiency
```

## Admin Endpoints

**All admin endpoints require:** `Admin-Secret` header with value = `ADMIN_SECRET` env var

### Emerging Skills Management

#### GET `/api/admin/emerging-skills`
List emerging skills with occurrence_count >= 5.

**Query Parameters:**
- `status`: Filter by 'pending', 'approved', or 'rejected' (default: pending)
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset

**Response:**
```json
{
  "success": true,
  "emergingSkills": [
    {
      "id": 1,
      "raw_name": "Docker Container Orchestration",
      "normalized_name": "dockercontainerorchestration",
      "occurrence_count": 7,
      "suggested_category": "DevOps",
      "status": "pending",
      "last_occurrence": "2026-05-12T10:30:00Z",
      "created_at": "2026-05-05T09:00:00Z"
    }
  ]
}
```

#### POST `/api/admin/emerging-skills/:id/promote`
Move emerging skill to main skills table.

**Request Body:**
```json
{
  "name": "Docker",
  "category": "DevOps",
  "description": "Container platform for microservices",
  "industry_demand": 8.5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Skill promoted successfully",
  "skill": {
    "id": 42,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Docker",
    "category": "DevOps"
  }
}
```

#### POST `/api/admin/emerging-skills/:id/reject`
Mark emerging skill as rejected.

**Response:**
```json
{
  "success": true,
  "message": "Skill rejected",
  "emergingSkill": {
    "id": 1,
    "raw_name": "NotARealSkill",
    "normalized_name": "notarealskill",
    "status": "rejected"
  }
}
```

### Skill Implications Management

#### GET `/api/admin/skill-implications`
List all skill implications with skill names.

**Response:**
```json
{
  "success": true,
  "implications": [
    {
      "id": 1,
      "source_skill_id": 15,
      "source_skill_name": "React",
      "implied_skill_id": 5,
      "implied_skill_name": "JavaScript",
      "min_proficiency_threshold": 5,
      "implied_proficiency": 3,
      "confidence_score": 0.75
    }
  ],
  "count": 25
}
```

#### POST `/api/admin/skill-implications`
Create or update a skill implication.

**Request Body:**
```json
{
  "source_skill_id": 15,
  "implied_skill_id": 5,
  "min_proficiency_threshold": 5,
  "implied_proficiency": 3,
  "confidence_score": 0.75
}
```

**Response:**
```json
{
  "success": true,
  "message": "Skill implication created",
  "implication": {
    "id": 1,
    "source_skill_id": 15,
    "implied_skill_id": 5,
    "min_proficiency_threshold": 5,
    "implied_proficiency": 3
  }
}
```

#### DELETE `/api/admin/skill-implications/:id`
Delete a skill implication.

**Response:**
```json
{
  "success": true,
  "message": "Skill implication deleted"
}
```

### Skill Aliases Management

#### GET `/api/admin/skill-aliases`
List all skill aliases.

**Query Parameters:**
- `skill_id`: Filter aliases for a specific skill

**Response:**
```json
{
  "success": true,
  "aliases": [
    {
      "id": 1,
      "skill_id": 5,
      "skill_name": "JavaScript",
      "alias": "js"
    },
    {
      "id": 2,
      "skill_id": 5,
      "skill_name": "JavaScript",
      "alias": "nodejs"
    }
  ],
  "count": 2
}
```

#### POST `/api/admin/skill-aliases`
Create a skill alias.

**Request Body:**
```json
{
  "skill_id": 5,
  "alias": "js"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Skill alias created",
  "alias": {
    "id": 1,
    "skill_id": 5,
    "alias": "js"
  }
}
```

#### DELETE `/api/admin/skill-aliases/:id`
Delete a skill alias.

**Response:**
```json
{
  "success": true,
  "message": "Skill alias deleted"
}
```

## Environment Configuration

```env
# Admin secret for protected endpoints
ADMIN_SECRET=your-super-secret-admin-key-here

# All other existing vars remain the same
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

## Seeding Skill Implications

Run the included seed script to populate common skill implications:

```bash
node backend/src/seeds/seedSkillImplications.js
```

**Included implications:**
- Frontend frameworks → JavaScript (React, Vue, Angular)
- Backend frameworks → languages (Django→Python, Express→JavaScript, etc.)
- Databases → SQL (PostgreSQL, MySQL, Oracle)
- DevOps tools → prerequisites (Kubernetes→Docker→Linux)
- Cloud platforms → Cloud Computing
- Testing frameworks → base languages
- Data libraries → Python

Add more by editing the `skillImplications` array in the seed file.

## Usage Examples

### Admin Workflow: Promote Emerging Skill

```bash
# 1. Check emerging skills
curl -H "Admin-Secret: secret123" \
  http://localhost:5003/api/admin/emerging-skills?status=pending

# 2. Promote a skill
curl -X POST \
  -H "Admin-Secret: secret123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kubernetes",
    "category": "DevOps",
    "description": "Container orchestration platform",
    "industry_demand": 8.2
  }' \
  http://localhost:5003/api/admin/emerging-skills/5/promote

# 3. Add implication: Kubernetes → Docker
curl -X POST \
  -H "Admin-Secret: secret123" \
  -H "Content-Type: application/json" \
  -d '{
    "source_skill_id": 42,
    "implied_skill_id": 41,
    "min_proficiency_threshold": 6,
    "implied_proficiency": 4
  }' \
  http://localhost:5003/api/admin/skill-implications
```

### User Resume Upload Flow

1. Resume uploaded → skills extracted
2. Unmatched skills → inserted into emerging_skills (occurrence_count++)
3. Matched skills → added to user_skills
4. Implications applied → related skills added automatically
   - User has React 5+ → JavaScript 3 added
   - User has Kubernetes 6+ → Docker 4 added, then Linux 3 added

## Performance Considerations

- **Caching**: Aliases and implications cached in memory after first load
- **Concurrent updates**: Admin operations clear caches automatically
- **Indexes**: emerging_skills indexed on normalized_name, status, occurrence_count
- **Batch operations**: Skill implications applied in single transaction per user

## Security

- All admin endpoints protected by `Admin-Secret` header
- Header value must match `ADMIN_SECRET` environment variable
- Recommend long, cryptographically random secret (32+ chars)
- Header checked first; all subsequent operations logged

## Future Enhancements

- [ ] Admin UI for skill management dashboard
- [ ] Bulk skill promotion/rejection
- [ ] Skill graph visualization
- [ ] ML-based category suggestion
- [ ] Confidence scoring for implications
- [ ] Skill equivalence rules (C++ ≈ C)
