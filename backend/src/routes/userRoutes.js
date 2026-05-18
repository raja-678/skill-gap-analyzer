const express = require('express');
const pool = require('../config/database');
const { softDelete } = require('../config/database');
const authenticateUser = require('../middleware/authenticateUser');
const AuthService = require('../services/authService');
const AuditService = require('../services/auditService');
const GuestSessionService = require('../services/guestSessionService');
const SkillGapAnalysisService = require('../services/skillGapAnalysisService');

const router = express.Router();

/**
 * @openapi
 * /api/users/profile:
 *   get:
 *     summary: Get current authenticated user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Current user profile returned
 */
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const user = await AuthService.getUserById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user stats
    const skillsResult = await pool.query(
      'SELECT COUNT(*) as count FROM user_skills WHERE user_id = $1 AND deleted_at IS NULL',
      [req.user.userId]
    );

    const resumesResult = await pool.query(
      'SELECT COUNT(*) as count FROM resumes WHERE user_id = $1 AND deleted_at IS NULL',
      [req.user.userId]
    );

    const analysisResult = await pool.query(
      'SELECT COUNT(*) as count FROM skill_gap_analysis WHERE user_id = $1',
      [req.user.userId]
    );

    res.json({
      success: true,
      user,
      stats: {
        skills: skillsResult.rows[0].count,
        resumes: resumesResult.rows[0].count,
        analyses: analysisResult.rows[0].count
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/users/{username}/public-profile:
 *   get:
 *     summary: Get public profile data for sharing
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Public profile data returned
 *       '404':
 *         description: User not found or profile not public
 */
router.get('/:username/public-profile', async (req, res) => {
  try {
    const { username } = req.params;

    const userResult = await pool.query(
      `SELECT id, username, first_name, last_name, profile_headline, is_public_profile, created_at
       FROM users
       WHERE username = $1 AND is_public_profile = true AND deleted_at IS NULL`,
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found or profile not public' });
    }

    const user = userResult.rows[0];

    // Top skills
    const skillsRes = await pool.query(
      `SELECT s.id, s.name, s.category
       FROM user_skills us JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = $1 AND us.deleted_at IS NULL
       ORDER BY us.proficiency_level DESC NULLS LAST, us.endorsement_count DESC NULLS LAST
       LIMIT 8`,
      [user.id]
    );

    const topSkills = skillsRes.rows;

    // Latest analysis for matchPercentage + target role
    const analysisRes = await pool.query(
      `SELECT a.match_percentage, jr.id as job_role_id, jr.title as job_role_title
       FROM skill_gap_analysis a
       JOIN job_roles jr ON a.job_role_id = jr.id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC
       LIMIT 1`,
      [user.id]
    );

    const latestAnalysis = analysisRes.rows[0] || null;

    // Skill categories aggregation
    const categoriesRes = await pool.query(
      `SELECT s.category, COUNT(*) as count
       FROM user_skills us JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = $1 AND us.deleted_at IS NULL
       GROUP BY s.category
       ORDER BY count DESC`,
      [user.id]
    );

    const skillCategories = categoriesRes.rows;

    res.json({
      success: true,
      profile: {
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        headline: user.profile_headline || null,
        topSkills,
        targetRole: latestAnalysis ? { id: latestAnalysis.job_role_id, title: latestAnalysis.job_role_title } : null,
        matchPercentage: latestAnalysis ? latestAnalysis.match_percentage : null,
        skillCategories,
        memberSince: user.created_at
      }
    });
  } catch (error) {
    console.error('Public profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/users/profile:
 *   put:
 *     summary: Update current authenticated user profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       '200':
 *         description: Updated user profile returned
 */
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const updated = await AuthService.updateUserProfile(req.user.userId, req.body);

    res.json({
      success: true,
      user: updated
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/users/:userId/skills
 * Get user's skills
 */
router.get('/:userId/skills', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.name, s.category, us.proficiency_level AS "proficiencyLevel", us.years_of_experience AS "yearsOfExperience", us.endorsement_count AS "endorsementCount", COALESCE(us.source, 'manual') AS "source"
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = $1 AND us.deleted_at IS NULL
       ORDER BY us.proficiency_level DESC`,
      [req.params.userId]
    );

    res.json({
      success: true,
      skills: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Skills error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/users/skills/add
 * Add a skill to user profile
 */
router.post('/skills/add', authenticateUser, async (req, res) => {
  try {
    const { skillId, proficiencyLevel = 5, yearsOfExperience = 0 } = req.body;

    if (!skillId) {
      return res.status(400).json({ error: 'Skill ID is required' });
    }

    const { v4: uuidv4 } = require('uuid');
    const uuid = uuidv4();

    const result = await pool.query(
      `INSERT INTO user_skills (uuid, user_id, skill_id, proficiency_level, years_of_experience, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (user_id, skill_id) 
       DO UPDATE SET proficiency_level = $4, years_of_experience = $5, updated_at = NOW()
       RETURNING *`,
      [uuid, req.user.userId, skillId, proficiencyLevel, yearsOfExperience]
    );

    res.json({
      success: true,
      userSkill: result.rows[0]
    });
  } catch (error) {
    console.error('Skill addition error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/users/skills/:skillId
 * Soft delete a skill from user profile
 */
router.delete('/skills/:skillId', authenticateUser, async (req, res) => {
  try {
    await softDelete('user_skills', req.params.skillId, 'user_id', req.user.userId);

    // Log audit event
    const ipAddress = req.ip || req.connection.remoteAddress;
    await AuditService.log(
      req.user.userId,
      'user.skill_delete',
      'user_skills',
      req.params.skillId,
      {},
      ipAddress
    );

    res.json({ success: true, message: 'Skill removed' });
  } catch (error) {
    console.error('Skill removal error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/users/skills/bulk-update
 * Bulk update user skills (add/update/remove)
 */
router.put('/skills/bulk-update', authenticateUser, async (req, res) => {
  const client = await pool.connect();
  try {
    const { skills, removedSkillIds = [] } = req.body;

    if (!Array.isArray(skills)) {
      return res.status(400).json({ error: 'Skills must be an array' });
    }

    await client.query('BEGIN');

    let updatedCount = 0;
    let removedCount = 0;

    // Handle skill updates/additions
    for (const skillData of skills) {
      const { skillId, proficiencyLevel = 5, yearsOfExperience = 0 } = skillData;

      if (!skillId) continue;

      const { v4: uuidv4 } = require('uuid');
      const uuid = uuidv4();

      const result = await client.query(
        `INSERT INTO user_skills (uuid, user_id, skill_id, proficiency_level, years_of_experience, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (user_id, skill_id)
         DO UPDATE SET proficiency_level = $4, years_of_experience = $5, updated_at = NOW()
         RETURNING *`,
        [uuid, req.user.userId, skillId, proficiencyLevel, yearsOfExperience]
      );

      if (result.rows.length > 0) {
        updatedCount++;
      }
    }

    // Handle skill removals
    if (removedSkillIds.length > 0) {
      for (const skillId of removedSkillIds) {
        await client.query(
          `UPDATE user_skills SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $1 AND skill_id = $2 AND deleted_at IS NULL`,
          [req.user.userId, skillId]
        );
        removedCount++;
      }
    }

    await client.query('COMMIT');

    if (updatedCount > 0 || removedCount > 0) {
      const targetRoleResult = await pool.query(
        'SELECT target_role_id FROM users WHERE id = $1',
        [req.user.userId]
      );

      const targetRoleId = targetRoleResult.rows[0]?.target_role_id;
      if (targetRoleId) {
        try {
          await SkillGapAnalysisService.analyzeSkillGap(req.user.userId, targetRoleId);
        } catch (snapshotError) {
          console.error('Target role snapshot error:', snapshotError);
        }
      }
    }

    // Log audit event
    const ipAddress = req.ip || req.connection.remoteAddress;
    await AuditService.log(
      req.user.userId,
      'user.skills_bulk_update',
      'user_skills',
      req.user.userId,
      { updatedCount, removedCount, totalSkills: skills.length },
      ipAddress
    );

    res.json({
      success: true,
      updated: updatedCount,
      removed: removedCount,
      message: `Skills updated: ${updatedCount} added/updated, ${removedCount} removed`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk skill update error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

/**
 * GET /api/users/export-data
 * Export all user data (GDPR compliance)
 */
router.get('/export-data', authenticateUser, async (req, res) => {
  try {
    // Get user profile
    const userResult = await pool.query(
      'SELECT id, uuid, email, username, first_name, last_name, user_type, bio, profile_picture_url, created_at, updated_at FROM users WHERE id = $1 AND deleted_at IS NULL',
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get user skills
    const skillsResult = await pool.query(
      `SELECT us.uuid, us.skill_id, s.name, s.category, us.proficiency_level, us.years_of_experience, us.endorsement_count, us.created_at
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = $1 AND us.deleted_at IS NULL
       ORDER BY us.created_at`,
      [req.user.userId]
    );

    // Get resumes
    const resumesResult = await pool.query(
      `SELECT uuid, filename, file_size, upload_status, created_at
       FROM resumes
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY created_at`,
      [req.user.userId]
    );

    // Get skill gap analyses
    const analysesResult = await pool.query(
      `SELECT uuid, job_role_id, match_percentage, skills_possessed, skills_missing, estimated_learning_time_days, created_at
       FROM skill_gap_analysis
       WHERE user_id = $1
       ORDER BY created_at`,
      [req.user.userId]
    );

    // Get learning paths
    const learningPathsResult = await pool.query(
      `SELECT uuid, job_role_id, status, progress_percentage, estimated_weeks, created_at
       FROM learning_paths
       WHERE user_id = $1
       ORDER BY created_at`,
      [req.user.userId]
    );

    // Get learning history
    const learningHistoryResult = await pool.query(
      `SELECT uuid, resource_id, status, progress_percentage, started_at, completed_at, created_at
       FROM user_learning_history
       WHERE user_id = $1
       ORDER BY created_at`,
      [req.user.userId]
    );

    // Get job applications
    const applicationsResult = await pool.query(
      `SELECT uuid, job_posting_id, status, match_score, applied_at
       FROM job_applications
       WHERE candidate_id = $1
       ORDER BY applied_at`,
      [req.user.userId]
    );

    // Get audit logs
    const auditLogsResult = await pool.query(
      `SELECT action, entity_type, entity_id, metadata, ip_address, created_at
       FROM audit_logs
       WHERE user_id = $1
       ORDER BY created_at`,
      [req.user.userId]
    );

    const exportData = {
      exportedAt: new Date().toISOString(),
      user,
      skills: skillsResult.rows,
      resumes: resumesResult.rows,
      skillGapAnalyses: analysesResult.rows,
      learningPaths: learningPathsResult.rows,
      learningHistory: learningHistoryResult.rows,
      jobApplications: applicationsResult.rows,
      auditLogs: auditLogsResult.rows
    };

    // Log audit event
    const ipAddress = req.ip || req.connection.remoteAddress;
    await AuditService.log(
      req.user.userId,
      'user.export_data',
      'user',
      req.user.userId,
      { dataSize: JSON.stringify(exportData).length },
      ipAddress
    );

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `my-data-${timestamp}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(exportData);
  } catch (error) {
    console.error('Data export error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/users/account
 * Delete user account (soft delete user and resumes, hard delete messages)
 */
router.delete('/account', authenticateUser, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Soft delete all user resumes
    await client.query(
      `UPDATE resumes SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND deleted_at IS NULL`,
      [req.user.userId]
    );

    // Soft delete all user skills
    await client.query(
      `UPDATE user_skills SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND deleted_at IS NULL`,
      [req.user.userId]
    );

    // Hard delete chat messages
    await client.query(
      `DELETE FROM chat_messages WHERE user_id = $1`,
      [req.user.userId]
    );

    // Soft delete user account
    await client.query(
      `UPDATE users SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [req.user.userId]
    );

    // Log audit event
    const ipAddress = req.ip || req.connection.remoteAddress;
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.userId, 'user.account_delete', 'user', req.user.userId, ipAddress]
    );

    await client.query('COMMIT');

    // Clear auth cookie
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none'
    });

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Account deletion error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/users/claim-guest-session
 * Claim a guest analysis session after signup
 * Transfers analysis from guest session to user account
 */
router.post('/claim-guest-session', authenticateUser, async (req, res) => {
  try {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      return res.status(400).json({ error: 'Session token is required' });
    }

    // Claim the session
    const claimedSession = await GuestSessionService.claimSession(sessionToken, req.user.userId);

    if (!claimedSession) {
      return res.status(404).json({ error: 'Session not found or already expired' });
    }

    // Log audit event
    const ipAddress = req.ip || req.connection.remoteAddress;
    await AuditService.log(
      req.user.userId,
      'user.claim_guest_session',
      'guest_sessions',
      claimedSession.id,
      { sessionToken },
      ipAddress
    );

    res.json({
      success: true,
      message: 'Guest session claimed successfully',
      analysisData: claimedSession.analysis_data
    });
  } catch (error) {
    console.error('Claim guest session error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/users/target-role
 * Set user's target job role
 */
router.put('/target-role', authenticateUser, async (req, res) => {
  try {
    const { targetRoleId } = req.body;

    if (!targetRoleId) {
      return res.status(400).json({ error: 'Target role ID is required' });
    }

    // Verify the role exists
    const roleResult = await pool.query(
      'SELECT id, title FROM job_roles WHERE id = $1',
      [targetRoleId]
    );

    if (roleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job role not found' });
    }

    // Update user's target role
    const updateResult = await pool.query(
      `UPDATE users 
       SET target_role_id = $1, target_role_set_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, target_role_id, target_role_set_at`,
      [targetRoleId, req.user.userId]
    );

    // Log audit event
    const ipAddress = req.ip || req.connection.remoteAddress;
    await AuditService.log(
      req.user.userId,
      'user.target_role_set',
      'users',
      req.user.userId,
      { targetRoleId, roleName: roleResult.rows[0].title },
      ipAddress
    );

    res.json({
      success: true,
      message: 'Target role updated successfully',
      targetRole: {
        id: roleResult.rows[0].id,
        title: roleResult.rows[0].title
      },
      targetRoleSetAt: updateResult.rows[0].target_role_set_at
    });
  } catch (error) {
    console.error('Target role update error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
