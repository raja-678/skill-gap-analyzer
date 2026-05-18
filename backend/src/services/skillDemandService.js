const pool = require('../config/database');

class SkillDemandService {
  static trendingCache = null;
  static trendingCacheTime = null;
  static CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Track skill demand from job description analysis
   */
  static async trackSkillDemand(extractedSkills, jobRoleId = null) {
    try {
      if (!extractedSkills || extractedSkills.length === 0) {
        return { success: true, tracked: 0 };
      }

      let tracked = 0;

      for (const skill of extractedSkills) {
        try {
          await pool.query(
            `INSERT INTO skill_demand_signals (skill_id, signal_date, occurrence_count, job_role_id, created_at, updated_at)
             VALUES ($1, CURRENT_DATE, 1, $2, NOW(), NOW())
             ON CONFLICT (skill_id, signal_date, job_role_id) DO UPDATE SET
               occurrence_count = occurrence_count + 1,
               updated_at = NOW()`,
            [skill.id, jobRoleId]
          );

          tracked++;
        } catch (error) {
          console.warn(`Failed to track demand for skill ${skill.id}:`, error.message);
        }
      }

      // Invalidate trending cache when demand is tracked
      this.trendingCache = null;
      this.trendingCacheTime = null;

      return { success: true, tracked };
    } catch (error) {
      console.error('Error tracking skill demand:', error);
      throw error;
    }
  }

  /**
   * Get top trending skills by demand in last 30 days
   * Returns top 20 skills, cached for 1 hour
   */
  static async getTrendingSkills(limit = 20) {
    try {
      // Check cache
      if (this.trendingCache && this.trendingCacheTime) {
        const cacheAge = Date.now() - this.trendingCacheTime;
        if (cacheAge < this.CACHE_DURATION_MS) {
          return this.trendingCache;
        }
      }

      // Query trending skills
      const result = await pool.query(
        `SELECT 
           s.id,
           s.uuid,
           s.name,
           s.category,
           s.industry_demand,
           SUM(sds.occurrence_count) as total_demand,
           COUNT(DISTINCT sds.signal_date) as days_mentioned,
           MAX(sds.signal_date) as last_mentioned,
           ROUND(
             SUM(sds.occurrence_count)::numeric / 
             NULLIF(COUNT(DISTINCT sds.signal_date), 0),
             2
           )::float as avg_daily_demand
         FROM skill_demand_signals sds
         JOIN skills s ON sds.skill_id = s.id
         WHERE sds.signal_date >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY s.id, s.uuid, s.name, s.category, s.industry_demand
         ORDER BY total_demand DESC, days_mentioned DESC
         LIMIT $1`,
        [limit]
      );

      const data = {
        success: true,
        skills: result.rows,
        count: result.rows.length,
        cachedAt: new Date().toISOString(),
        cacheExpiresAt: new Date(Date.now() + this.CACHE_DURATION_MS).toISOString()
      };

      // Cache the result
      this.trendingCache = data;
      this.trendingCacheTime = Date.now();

      return data;
    } catch (error) {
      console.error('Error getting trending skills:', error);
      throw error;
    }
  }

  /**
   * Get trending skills by category for last 30 days
   */
  static async getTrendingByCategory(category) {
    try {
      const result = await pool.query(
        `SELECT 
           s.id,
           s.uuid,
           s.name,
           s.category,
           SUM(sds.occurrence_count) as total_demand,
           COUNT(DISTINCT sds.signal_date) as days_mentioned,
           MAX(sds.signal_date) as last_mentioned
         FROM skill_demand_signals sds
         JOIN skills s ON sds.skill_id = s.id
         WHERE sds.signal_date >= CURRENT_DATE - INTERVAL '30 days'
           AND s.category = $1
         GROUP BY s.id, s.uuid, s.name, s.category
         ORDER BY total_demand DESC
         LIMIT 20`,
        [category]
      );

      return {
        success: true,
        category,
        skills: result.rows,
        count: result.rows.length
      };
    } catch (error) {
      console.error('Error getting trending skills by category:', error);
      throw error;
    }
  }

  /**
   * Get demand multiplier (0.8-1.2) for a skill
   * Skills in top 20% trending get 1.1x multiplier
   * Skills not in top 20% get 0.9x multiplier
   * Used to adjust learning priority recommendations
   */
  static async getDemandMultiplier(skillId) {
    try {
      // Get total demand for this skill in last 30 days
      const skillResult = await pool.query(
        `SELECT SUM(occurrence_count) as skill_demand
         FROM skill_demand_signals
         WHERE skill_id = $1 AND signal_date >= CURRENT_DATE - INTERVAL '30 days'`,
        [skillId]
      );

      const skillDemand = skillResult.rows[0]?.skill_demand || 0;

      // Get 80th percentile demand threshold (top 20%)
      const percentileResult = await pool.query(
        `SELECT PERCENTILE_CONT(0.8) WITHIN GROUP (ORDER BY total_demand) as threshold
         FROM (
           SELECT SUM(occurrence_count) as total_demand
           FROM skill_demand_signals
           WHERE signal_date >= CURRENT_DATE - INTERVAL '30 days'
           GROUP BY skill_id
         ) sq`
      );

      const threshold = percentileResult.rows[0]?.threshold || 0;

      // Return multiplier based on whether skill is in top 20%
      if (skillDemand >= threshold && threshold > 0) {
        return 1.1; // Top 20% - high demand multiplier
      }

      return 0.9; // Lower demand multiplier
    } catch (error) {
      console.error('Error calculating demand multiplier:', error);
      return 1.0; // Default to neutral multiplier on error
    }
  }

  /**
   * Get demand trends for a skill over last 30 days
   * Shows daily demand data for visualization
   */
  static async getSkillDemandTrend(skillId) {
    try {
      const result = await pool.query(
        `SELECT 
           signal_date,
           SUM(occurrence_count) as daily_demand
         FROM skill_demand_signals
         WHERE skill_id = $1 AND signal_date >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY signal_date
         ORDER BY signal_date ASC`,
        [skillId]
      );

      const skillResult = await pool.query(
        'SELECT id, name, category FROM skills WHERE id = $1',
        [skillId]
      );

      if (skillResult.rows.length === 0) {
        return { success: false, error: 'Skill not found' };
      }

      const skill = skillResult.rows[0];

      return {
        success: true,
        skill,
        trend: result.rows,
        dataPoints: result.rows.length,
        totalDemand: result.rows.reduce((sum, row) => sum + row.daily_demand, 0)
      };
    } catch (error) {
      console.error('Error getting skill demand trend:', error);
      throw error;
    }
  }

  /**
   * Clear trending cache manually (called after promotions, etc.)
   */
  static clearCache() {
    this.trendingCache = null;
    this.trendingCacheTime = null;
  }
}

module.exports = SkillDemandService;
