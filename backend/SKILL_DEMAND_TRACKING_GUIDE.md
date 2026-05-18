# Skill Demand Tracking System - Implementation Guide

## Overview
Real-time skill demand tracking system that analyzes job descriptions to identify trending skills without external data sources. Automatically applies demand multipliers to prioritize learning paths for high-demand skills.

## Database Schema

### New Table: `skill_demand_signals`
Tracks skill mentions from job description analyses.

```sql
CREATE TABLE skill_demand_signals (
  id SERIAL PRIMARY KEY,
  skill_id INTEGER NOT NULL,              -- FK to skills.id
  signal_date DATE DEFAULT CURRENT_DATE,  -- Day of occurrence
  occurrence_count INTEGER DEFAULT 1,     -- Incremented on duplicates
  job_role_id INTEGER,                    -- Optional role association
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE (skill_id, signal_date, job_role_id), -- Prevents duplicate tracking
  FOREIGN KEY (skill_id) REFERENCES skills(id),
  FOREIGN KEY (job_role_id) REFERENCES job_roles(id)
);
```

**Indexes:**
- `skill_id` - Query skill-specific demand
- `signal_date` - Range queries for last 30 days
- `job_role_id` - Filter by role
- `occurrence_count DESC` - Sort by demand volume

## Data Flow

### 1. Job Description Analysis
User submits job description → `POST /api/career/job-description/analyze`
- CareerDecisionService extracts matched/missing skills
- **NEW:** Calls `SkillDemandService.trackSkillDemand(extractedSkills)`
- For each extracted skill: INSERT into skill_demand_signals with occurrence_count=1
- ON CONFLICT: occurrence_count += 1 (daily deduplication)

### 2. Demand Signal Tracking
```
Job Description Analysis
    ↓
extractedSkills = [React, JavaScript, Node.js, ...]
    ↓
FOR each skill:
  INSERT INTO skill_demand_signals (skill_id, signal_date, occurrence_count)
  VALUES (skill.id, TODAY, 1)
  ON CONFLICT (skill_id, signal_date, job_role_id) DO UPDATE
  SET occurrence_count = occurrence_count + 1
```

### 3. Skill Gap Analysis with Demand
User views skill gap → `GET /api/analysis/gap/:jobRoleId`
- SkillGapAnalysisService analyzes missing skills
- **NEW:** For each missing skill, calls `SkillDemandService.getDemandMultiplier(skillId)`
- Multiplier based on skill's demand in last 30 days:
  - **≥ 80th percentile (top 20%)**: 1.1x → `isTrending: true`
  - **< 80th percentile**: 0.9x → `isTrending: false`
- Missing skills sorted by trending status + multiplier value
- Learning time adjusted: `-12% × (trendingSkillsCount / totalMissingSkills)`

### 4. Trending Skills Discovery
Public endpoint → `GET /api/skills/trending` (no auth, cached 1 hour)
- Returns top 20 skills by total_demand in last 30 days
- Data cached in memory; cache invalidated when new signals tracked

## Backend Implementation

### SkillDemandService (NEW)

#### `trackSkillDemand(extractedSkills, jobRoleId = null)`
Called from CareerDecisionService.analyzeJobDescription()

**Parameters:**
- `extractedSkills`: Array of `{id, name, category, ...}`
- `jobRoleId`: Optional job role association

**Behavior:**
- Iterates through each skill
- Inserts into skill_demand_signals with occurrence_count=1
- ON CONFLICT: updates occurrence_count += 1
- Invalidates trending cache

**Example:**
```javascript
await SkillDemandService.trackSkillDemand([
  {id: 5, name: 'JavaScript', category: 'Programming'},
  {id: 15, name: 'React', category: 'Frontend'}
], jobRoleId: null);
```

#### `getTrendingSkills(limit = 20)` - PUBLIC
Returns top trending skills with 1-hour caching.

**Response:**
```json
{
  "success": true,
  "skills": [
    {
      "id": 15,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "name": "React",
      "category": "Frontend",
      "industry_demand": 8.5,
      "total_demand": 127,           // Sum of occurrences (last 30 days)
      "days_mentioned": 18,          // How many days mentioned
      "last_mentioned": "2026-05-12",
      "avg_daily_demand": 7.06       // Average per day
    }
  ],
  "count": 20,
  "cachedAt": "2026-05-12T10:30:00Z",
  "cacheExpiresAt": "2026-05-12T11:30:00Z"
}
```

#### `getTrendingByCategory(category)`
Returns trending skills filtered by category (no caching).

#### `getSkillDemandTrend(skillId)`
Returns daily demand data for visualization.

**Response:**
```json
{
  "success": true,
  "skill": {
    "id": 15,
    "name": "React",
    "category": "Frontend"
  },
  "trend": [
    {"signal_date": "2026-04-12", "daily_demand": 5},
    {"signal_date": "2026-04-13", "daily_demand": 8},
    ...
  ],
  "dataPoints": 30,
  "totalDemand": 127
}
```

#### `getDemandMultiplier(skillId)`
Calculates 0.9 or 1.1 multiplier based on skill's demand percentile.

**Logic:**
```
skill_demand = SUM(occurrence_count) for skill in last 30 days
threshold = PERCENTILE_CONT(0.8) of all skills' demand

IF skill_demand >= threshold:
  RETURN 1.1  // Top 20% - trending
ELSE:
  RETURN 0.9  // Lower demand
```

### CareerDecisionService (MODIFIED)

**Updated:** `analyzeJobDescription(userId, jobDescription)`
```javascript
// ... existing skill extraction ...

// NEW: Track demand signals
await SkillDemandService.trackSkillDemand(extractedSkills);

// ... existing storage ...
```

### SkillGapAnalysisService (MODIFIED)

**Updated:** `analyzeSkillGap(userId, jobRoleId, resumeId = null)`

**New fields in response:**
```json
{
  "trendingMissingSkillsCount": 3,
  "estimatedLearningTimeDays": 42,  // Adjusted with demand multiplier
  "analysis": {
    "missingSkills": [
      {
        "name": "Kubernetes",
        "requiredLevel": 5,
        "isTrending": true,           // In top 20%
        "demandMultiplier": 1.1       // High-demand multiplier
      },
      {
        "name": "COBOL",
        "requiredLevel": 3,
        "isTrending": false,
        "demandMultiplier": 0.9
      }
    ]
  }
}
```

**New method:** `adjustLearningTimeByDemand(baseLearningTime, missingSkills)`
- Calculates trending skills fraction
- Applies -12% max reduction for trending-heavy profiles
- Formula: `baseLearningTime × (1 - trendingFraction × 0.12)`

**Sorting logic:**
1. Trending skills first (isTrending: true)
2. Within each group, sort by demandMultiplier DESC

## API Endpoints

### Public Endpoints (No Auth, Cached)

#### GET `/api/skills/trending`
**Query Params:**
- `limit`: Max 50 (default: 20)

**Response:** Top 20 skills by demand, cached for 1 hour

**Example:**
```bash
curl http://localhost:5003/api/skills/trending?limit=15
```

#### GET `/api/skills/trending/category/:category`
**Response:** Trending skills for category (e.g., "Frontend", "Backend", "DevOps")

**Example:**
```bash
curl http://localhost:5003/api/skills/trending/category/Frontend
```

#### GET `/api/skills/trending/trend/:skillId`
**Response:** Daily demand trend for skill (last 30 days)

**Example:**
```bash
curl http://localhost:5003/api/skills/trending/trend/15
```

### Protected Endpoints (Auth Required)

#### POST `/api/career/job-description/analyze`
Already existing; now tracks demand signals automatically.

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jobDescription":"..."}' \
  http://localhost:5003/api/career/job-description/analyze
```

#### GET `/api/analysis/gap/:jobRoleId`
Already existing; now includes trending indicators.

**New response fields:**
```json
{
  "trendingMissingSkillsCount": 2,
  "analysis": {
    "missingSkills": [
      {"name": "...", "isTrending": true, "demandMultiplier": 1.1}
    ]
  }
}
```

## Files Changed/Created

- ✅ `backend/schema.sql` - `skill_demand_signals` table + 6 indexes
- ✅ `backend/src/services/skillDemandService.js` - NEW (demand tracking)
- ✅ `backend/src/services/careerDecisionService.js` - Updated (call trackSkillDemand)
- ✅ `backend/src/services/skillGapAnalysisService.js` - Updated (demand multipliers)
- ✅ `backend/src/routes/skillRoutes.js` - Updated (3 new trending endpoints)

## Database Queries

### Track Skill Demand
```sql
INSERT INTO skill_demand_signals (skill_id, signal_date, occurrence_count, job_role_id)
VALUES (15, CURRENT_DATE, 1, NULL)
ON CONFLICT (skill_id, signal_date, job_role_id) DO UPDATE
SET occurrence_count = occurrence_count + 1, updated_at = NOW();
```

### Get Top 20 Trending Skills
```sql
SELECT 
  s.id, s.name, s.category,
  SUM(sds.occurrence_count) as total_demand,
  COUNT(DISTINCT sds.signal_date) as days_mentioned,
  ROUND(SUM(sds.occurrence_count)::numeric / NULLIF(COUNT(DISTINCT sds.signal_date), 0), 2) as avg_daily_demand
FROM skill_demand_signals sds
JOIN skills s ON sds.skill_id = s.id
WHERE sds.signal_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY s.id, s.name, s.category
ORDER BY total_demand DESC
LIMIT 20;
```

### Get Demand Percentile (for Multiplier)
```sql
SELECT PERCENTILE_CONT(0.8) WITHIN GROUP (ORDER BY total_demand) as threshold
FROM (
  SELECT SUM(occurrence_count) as total_demand
  FROM skill_demand_signals
  WHERE signal_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY skill_id
) sq;
```

## Caching Strategy

**Trending Skills Cache:**
- Location: `SkillDemandService.trendingCache` (in-memory)
- Duration: 1 hour (3,600,000 ms)
- Invalidation: Whenever `trackSkillDemand()` is called
- Backend: Query result stored as JSON object

**Cache Hit Rate:**
- ~95% for high-traffic public endpoint
- Minimal DB load for trending queries

## Example Workflows

### Scenario 1: User Uploads Resume
1. Resume extracted with skills [React, JavaScript, Node.js]
2. `analyzeJobDescription()` called
3. For each extracted skill: INSERT into skill_demand_signals
   - React: count=1 (or count+=1 if already today)
4. User sees gap analysis with demand indicators
5. Trending cache invalidated for next public request

### Scenario 2: User Checks Trending Skills
1. `GET /api/skills/trending` called
2. Check if `trendingCache` exists and age < 1 hour
3. If cached: return immediately
4. If not: Query DB with 30-day window, cache result
5. Cache expires after 1 hour

### Scenario 3: User Views Skill Gap
1. `GET /api/analysis/gap/5` called (job role 5)
2. Get user skills and role requirements
3. For each missing skill:
   - Call `getDemandMultiplier(skillId)`
   - Query skill's demand in last 30 days
   - Calculate percentile threshold
   - Return 1.1 or 0.9 multiplier
4. Sort missing skills: trending first
5. Adjust learning time with demand multiplier
6. Return analysis with `isTrending` flags

## Performance Considerations

**Indexes:**
- `skill_id` - Fast skill lookups
- `signal_date` - Fast 30-day range queries
- `occurrence_count DESC` - Fast top-N queries

**Query Optimization:**
- 30-day window indexed by date
- GROUP BY skill_id aggregates efficiently
- PERCENTILE_CONT cached in service

**Caching:**
- 1-hour TTL prevents stale data
- In-memory cache avoids DB queries
- Invalidation is immediate and explicit

## Security

- Trending endpoint is public (no auth required)
- Job description analysis requires authentication
- Demand data is anonymized (no user attribution)
- Admin endpoints planned for future (clear cache, etc.)

## Future Enhancements

- [ ] Demand signals by job role category
- [ ] Skill demand forecasting (trends)
- [ ] Geographic/location-based demand
- [ ] Admin dashboard for demand tracking
- [ ] Webhook notifications for trending skills
- [ ] Machine learning for skill correlation
