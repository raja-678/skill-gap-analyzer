const express = require('express');
const authenticateUser = require('../middleware/authenticateUser');
const ChatAgentService = require('../services/chatAgentService');
const { chatMessageSchema, validate } = require('../validators');

const router = express.Router();

/**
 * @openapi
 * /api/chat/history:
 *   get:
 *     summary: Get recent chat history for the current user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum history items to return
 *     responses:
 *       '200':
 *         description: Chat history returned
 */
router.get('/history', authenticateUser, async (req, res) => {
  try {
    const history = await ChatAgentService.getHistory(
      req.user.userId,
      Number(req.query.limit) || 30
    );

    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Chat history error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/chat/message:
 *   post:
 *     summary: Send a message to the career chat agent
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *               history:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       '200':
 *         description: Chat agent response returned
 */
router.post('/message', authenticateUser, validate(chatMessageSchema), async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    const result = await ChatAgentService.sendMessage(
      req.user.userId,
      message,
      history
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Chat agent error:', error.response?.data || error.message);
    res.status(500).json({
      error: error.response?.data?.error?.message || error.message
    });
  }
});

module.exports = router;
