const axios = require('axios');
const pool = require('../config/database');

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const MAX_HISTORY_MESSAGES = 8;

const compactAnalysis = (analysis) => ({
  role: analysis.job_role_title || `Role ${analysis.job_role_id}`,
  matchPercentage: analysis.match_percentage,
  skillsPossessed: analysis.skills_possessed,
  skillsMissing: analysis.skills_missing,
  skillsStrong: analysis.skills_strong,
  estimatedLearningTimeDays: analysis.estimated_learning_time_days,
  readiness: analysis.analysis_data?.readiness,
  missingSkills: analysis.analysis_data?.missingSkills?.slice?.(0, 8) || [],
  improvableSkills: analysis.analysis_data?.improvableSkills?.slice?.(0, 8) || []
});

class ChatAgentService {
  static isEnabled() {
    return Boolean(process.env.GROQ_API_KEY);
  }

  static async getHistory(userId, limit = 30) {
    const result = await pool.query(
      `SELECT role, content, provider, model, created_at
       FROM chat_messages
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.reverse();
  }

  static async getUserContext(userId) {
    const [skillsResult, analysesResult, jobsResult] = await Promise.all([
      pool.query(
        `SELECT s.id, s.name, us.proficiency_level, s.category
         FROM user_skills us
         JOIN skills s ON us.skill_id = s.id
         WHERE us.user_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT sga.*, jr.title AS job_role_title
         FROM skill_gap_analysis sga
         JOIN job_roles jr ON sga.job_role_id = jr.id
         WHERE sga.user_id = $1
         ORDER BY sga.created_at DESC
         LIMIT $2`,
        [userId, 5]
      ),
      pool.query(
        `SELECT id, uuid, title, description, category, seniority_level, avg_salary, market_demand
         FROM job_roles
         ORDER BY market_demand DESC
         LIMIT $1 OFFSET $2`,
        [8, 0]
      )
    ]);

    return {
      userSkills: skillsResult.rows.map((skill) => ({
        name: skill.name,
        category: skill.category,
        proficiency: skill.proficiency_level
      })),
      recentAnalyses: analysesResult.rows.map(compactAnalysis),
      availableRoles: jobsResult.rows.map((job) => ({
        id: job.id,
        title: job.title,
        category: job.category,
        seniority: job.seniority_level,
        marketDemand: job.market_demand
      }))
    };
  }

  static buildMessages(message, history, context) {
    const safeHistory = Array.isArray(history) ? history.slice(-MAX_HISTORY_MESSAGES) : [];
    const conversation = safeHistory
      .filter((entry) => ['user', 'assistant'].includes(entry.role) && entry.content)
      .map((entry) => ({
        role: entry.role,
        content: String(entry.content).slice(0, 1200)
      }));

    return [
      {
        role: 'system',
        content: [
          'You are the SkillGap career agent inside a skill gap analyzer product.',
          'Help users understand their skills, target roles, learning priorities, resume gaps, and next actions.',
          'Use the provided user context when it is relevant.',
          'If the context is missing, ask for the missing detail or suggest uploading a resume.',
          'Be practical and concise. Prefer structured outputs and numbered steps when giving an action plan.',
          'Always end with one concrete next action the user can take in the app.',
          'When useful, suggest actions such as upload resume, compare roles, analyze a job description, create a learning plan, or improve resume bullets.',
          'Do not claim you changed account data, created analyses, or uploaded files.',
          'Do not provide legal, medical, or guaranteed employment advice.'
        ].join(' ')
      },
      {
        role: 'system',
        content: `User context JSON: ${JSON.stringify(context)}`
      },
      ...conversation,
      {
        role: 'user',
        content: String(message).slice(0, 3000)
      }
    ];
  }

  static async sendMessage(userId, message, history = []) {
    if (!message || !String(message).trim()) {
      throw new Error('Message is required');
    }

    if (!this.isEnabled()) {
      await pool.query(
        `INSERT INTO chat_messages (user_id, role, content, provider, model, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [userId, 'user', String(message).trim(), 'fallback', null]
      );

      const fallbackReply = 'The AI chat service is not configured yet. Add GROQ_API_KEY to the backend .env file, restart the server, then ask me about your skill gaps, resume, or target roles.';
      await pool.query(
        `INSERT INTO chat_messages (user_id, role, content, provider, model, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [userId, 'assistant', fallbackReply, 'fallback', null]
      );

      return {
        reply: fallbackReply,
        provider: 'fallback',
        model: null
      };
    }

    const context = await this.getUserContext(userId);
    const model = process.env.GROQ_MODEL || DEFAULT_MODEL;

    const response = await axios.post(
      GROQ_CHAT_COMPLETIONS_URL,
      {
        model,
        temperature: 0.3,
        max_completion_tokens: 900,
        messages: this.buildMessages(message, history, context)
      },
      {
        timeout: 25000,
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      throw new Error('AI service returned an empty response');
    }

    await pool.query(
      `INSERT INTO chat_messages (user_id, role, content, provider, model, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, 'user', String(message).trim(), 'groq', model]
    );

    await pool.query(
      `INSERT INTO chat_messages (user_id, role, content, provider, model, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, 'assistant', reply, 'groq', model]
    );

    return {
      reply,
      provider: 'groq',
      model
    };
  }
}

module.exports = ChatAgentService;
