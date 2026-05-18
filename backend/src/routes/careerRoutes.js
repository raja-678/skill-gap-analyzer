const express = require('express');
const authenticateUser = require('../middleware/authenticateUser');
const CareerDecisionService = require('../services/careerDecisionService');
const { jobDescriptionSchema, validate } = require('../validators');

const router = express.Router();

/**
 * @openapi
 * /api/career/snapshot:
 *   get:
 *     summary: Get the authenticated user\'s career snapshot
 *     responses:
 *       '200':
 *         description: Career snapshot returned successfully
 *       '401':
 *         description: Unauthorized
 */
router.get('/snapshot', authenticateUser, async (req, res) => {
  try {
    const snapshot = await CareerDecisionService.getCareerSnapshot(req.user.userId);
    res.json({ success: true, snapshot });
  } catch (error) {
    console.error('Career snapshot error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/career/job-description/analyze:
 *   post:
 *     summary: Analyze a job description for skill matching
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobDescription:
 *                 type: string
 *             required:
 *               - jobDescription
 *     responses:
 *       '200':
 *         description: Job description analysis returned
 *       '400':
 *         description: Invalid request body
 */
router.post('/job-description/analyze', authenticateUser, validate(jobDescriptionSchema), async (req, res) => {
  try {
    const analysis = await CareerDecisionService.analyzeJobDescription(
      req.user.userId,
      req.body.jobDescription
    );
    res.json({ success: true, analysis });
  } catch (error) {
    console.error('Job description analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
