const express = require('express');
const pool = require('../config/database');
const SkillDemandService = require('../services/skillDemandService');

const router = express.Router();

/**
 * GET /api/skills
 * Get all available skills
 */
/**
 * @openapi
 * /api/skills:
 *   get:
 *     summary: List all skills
 *     responses:
 *       '200':
 *         description: Skill list returned
 */
router.get('/', async (req, res) => {
  try {
    const { category, limit = 100, offset = 0 } = req.query;

    let query = 'SELECT id, uuid, name, category, description, industry_demand, average_salary_impact FROM skills';
    const params = [];

    if (category) {
      query += ' WHERE category = $1';
      params.push(category);
    }

    query += ` ORDER BY industry_demand DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      skills: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Skills list error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/skills/categories
 * Get all skill categories
 */
/**
 * @openapi
 * /api/skills/categories:
 *   get:
 *     summary: List skill categories
 *     responses:
 *       '200':
 *         description: Skill categories returned
 */
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT category FROM skills WHERE category IS NOT NULL ORDER BY category'
    );

    const categories = result.rows.map(row => row.category);

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/skills/trending
 * Get top 20 trending skills by demand (last 30 days)
 * No auth required, public endpoint, cached for 1 hour
 */
/**
 * @openapi
 * /api/skills/trending:
 *   get:
 *     summary: Get trending skills overall
 *     responses:
 *       '200':
 *         description: Trending skills returned
 */
router.get('/trending', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const result = await SkillDemandService.getTrendingSkills(Math.min(parseInt(limit), 50));
    
    res.json(result);
  } catch (error) {
    console.error('Trending skills error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/skills/trending/category/:category
 * Get trending skills for a specific category
 * No auth required, public endpoint
 */
/**
 * @openapi
 * /api/skills/trending/category/{category}:
 *   get:
 *     summary: Get trending skills by category
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Trending category skills returned
 */
router.get('/trending/category/:category', async (req, res) => {
  try {
    const result = await SkillDemandService.getTrendingByCategory(req.params.category);
    res.json(result);
  } catch (error) {
    console.error('Trending by category error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/skills/trending/trend/:skillId
 * Get demand trend for a specific skill (last 30 days)
 * No auth required, public endpoint
 */
/**
 * @openapi
 * /api/skills/trending/trend/{skillId}:
 *   get:
 *     summary: Get trend details for a skill
 *     parameters:
 *       - in: path
 *         name: skillId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Skill trend details returned
 */
router.get('/trending/trend/:skillId', async (req, res) => {
  try {
    const result = await SkillDemandService.getSkillDemandTrend(req.params.skillId);
    res.json(result);
  } catch (error) {
    console.error('Skill trend error:', error);
    res.status(500).json({ error: error.message });
  }
});
/**
 * @openapi
 * /api/skills/search/{query}:
 *   get:
 *     summary: Search skills by name or description
 *     parameters:
 *       - in: path
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Skill search results returned
 */
router.get('/search/:query', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, uuid, name, category, description, industry_demand
       FROM skills
       WHERE name ILIKE $1 OR description ILIKE $1
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
 * GET /api/skills/:skillId
 * Get specific skill details
 */
/**
 * @openapi
 * /api/skills/{skillId}:
 *   get:
 *     summary: Get details for a skill
 *     parameters:
 *       - in: path
 *         name: skillId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Skill details returned
 *       '404':
 *         description: Skill not found
 */
router.get('/:skillId', async (req, res) => {
  try {
    const skillResult = await pool.query(
      'SELECT * FROM skills WHERE id = $1',
      [req.params.skillId]
    );

    if (skillResult.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const skill = skillResult.rows[0];

    // Get learning resources for this skill
    const resourcesResult = await pool.query(
      `SELECT id, uuid, title, description, url, resource_type, provider, difficulty_level, duration_hours, cost, rating
       FROM learning_resources
       WHERE skill_id = $1
       ORDER BY rating DESC, cost ASC`,
      [req.params.skillId]
    );

    res.json({
      success: true,
      skill,
      resources: resourcesResult.rows
    });
  } catch (error) {
    console.error('Skill detail error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
