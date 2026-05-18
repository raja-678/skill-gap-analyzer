# GDPR Compliance Implementation Guide

## Overview
Complete GDPR compliance features including soft deletes, audit logging, data export, and account deletion.

## Features Implemented

### 1. Soft Deletes
Instead of permanently deleting data, records are marked with `deleted_at` timestamp. All queries automatically filter out soft-deleted records.

#### Tables with Soft Delete Support
- `users` - User accounts
- `resumes` - User resume files
- `user_skills` - User skill records

#### Helper Function
```javascript
const { softDelete } = require('../config/database');

// Usage
await softDelete('resumes', resumeId, 'user_id', userId);
// Sets deleted_at = CURRENT_TIMESTAMP on the record
// Verifies ownership before deleting (ownerCol = userId)
```

#### Automatic Filtering
All queries through the models automatically filter `deleted_at IS NULL`:

```javascript
// These automatically exclude soft-deleted records
const user = await User.findOne({ id: userId });
const resumes = await Resume.find({ user_id: userId });
```

---

### 2. Audit Logging
All key user actions are logged to the `audit_logs` table for compliance and security monitoring.

#### AuditService Methods

```javascript
const AuditService = require('../services/auditService');

// Log an action
await AuditService.log(
  userId,              // User ID
  'user.register',     // Action name
  'user',              // Entity type
  userId,              // Entity ID
  { email, username }, // Metadata (JSON)
  ipAddress            // Request IP
);

// Get user's audit logs
const logs = await AuditService.getUserLogs(userId, limit, offset);

// Get logs for a specific entity
const logs = await AuditService.getEntityLogs('resume', resumeId);

// Get logs by action type
const logs = await AuditService.getLogsByAction('user.register', limit);

// Get recent logs (admin)
const logs = await AuditService.getRecentLogs(limit);
```

#### Logged Actions

| Action | When | Metadata | Example |
|--------|------|----------|---------|
| `user.register` | User creates account | {email, username, userType} | New user signup |
| `user.login` | User logs in | {email} | Login attempt |
| `resume.upload` | Resume file uploaded | {filename, size} | Resume added |
| `resume.delete` | Resume soft deleted | {filename} | Resume removed |
| `user.skill_delete` | Skill removed from profile | {} | Skill unlinked |
| `user.export_data` | GDPR data export | {dataSize} | Export downloaded |
| `user.account_delete` | Account deleted | {} | Account removed |

#### Audit Logs Schema
```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,           -- Can be NULL for failed logins
  action VARCHAR(100),       -- Action name
  entity_type VARCHAR(100),  -- Type of entity affected
  entity_id VARCHAR(255),    -- ID of affected entity
  metadata JSONB,            -- Additional data
  ip_address VARCHAR(45),    -- IPv4 or IPv6
  created_at TIMESTAMPTZ,    -- Timestamp
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

---

### 3. Data Export (GDPR Right to Access)

**Endpoint:** `GET /api/users/export-data`
**Auth:** Required (Bearer token or cookie)
**Response:** JSON file download

#### Response Structure
```json
{
  "exportedAt": "2026-05-12T15:30:00.000Z",
  "user": {
    "id": 1,
    "uuid": "uuid-string",
    "email": "user@example.com",
    "username": "username",
    "first_name": "John",
    "last_name": "Doe",
    "user_type": "candidate",
    "bio": "Bio text",
    "profile_picture_url": "https://...",
    "created_at": "2026-01-15T...",
    "updated_at": "2026-05-10T..."
  },
  "skills": [
    {
      "uuid": "skill-uuid",
      "skill_id": 15,
      "name": "React",
      "category": "Frontend",
      "proficiency_level": 5,
      "years_of_experience": 3.5,
      "endorsement_count": 12,
      "created_at": "2026-03-01T..."
    }
  ],
  "resumes": [
    {
      "uuid": "resume-uuid",
      "filename": "resume.pdf",
      "file_size": 245678,
      "upload_status": "completed",
      "created_at": "2026-04-20T..."
    }
  ],
  "skillGapAnalyses": [...],
  "learningPaths": [...],
  "learningHistory": [...],
  "jobApplications": [...],
  "auditLogs": [
    {
      "action": "user.login",
      "entity_type": "user",
      "entity_id": "1",
      "metadata": {"email": "user@example.com"},
      "ip_address": "192.168.1.1",
      "created_at": "2026-05-12T15:20:00Z"
    }
  ]
}
```

#### Download Filename
`my-data-YYYY-MM-DD.json`

#### Example Request
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://api.example.com/api/users/export-data \
  -o my-data.json
```

#### Implementation Notes
- All user data is included except `password_hash`
- Includes full audit trail of user actions
- Logged as `user.export_data` action
- Data includes only non-deleted records

---

### 4. Account Deletion (GDPR Right to Erasure)

**Endpoint:** `DELETE /api/users/account`
**Auth:** Required (Bearer token or cookie)
**Response:** `{success: true, message: "Account deleted successfully"}`

#### What Gets Deleted

| Item | Type | Action |
|------|------|--------|
| User account | users | Soft delete (deleted_at set) |
| User resumes | resumes | Soft delete (deleted_at set) |
| User skills | user_skills | Soft delete (deleted_at set) |
| Chat messages | chat_messages | Hard delete (permanent removal) |
| Auth cookie | Cookie | Cleared |

#### Rationale for Hard vs Soft Delete

**Soft Delete (user, resumes, user_skills):**
- Preserves referential integrity with foreign keys
- Enables recovery within grace period
- Maintains audit trail history
- Required by soft delete indexes

**Hard Delete (chat_messages):**
- Sensitive content (conversation history)
- No referential integrity issues
- User explicitly requested erasure
- Immediate removal preferred

#### Database Transaction
All operations wrapped in transaction:
1. BEGIN
2. Soft delete all resumes
3. Soft delete all user skills
4. Hard delete all chat messages
5. Soft delete user account
6. Log audit event
7. COMMIT (or ROLLBACK on error)

#### Example Request
```bash
curl -X DELETE \
  -H "Authorization: Bearer TOKEN" \
  https://api.example.com/api/users/account
```

#### Response
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

---

## Database Schema Changes

### Soft Delete Columns
```sql
-- Added to: users, resumes, user_skills
deleted_at TIMESTAMPTZ  -- NULL if active, timestamp if deleted
```

### New Table: audit_logs
```sql
CREATE TABLE audit_logs (
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
```

### New Indexes
- `idx_users_deleted_at` - Fast filtering of active users
- `idx_resumes_deleted_at` - Fast filtering of active resumes
- `idx_user_skills_deleted_at` - Fast filtering of active skills
- `idx_audit_logs_user_id` - Fast audit trail lookup
- `idx_audit_logs_action` - Fast action type queries
- `idx_audit_logs_entity_type` - Fast entity type queries
- `idx_audit_logs_created_at` - Fast time-range queries

---

## API Changes

### Updated Endpoints

#### DELETE /api/resumes/:resumeId
**Before:** Hard delete
**After:** Soft delete with audit logging

```bash
# Request
DELETE /api/resumes/123

# Response
{
  "success": true,
  "message": "Resume deleted"
}
```

#### DELETE /api/users/skills/:skillId
**Before:** Hard delete
**After:** Soft delete with audit logging

```bash
# Request
DELETE /api/users/skills/15

# Response
{
  "success": true,
  "message": "Skill removed"
}
```

### New Endpoints

#### GET /api/users/export-data
GDPR data export endpoint (see Data Export section above)

#### DELETE /api/users/account
Account deletion endpoint (see Account Deletion section above)

---

## Service Changes

### AuditService (NEW)
- Located: `backend/src/services/auditService.js`
- Static methods for logging and querying
- Non-blocking (audit failures don't block operations)

### Updated Services

#### authService
- `register()` → logs `user.register`
- `login()` → logs `user.login`
- No changes to authentication flow

#### All Routes Updated
- Added AuditService logging on key actions
- Import: `const AuditService = require('../services/auditService');`
- IP address captured: `req.ip || req.connection.remoteAddress`

---

## Compliance Checklist

### GDPR Article 17 - Right to Erasure
- ✅ User can delete account on demand
- ✅ Soft delete preserves data integrity
- ✅ Hard delete for sensitive data (chat messages)
- ✅ Transaction ensures atomic operation
- ✅ All soft-deleted data auto-filtered from queries

### GDPR Article 15 - Right to Access
- ✅ Users can download all personal data
- ✅ Format: Machine-readable JSON
- ✅ Includes all user-related records
- ✅ Excludes password hashes
- ✅ Includes audit trail of actions

### GDPR Article 5 - Data Protection Principles
- ✅ Transparency: Audit logs track all actions
- ✅ Accountability: Complete audit trail
- ✅ Integrity: Transaction guarantees
- ✅ Confidentiality: No sensitive data in export

### GDPR Article 30 - Record of Processing
- ✅ Audit logs provide complete record
- ✅ User ID, action, timestamp, IP address
- ✅ Entity type and ID tracked
- ✅ Metadata includes action details

---

## Testing Checklist

```bash
# 1. Test soft delete filtering
GET /api/users/profile  # Should work before delete
DELETE /api/resumes/123
GET /api/users/profile  # Resume count decreased
# Verify deleted_at IS NULL in all SELECT queries

# 2. Test audit logging
POST /api/auth/register
# Check audit_logs table for user.register action

# 3. Test data export
GET /api/users/export-data
# Verify JSON structure and all fields present
# Verify password_hash not included

# 4. Test account deletion
DELETE /api/users/account
# Verify soft delete on user, resumes, user_skills
# Verify hard delete on chat_messages
# Verify auth cookie cleared
# Verify user cannot login after
```

---

## Performance Considerations

### Soft Delete Query Impact
- Minimal: Single `WHERE deleted_at IS NULL` clause per query
- Indexed on all three soft-delete tables
- Query planner uses indexes efficiently

### Audit Log Growth
- Write-heavy table (one per significant action)
- Auto-retention policy recommended:
  - Keep 7 years for legal compliance
  - Archive logs older than 1 year
  - Consider partitioning by created_at

### Data Export Performance
- Up to ~10 queries (profile + 9 data collections)
- Cached results recommended if multiple exports
- Suitable for background job processing

---

## Configuration

### Environment Variables
No additional .env variables required. Standard setup:
```
DATABASE_URL=postgresql://...
NODE_ENV=production|development
```

### Audit Log Retention
Consider adding to `package.json` scripts:
```json
{
  "scripts": {
    "audit:cleanup": "node scripts/cleanupOldAuditLogs.js"
  }
}
```

---

## Troubleshooting

### Issue: Soft-deleted records still appearing in queries
**Solution:** Ensure `WHERE deleted_at IS NULL` added to manual queries
- Model methods auto-filter ✅
- Direct pool.query() calls need manual filter

### Issue: Data export missing some fields
**Solution:** Check SELECT statement includes all columns
- Example: `SELECT * FROM user_skills WHERE user_id = $1`
- Verify table schema has all expected columns

### Issue: Account deletion fails
**Solution:** Check transaction isolation and foreign keys
- Ensure users table accessible (not locked)
- Verify all foreign keys properly configured
- Check database permissions

---

## Example: Complete User Lifecycle

```javascript
// 1. User registers
POST /api/auth/register
// audit_logs: user.register

// 2. User uploads resume
POST /api/resumes/upload
// audit_logs: resume.upload

// 3. User adds skills
POST /api/users/skills/add
// No auto-audit (manual action logging can be added)

// 4. User deletes resume
DELETE /api/resumes/123
// audit_logs: resume.delete
// resumes.deleted_at = NOW()

// 5. User exports data
GET /api/users/export-data
// audit_logs: user.export_data
// Returns: user, skills, resumes, analyses, etc.

// 6. User deletes account
DELETE /api/users/account
// audit_logs: user.account_delete
// users.deleted_at = NOW()
// resumes.deleted_at = NOW()
// user_skills.deleted_at = NOW()
// chat_messages: DELETED (hard)
// Auth cookie cleared
```

---

## Compliance Documents

### Data Processing Agreement (DPA)
This implementation supports GDPR compliance with:
- Data minimization (soft deletes preserve structure)
- Purpose limitation (audit logs for accountability)
- Storage limitation (retention policies can be enforced)
- Integrity and confidentiality (encrypted connections)

### Privacy Policy Sections
Recommend updating to include:
1. Data collection methods (listed in audit logs)
2. Retention periods (see Audit Log Retention)
3. User rights (export and deletion endpoints)
4. Data sharing (audit logs track access)
5. Security measures (encryption, access control)
