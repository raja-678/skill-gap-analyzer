const express = require('express');
const pool = require('../config/database');
const authenticateUser = require('../middleware/authenticateUser');
const SkillGapAnalysisService = require('../services/skillGapAnalysisService');

const router = express.Router();

/**
 * POST /api/analysis/analyze
 * Analyze skill gap for a specific job role
 */
/**
 * @openapi
 * /api/analysis/analyze:
 *   post:
 *     summary: Analyze the user\'s resume against a target job role
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobRoleId:
 *                 type: integer
 *             required:
 *               - jobRoleId
 *     responses:
 *       '200':
 *         description: Analysis result returned
 *       '400':
 *         description: Invalid request
 */
router.post('/analyze', authenticateUser, async (req, res) => {
  try {
    const { jobRoleId, resumeId } = req.body;

    if (!jobRoleId) {
      return res.status(400).json({ error: 'Job role ID is required' });
    }

    const analysis = await SkillGapAnalysisService.analyzeSkillGap(
      req.user.userId,
      jobRoleId,
      resumeId
    );

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/analysis/compare-roles
 * Compare user against multiple job roles
 */
/**
 * @openapi
 * /api/analysis/compare-roles:
 *   post:
 *     summary: Compare two job roles and the user\'s readiness
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobRoleAId:
 *                 type: integer
 *               jobRoleBId:
 *                 type: integer
 *             required:
 *               - jobRoleAId
 *               - jobRoleBId
 *     responses:
 *       '200':
 *         description: Role comparison returned
 *       '400':
 *         description: Invalid request
 */
router.post('/compare-roles', authenticateUser, async (req, res) => {
  try {
    const { jobRoleIds } = req.body;

    const comparisons = await SkillGapAnalysisService.compareMultipleRoles(
      req.user.userId,
      jobRoleIds || []
    );

    res.json({
      success: true,
      comparisons,
      count: comparisons.length
    });
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analysis/adjacent-roles
 * Find similar roles user might be ready for
 */
/**
 * @openapi
 * /api/analysis/adjacent-roles:
 *   get:
 *     summary: Get adjacent roles based on current skills
 *     responses:
 *       '200':
 *         description: Adjacent roles returned
 *       '401':
 *         description: Unauthorized
 */
router.get('/adjacent-roles', authenticateUser, async (req, res) => {
  try {
    const adjacentRoles = await SkillGapAnalysisService.findAdjacentRoles(req.user.userId);

    res.json({
      success: true,
      roles: adjacentRoles,
      count: adjacentRoles.length
    });
  } catch (error) {
    console.error('Adjacent roles error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analysis/history
 * Get user's analysis history
 */
/**
 * @openapi
 * /api/analysis/history:
 *   get:
 *     summary: List the user\'s analysis history
 *     responses:
 *       '200':
 *         description: Analysis history returned
 *       '401':
 *         description: Unauthorized
 */
router.get('/history', authenticateUser, async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    
    const result = await pool.query(
      `SELECT sga.*, jr.title as job_role_title
       FROM skill_gap_analysis sga
       JOIN job_roles jr ON sga.job_role_id = jr.id
       WHERE sga.user_id = $1
       ORDER BY sga.created_at DESC
       LIMIT $2`,
      [req.user.userId, limit]
    );

    res.json({
      success: true,
      analyses: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analysis/progress/:jobRoleId
 * Get snapshot progress for a target job role
 */
/**
 * @openapi
 * /api/analysis/progress/{jobRoleId}:
 *   get:
 *     summary: Get progress for a target job role
 *     parameters:
 *       - in: path
 *         name: jobRoleId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Progress data returned
 *       '401':
 *         description: Unauthorized
 *       '404':
 *         description: Role not found
 */
router.get('/progress/:jobRoleId', authenticateUser, async (req, res) => {
  try {
    const { jobRoleId } = req.params;

    const result = await pool.query(
      `SELECT snapshot_date, match_percentage, skills_possessed, skills_missing
       FROM readiness_snapshots
       WHERE user_id = $1 AND job_role_id = $2
       ORDER BY snapshot_date ASC`,
      [req.user.userId, jobRoleId]
    );

    res.json({
      success: true,
      progress: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Progress error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
