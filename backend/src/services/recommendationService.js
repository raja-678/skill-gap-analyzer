const pool = require('../config/database');

class RecommendationService {
  /**
   * Generate personalized learning recommendations based on skill gaps
   */
  static async generateRecommendations(userId, jobRoleId) {
    try {
      // Get missing and improvable skills
      const analysisResult = await pool.query(
        `SELECT analysis_data FROM skill_gap_analysis 
         WHERE user_id = $1 AND job_role_id = $2 
         ORDER BY created_at DESC LIMIT 1`,
        [userId, jobRoleId]
      );

      if (analysisResult.rows.length === 0) {
        throw new Error('No skill gap analysis found');
      }

      const analysis = analysisResult.rows[0].analysis_data;
      const skillsToLearn = [...analysis.missingSkills, ...analysis.improvableSkills];

      const recommendations = [];

      for (const skill of skillsToLearn.slice(0, 10)) {
        // Find resources for this skill
        const resourcesResult = await pool.query(
          `SELECT id, uuid, title, description, url, resource_type, provider, difficulty_level, duration_hours, cost, rating
           FROM learning_resources
           WHERE skill_id = (SELECT id FROM skills WHERE name = $1)
           ORDER BY rating DESC, cost ASC
           LIMIT 5`,
          [skill.name]
        );

        if (resourcesResult.rows.length > 0) {
          recommendations.push({
            skill: skill.name,
            requiredLevel: skill.requiredLevel,
            resources: resourcesResult.rows,
            priority: skill.importance === 'required' ? 1 : 2
          });
        }
      }

      // Sort by priority
      recommendations.sort((a, b) => a.priority - b.priority);

      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  /**
   * Create a personalized learning path
   */
  static async createLearningPath(userId, jobRoleId, targetWeeks = 12) {
    try {
      // Check if path already exists
      const existingPath = await pool.query(
        'SELECT id FROM learning_paths WHERE user_id = $1 AND job_role_id = $2',
        [userId, jobRoleId]
      );

      if (existingPath.rows.length > 0) {
        return existingPath.rows[0];
      }

      // Create new learning path
      const { v4: uuidv4 } = require('uuid');
      const pathUuid = uuidv4();

      const result = await pool.query(
        `INSERT INTO learning_paths (uuid, user_id, job_role_id, target_proficiency, estimated_weeks, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'not_started', NOW(), NOW())
         RETURNING id, uuid, user_id, job_role_id, target_proficiency, estimated_weeks, status, progress_percentage`,
        [pathUuid, userId, jobRoleId, 8, targetWeeks]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating learning path:', error);
      throw error;
    }
  }

  /**
   * Get learning resources for a specific skill
   */
  static async getResourcesForSkill(skillName, difficulty = null) {
    try {
      let query = `
        SELECT id, uuid, title, description, url, resource_type, provider, difficulty_level, duration_hours, cost, rating
        FROM learning_resources
        WHERE skill_id = (SELECT id FROM skills WHERE name ILIKE $1)
      `;
      const params = [skillName];

      if (difficulty) {
        query += ` AND difficulty_level = $2`;
        params.push(difficulty);
      }

      query += ` ORDER BY rating DESC, cost ASC LIMIT 20`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting resources:', error);
      throw error;
    }
  }

  /**
   * Update user learning progress
   */
  static async updateLearningProgress(userId, resourceId, progressPercentage) {
    try {
      const { v4: uuidv4 } = require('uuid');
      const historyUuid = uuidv4();

      const result = await pool.query(
        `INSERT INTO user_learning_history (uuid, user_id, resource_id, progress_percentage, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CASE WHEN $4 >= 100 THEN 'completed' ELSE 'in_progress' END, NOW(), NOW())
         ON CONFLICT (user_id, resource_id) 
         DO UPDATE SET progress_percentage = $4, status = CASE WHEN $4 >= 100 THEN 'completed' ELSE 'in_progress' END, updated_at = NOW()
         RETURNING id, user_id, resource_id, progress_percentage, status`,
        [historyUuid, userId, resourceId, progressPercentage]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error updating learning progress:', error);
      throw error;
    }
  }

  /**
   * Get personalized learning dashboard data
   */
  static async getLearningDashboard(userId) {
    try {
      // Get active learning paths
      const pathsResult = await pool.query(
        `SELECT lp.*, jr.title as job_role_title
         FROM learning_paths lp
         JOIN job_roles jr ON lp.job_role_id = jr.id
         WHERE lp.user_id = $1 AND lp.status IN ('not_started', 'in_progress')
         ORDER BY lp.created_at DESC
         LIMIT 5`,
        [userId]
      );

      // Get recent learning progress
      const progressResult = await pool.query(
        `SELECT ulh.*, lr.title as resource_title, s.name as skill_name
         FROM user_learning_history ulh
         JOIN learning_resources lr ON ulh.resource_id = lr.id
         JOIN skills s ON lr.skill_id = s.id
         WHERE ulh.user_id = $1
         ORDER BY ulh.updated_at DESC
         LIMIT 10`,
        [userId]
      );

      // Get skill development summary
      const skillsResult = await pool.query(
        `SELECT s.name, us.proficiency_level, us.years_of_experience
         FROM user_skills us
         JOIN skills s ON us.skill_id = s.id
         WHERE us.user_id = $1
         ORDER BY us.proficiency_level DESC
         LIMIT 10`,
        [userId]
      );

      return {
        activePaths: pathsResult.rows,
        recentProgress: progressResult.rows,
        topSkills: skillsResult.rows
      };
    } catch (error) {
      console.error('Error getting learning dashboard:', error);
      throw error;
    }
  }

  /**
   * Suggest next skills to learn based on current skills
   */
  static async suggestNextSkills(userId) {
    try {
      // Get user's current skills
      const userSkillsResult = await pool.query(
        `SELECT skill_id FROM user_skills WHERE user_id = $1 AND proficiency_level >= 5`,
        [userId]
      );

      const userSkillIds = userSkillsResult.rows.map(row => row.skill_id);

      if (userSkillIds.length === 0) {
        return [];
      }

      // Find complementary skills
      const suggestedResult = await pool.query(
        `SELECT DISTINCT s.id, s.name, s.category, COUNT(*) as job_count
         FROM job_role_requirements jrr
         JOIN skills s ON jrr.skill_id = s.id
         WHERE jrr.skill_id NOT IN (${userSkillIds.join(',')})
         AND jrr.job_role_id IN (
           SELECT DISTINCT jrr2.job_role_id
           FROM job_role_requirements jrr2
           WHERE jrr2.skill_id = ANY($1)
         )
         GROUP BY s.id, s.name, s.category
         ORDER BY job_count DESC
         LIMIT 10`,
        [userSkillIds]
      );

      return suggestedResult.rows;
    } catch (error) {
      console.error('Error suggesting next skills:', error);
      throw error;
    }
  }
}

module.exports = RecommendationService;
