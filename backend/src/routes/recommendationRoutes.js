const express = require('express');
const pool = require('../config/database');
const authenticateUser = require('../middleware/authenticateUser');
const RecommendationService = require('../services/recommendationService');

const router = express.Router();

/**
 * GET /api/recommendations/resources/:skillName
 * Get resources for a specific skill
 */
/**
 * @openapi
 * /api/recommendations/resources/{skillName}:
 *   get:
 *     summary: Get learning resources for a given skill
 *     parameters:
 *       - in: path
 *         name: skillName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Resource list returned
 *       '404':
 *         description: Skill not found
 */
router.get('/resources/:skillName', async (req, res) => {
  try {
    const { difficulty } = req.query;

    const resources = await RecommendationService.getResourcesForSkill(
      req.params.skillName,
      difficulty
    );

    res.json({
      success: true,
      resources,
      count: resources.length
    });
  } catch (error) {
    console.error('Resources error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/recommendations/dashboard
 * Get personalized learning dashboard
 */
/**
 * @openapi
 * /api/recommendations/dashboard:
 *   get:
 *     summary: Get dashboard recommendations for the authenticated user
 *     responses:
 *       '200':
 *         description: Dashboard recommendations returned
 *       '401':
 *         description: Unauthorized
 */
router.get('/dashboard', authenticateUser, async (req, res) => {
  try {
    const dashboard = await RecommendationService.getLearningDashboard(req.user.userId);

    res.json({
      success: true,
      dashboard
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/recommendations/suggest-skills
 * Get suggestions for next skills to learn
 */
/**
 * @openapi
 * /api/recommendations/suggest-skills:
 *   get:
 *     summary: Suggest skills for the authenticated user
 *     responses:
 *       '200':
 *         description: Skill suggestions returned
 *       '401':
 *         description: Unauthorized
 */
router.get('/suggest-skills', authenticateUser, async (req, res) => {
  try {
    const suggestions = await RecommendationService.suggestNextSkills(req.user.userId);

    res.json({
      success: true,
      suggestions,
      count: suggestions.length
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/recommendations/update-progress
 * Update learning progress
 */
/**
 * @openapi
 * /api/recommendations/update-progress:
 *   put:
 *     summary: Update progress on a learning resource or path
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resourceId:
 *                 type: integer
 *               progressPercentage:
 *                 type: integer
 *             required:
 *               - resourceId
 *               - progressPercentage
 *     responses:
 *       '200':
 *         description: Progress updated successfully
 *       '400':
 *         description: Invalid request
 */
router.put('/update-progress', authenticateUser, async (req, res) => {
  try {
    const { resourceId, progressPercentage } = req.body;

    if (!resourceId || progressPercentage === undefined) {
      return res.status(400).json({ error: 'Resource ID and progress percentage required' });
    }

    const updated = await RecommendationService.updateLearningProgress(
      req.user.userId,
      resourceId,
      progressPercentage
    );

    res.json({
      success: true,
      progress: updated
    });
  } catch (error) {
    console.error('Progress update error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/recommendations/create-learning-path
 * Create personalized learning path
 */
/**
 * @openapi
 * /api/recommendations/create-learning-path:
 *   post:
 *     summary: Create a new learning path
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobRoleId:
 *                 type: integer
 *               targetProficiency:
 *                 type: integer
 *             required:
 *               - jobRoleId
 *     responses:
 *       '200':
 *         description: Learning path created
 *       '400':
 *         description: Invalid request
 */
router.post('/create-learning-path', authenticateUser, async (req, res) => {
  try {
    const { jobRoleId, targetWeeks = 12 } = req.body;

    if (!jobRoleId) {
      return res.status(400).json({ error: 'Job role ID is required' });
    }

    const learningPath = await RecommendationService.createLearningPath(
      req.user.userId,
      jobRoleId,
      targetWeeks
    );

    res.status(201).json({
      success: true,
      learningPath
    });
  } catch (error) {
    console.error('Learning path creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/recommendations/:jobRoleId
 * Get personalized learning recommendations for a job role
 */
router.get('/:jobRoleId', authenticateUser, async (req, res) => {
  try {
    const recommendations = await RecommendationService.generateRecommendations(
      req.user.userId,
      req.params.jobRoleId
    );

    res.json({
      success: true,
      recommendations,
      count: recommendations.length
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
