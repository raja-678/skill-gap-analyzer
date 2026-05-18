const express = require('express');
const pool = require('../config/database');
const SkillExtractorService = require('../services/skillExtractorService');

const router = express.Router();

/**
 * Admin authentication middleware - checks ADMIN_SECRET header
 */
const adminAuth = (req, res, next) => {
  const adminSecret = req.headers['admin-secret'] || req.query.adminSecret;
  
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin credentials' });
  }

  next();
};

// Apply admin auth to all routes
router.use(adminAuth);

/**
 * @openapi
 * /api/admin/emerging-skills:
 *   get:
 *     summary: Get emerging skills with minimum occurrence count
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter emerging skills by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of skills to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Pagination offset
 *     responses:
 *       '200':
 *         description: Emerging skills returned
 */
router.get('/emerging-skills', async (req, res) => {
  try {
    const { status = 'pending', limit = 50, offset = 0 } = req.query;

    let query = 'SELECT id, raw_name, normalized_name, occurrence_count, suggested_category, status, last_occurrence, created_at FROM emerging_skills';
    const params = [];

    if (status) {
      query += ' WHERE status = $1 AND occurrence_count >= 5';
      params.push(status);
    } else {
      query += ' WHERE occurrence_count >= 5';
    }

    query += ` ORDER BY occurrence_count DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      emergingSkills: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching emerging skills:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/admin/emerging-skills/{id}:
 *   get:
 *     summary: Get a single emerging skill by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Emerging skill returned
 *       '404':
 *         description: Emerging skill not found
 */
router.get('/emerging-skills/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM emerging_skills WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Emerging skill not found' });
    }

    res.json({
      success: true,
      emergingSkill: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching emerging skill:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/admin/emerging-skills/{id}/promote:
 *   post:
 *     summary: Promote an emerging skill into the main skills table
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               industry_demand:
 *                 type: integer
 *     responses:
 *       '200':
 *         description: Skill promoted successfully
 *       '400':
 *         description: Validation error or missing data
 */
router.post('/emerging-skills/:id/promote', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, description, industry_demand = 0 } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Skill name is required' });
    }

    // Start transaction
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get emerging skill
      const emergingResult = await client.query(
        'SELECT * FROM emerging_skills WHERE id = $1',
        [id]
      );

      if (emergingResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Emerging skill not found' });
      }

      const emergingSkill = emergingResult.rows[0];

      // Create skill in main table
      const skillResult = await client.query(
        `INSERT INTO skills (uuid, name, category, description, industry_demand, created_at)
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW())
         RETURNING id, uuid, name, category`,
        [name, category || emergingSkill.suggested_category, description, industry_demand]
      );

      const newSkill = skillResult.rows[0];

      // Update emerging skill status
      await client.query(
        `UPDATE emerging_skills SET status = 'approved', updated_at = NOW() WHERE id = $1`,
        [id]
      );

      await client.query('COMMIT');

      // Clear caches so new skill is picked up
      SkillExtractorService.clearCaches();

      res.json({
        success: true,
        message: 'Skill promoted successfully',
        skill: newSkill
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error promoting emerging skill:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/emerging-skills/:id/reject
 * Reject emerging skill
 */
router.post('/emerging-skills/:id/reject', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE emerging_skills SET status = 'rejected', updated_at = NOW() WHERE id = $1
       RETURNING id, raw_name, normalized_name, status`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Emerging skill not found' });
    }

    res.json({
      success: true,
      message: 'Skill rejected',
      emergingSkill: result.rows[0]
    });
  } catch (error) {
    console.error('Error rejecting emerging skill:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/skill-implications
 * Get all skill implications
 */
router.get('/skill-implications', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT si.id, 
              si.source_skill_id, 
              s1.name as source_skill_name,
              si.implied_skill_id,
              s2.name as implied_skill_name,
              si.min_proficiency_threshold,
              si.implied_proficiency,
              si.confidence_score
       FROM skill_implications si
       JOIN skills s1 ON si.source_skill_id = s1.id
       JOIN skills s2 ON si.implied_skill_id = s2.id
       ORDER BY s1.name, s2.name`
    );

    res.json({
      success: true,
      implications: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching skill implications:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/skill-implications
 * Create new skill implication
 */
router.post('/skill-implications', async (req, res) => {
  try {
    const { 
      source_skill_id, 
      implied_skill_id, 
      min_proficiency_threshold = 5, 
      implied_proficiency = 3,
      confidence_score = 0.75
    } = req.body;

    if (!source_skill_id || !implied_skill_id) {
      return res.status(400).json({ error: 'source_skill_id and implied_skill_id are required' });
    }

    if (source_skill_id === implied_skill_id) {
      return res.status(400).json({ error: 'Skill cannot imply itself' });
    }

    // Verify both skills exist
    const sourceSkill = await pool.query('SELECT id FROM skills WHERE id = $1', [source_skill_id]);
    const impliedSkill = await pool.query('SELECT id FROM skills WHERE id = $1', [implied_skill_id]);

    if (sourceSkill.rows.length === 0 || impliedSkill.rows.length === 0) {
      return res.status(404).json({ error: 'One or both skills not found' });
    }

    const result = await pool.query(
      `INSERT INTO skill_implications 
       (source_skill_id, implied_skill_id, min_proficiency_threshold, implied_proficiency, confidence_score, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (source_skill_id, implied_skill_id) DO UPDATE SET 
         min_proficiency_threshold = $3,
         implied_proficiency = $4,
         confidence_score = $5
       RETURNING id, source_skill_id, implied_skill_id, min_proficiency_threshold, implied_proficiency, confidence_score`,
      [source_skill_id, implied_skill_id, min_proficiency_threshold, implied_proficiency, confidence_score]
    );

    // Clear cache
    SkillExtractorService.clearCaches();

    res.status(201).json({
      success: true,
      message: 'Skill implication created',
      implication: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating skill implication:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/skill-implications/:id
 * Delete skill implication
 */
router.delete('/skill-implications/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM skill_implications WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Skill implication not found' });
    }

    // Clear cache
    SkillExtractorService.clearCaches();

    res.json({
      success: true,
      message: 'Skill implication deleted'
    });
  } catch (error) {
    console.error('Error deleting skill implication:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/skill-aliases
 * Get skill aliases
 */
router.get('/skill-aliases', async (req, res) => {
  try {
    const { skill_id } = req.query;

    let query = `SELECT sa.id, sa.skill_id, s.name as skill_name, sa.alias
                 FROM skill_aliases sa
                 JOIN skills s ON sa.skill_id = s.id`;
    const params = [];

    if (skill_id) {
      query += ' WHERE sa.skill_id = $1';
      params.push(skill_id);
    }

    query += ' ORDER BY s.name, sa.alias';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      aliases: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching skill aliases:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/skill-aliases
 * Create skill alias
 */
router.post('/skill-aliases', async (req, res) => {
  try {
    const { skill_id, alias } = req.body;

    if (!skill_id || !alias) {
      return res.status(400).json({ error: 'skill_id and alias are required' });
    }

    // Verify skill exists
    const skillResult = await pool.query('SELECT id, name FROM skills WHERE id = $1', [skill_id]);
    if (skillResult.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const result = await pool.query(
      `INSERT INTO skill_aliases (skill_id, alias, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (alias) DO NOTHING
       RETURNING id, skill_id, alias`,
      [skill_id, alias]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Alias already exists for another skill' });
    }

    // Clear cache
    SkillExtractorService.clearCaches();

    res.status(201).json({
      success: true,
      message: 'Skill alias created',
      alias: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating skill alias:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/skill-aliases/:id
 * Delete skill alias
 */
router.delete('/skill-aliases/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM skill_aliases WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Skill alias not found' });
    }

    // Clear cache
    SkillExtractorService.clearCaches();

    res.json({
      success: true,
      message: 'Skill alias deleted'
    });
  } catch (error) {
    console.error('Error deleting skill alias:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
