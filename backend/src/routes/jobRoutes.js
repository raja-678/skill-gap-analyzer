const express = require('express');
const pool = require('../config/database');

const router = express.Router();

/**
 * GET /api/jobs
 * Get all job roles
 */
/**
 * @openapi
 * /api/jobs:
 *   get:
 *     summary: Get available job roles
 *     responses:
 *       '200':
 *         description: Job roles list returned
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0, category, seniority } = req.query;

    let query = 'SELECT id, uuid, title, description, category, seniority_level, avg_salary, market_demand FROM job_roles';
    const params = [];

    if (category || seniority) {
      const conditions = [];
      if (category) {
        conditions.push('category = $' + (params.length + 1));
        params.push(category);
      }
      if (seniority) {
        conditions.push('seniority_level = $' + (params.length + 1));
        params.push(seniority);
      }
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY market_demand DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      jobs: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Jobs list error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/jobs/search/:query
 * Search jobs by title
 */
/**
 * @openapi
 * /api/jobs/search/{query}:
 *   get:
 *     summary: Search job roles by query
 *     parameters:
 *       - in: path
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Search results returned
 */
router.get('/search/:query', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, uuid, title, description, category, seniority_level, avg_salary
       FROM job_roles
       WHERE title ILIKE $1 OR description ILIKE $1
       LIMIT 20`,
      [`%${req.params.query}%`]
    );

    res.json({
      success: true,
      results: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/jobs/:jobId
 * Get specific job role with requirements
 */
/**
 * @openapi
 * /api/jobs/{jobId}:
 *   get:
 *     summary: Get details for a specific job role
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Job role details returned
 *       '404':
 *         description: Job role not found
 */
router.get('/:jobId', async (req, res) => {
  try {
    const jobResult = await pool.query(
      'SELECT * FROM job_roles WHERE id = $1',
      [req.params.jobId]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job role not found' });
    }

    const job = jobResult.rows[0];

    // Get required skills
    const skillsResult = await pool.query(
      `SELECT s.id, s.name, s.category, jrr.proficiency_level, jrr.importance_level
       FROM job_role_requirements jrr
       JOIN skills s ON jrr.skill_id = s.id
       WHERE jrr.job_role_id = $1`,
      [req.params.jobId]
    );

    res.json({
      success: true,
      job,
      requiredSkills: skillsResult.rows
    });
  } catch (error) {
    console.error('Job detail error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
