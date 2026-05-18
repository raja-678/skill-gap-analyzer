const pool = require('../config/database');
const SkillDemandService = require('./skillDemandService');

class SkillGapAnalysisService {
  /**
   * Analyze skill gap between user skills and job requirements
   * Applies demand multipliers to prioritize trending missing skills
   */
  static async analyzeSkillGap(userId, jobRoleId, resumeId = null) {
    try {
      // Get user skills
      const userSkillsResult = await pool.query(
        `SELECT s.id, s.name, us.proficiency_level, s.category
         FROM user_skills us
         JOIN skills s ON us.skill_id = s.id
         WHERE us.user_id = $1`,
        [userId]
      );
      const userSkills = userSkillsResult.rows;

      // Get job role requirements
      const jobRequirementsResult = await pool.query(
        `SELECT s.id, s.name, jrr.proficiency_level as required_level, jrr.importance_level, s.category
         FROM job_role_requirements jrr
         JOIN skills s ON jrr.skill_id = s.id
         WHERE jrr.job_role_id = $1`,
        [jobRoleId]
      );
      const requiredSkills = jobRequirementsResult.rows;

      // Calculate gap analysis
      const skillMap = new Map(userSkills.map(s => [s.id, s]));

      const analysis = {
        skillsPossessed: 0,
        skillsMissing: 0,
        skillsStrong: 0,
        matchedSkills: [],
        missingSkills: [],
        strongSkills: [],
        improvableSkills: []
      };

      // Analyze each required skill
      requiredSkills.forEach(requiredSkill => {
        const userSkill = skillMap.get(requiredSkill.id);

        if (userSkill) {
          analysis.skillsPossessed++;

          if (userSkill.proficiency_level >= requiredSkill.required_level) {
            analysis.skillsStrong++;
            analysis.strongSkills.push(requiredSkill.name);
          } else {
            analysis.improvableSkills.push({
              name: requiredSkill.name,
              userLevel: userSkill.proficiency_level,
              requiredLevel: requiredSkill.required_level,
              gap: requiredSkill.required_level - userSkill.proficiency_level
            });
          }

          analysis.matchedSkills.push({
            name: requiredSkill.name,
            userLevel: userSkill.proficiency_level,
            requiredLevel: requiredSkill.required_level,
            importance: requiredSkill.importance_level
          });
        } else {
          if (requiredSkill.importance_level === 'required') {
            analysis.skillsMissing++;
            analysis.missingSkills.push({
              id: requiredSkill.id,
              name: requiredSkill.name,
              requiredLevel: requiredSkill.required_level,
              importance: requiredSkill.importance_level,
              isTrending: false // Will be updated below
            });
          }
        }
      });

      // Apply demand multipliers to missing skills
      for (const missingSkill of analysis.missingSkills) {
        const multiplier = await SkillDemandService.getDemandMultiplier(missingSkill.id);
        missingSkill.demandMultiplier = multiplier;
        missingSkill.isTrending = multiplier >= 1.1; // Mark as trending if multiplier is 1.1x
      }

      // Sort missing skills by demand (trending first)
      analysis.missingSkills.sort((a, b) => {
        if (b.isTrending !== a.isTrending) {
          return b.isTrending ? 1 : -1; // Trending skills first
        }
        return (b.demandMultiplier || 1) - (a.demandMultiplier || 1);
      });

      // Calculate match percentage
      const totalRequiredSkills = requiredSkills.length;
      const matchPercentage = (analysis.skillsPossessed / totalRequiredSkills) * 100;

      // Estimate learning time (with demand multiplier adjustment)
      const baseLearningTime = this.estimateLearningTime(analysis.missingSkills, analysis.improvableSkills);
      const learningTimeWithDemand = this.adjustLearningTimeByDemand(baseLearningTime, analysis.missingSkills);

      const result = {
        jobRoleId,
        userId,
        resumeId,
        matchPercentage: parseFloat(matchPercentage.toFixed(2)),
        skillsPossessed: analysis.skillsPossessed,
        skillsMissing: analysis.skillsMissing,
        skillsStrong: analysis.skillsStrong,
        estimatedLearningTimeDays: learningTimeWithDemand,
        trendingMissingSkillsCount: analysis.missingSkills.filter(s => s.isTrending).length,
        analysis: {
          matchedSkills: analysis.matchedSkills,
          missingSkills: analysis.missingSkills.map(s => ({
            name: s.name,
            requiredLevel: s.requiredLevel,
            importance: s.importance,
            isTrending: s.isTrending,
            demandMultiplier: s.demandMultiplier
          })),
          strongSkills: analysis.strongSkills,
          improvableSkills: analysis.improvableSkills,
          readiness: this.calculateReadiness(matchPercentage)
        }
      };

      // Save analysis to database
      await pool.query(
        `INSERT INTO skill_gap_analysis 
         (user_id, job_role_id, resume_id, match_percentage, skills_possessed, skills_missing, skills_strong, estimated_learning_time_days, analysis_data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [
          userId,
          jobRoleId,
          resumeId,
          result.matchPercentage,
          analysis.skillsPossessed,
          analysis.skillsMissing,
          analysis.skillsStrong,
          learningTimeWithDemand,
          JSON.stringify(result.analysis)
        ]
      );

      await this.saveReadinessSnapshot(
        userId,
        jobRoleId,
        result.matchPercentage,
        analysis.skillsPossessed,
        analysis.skillsMissing
      );

      return result;
    } catch (error) {
      console.error('Error analyzing skill gap:', error);
      throw error;
    }
  }

  /**
   * Adjust learning time based on skill demand multipliers
   * Trending skills get prioritized (shorter estimated time)
   */
  static adjustLearningTimeByDemand(baseLearningTime, missingSkills) {
    const trendingCount = missingSkills.filter(s => s.isTrending).length;
    
    if (trendingCount === 0) {
      return baseLearningTime;
    }

    // Reduce estimated time by 10-15% for trending skills (more critical, better resources available)
    const trendingFraction = trendingCount / Math.max(1, missingSkills.length);
    const reductionFactor = 1 - (trendingFraction * 0.12); // 12% max reduction
    
    return Math.ceil(baseLearningTime * reductionFactor);
  }

  /**
   * Estimate learning time to acquire missing skills
   */
  static estimateLearningTime(missingSkills, improvableSkills) {
    // Average: 2-3 weeks per missing skill at intermediate level
    // Average: 1 week per proficiency level improvement
    
    let totalDays = 0;

    missingSkills.forEach(skill => {
      totalDays += skill.requiredLevel * 7; // 7 days per proficiency level
    });

    improvableSkills.forEach(skill => {
      totalDays += skill.gap * 5; // 5 days per proficiency level to improve
    });

    return Math.ceil(totalDays);
  }

  /**
   * Calculate readiness level
   */
  static calculateReadiness(matchPercentage) {
    if (matchPercentage >= 90) return 'Excellent fit - Apply now!';
    if (matchPercentage >= 75) return 'Good fit - Minor skill gaps';
    if (matchPercentage >= 60) return 'Moderate fit - Some skills to learn';
    if (matchPercentage >= 40) return 'Fair fit - Significant learning needed';
    return 'Not ready - Requires substantial training';
  }

  static async saveReadinessSnapshot(userId, jobRoleId, matchPercentage, skillsPossessed, skillsMissing) {
    try {
      await pool.query(
        `INSERT INTO readiness_snapshots 
         (user_id, job_role_id, match_percentage, skills_possessed, skills_missing, snapshot_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, NOW(), NOW())
         ON CONFLICT (user_id, job_role_id, snapshot_date)
         DO UPDATE SET
           match_percentage = EXCLUDED.match_percentage,
           skills_possessed = EXCLUDED.skills_possessed,
           skills_missing = EXCLUDED.skills_missing,
           updated_at = NOW()`,
        [userId, jobRoleId, matchPercentage, skillsPossessed, skillsMissing]
      );
    } catch (error) {
      console.error('Error saving readiness snapshot:', error);
      throw error;
    }
  }

  /**
   * Get multiple role comparisons for a user
   */
  static async compareMultipleRoles(userId, jobRoleIds = []) {
    try {
      let rolesQuery = `SELECT id FROM job_roles`;
      let params = [];

      if (jobRoleIds.length > 0) {
        rolesQuery += ` WHERE id = ANY($1)`;
        params = [jobRoleIds];
      } else {
        rolesQuery += ` LIMIT 10`; // Get top 10 roles if not specified
      }

      const rolesResult = await pool.query(rolesQuery, params);
      const roles = rolesResult.rows;

      const comparisons = [];

      for (const role of roles) {
        const analysis = await this.analyzeSkillGap(userId, role.id);
        comparisons.push(analysis);
      }

      // Sort by match percentage (descending)
      comparisons.sort((a, b) => b.matchPercentage - a.matchPercentage);

      return comparisons;
    } catch (error) {
      console.error('Error comparing roles:', error);
      throw error;
    }
  }

  /**
   * Find adjacent/similar roles user might be ready for
   */
  static async findAdjacentRoles(userId) {
    try {
      // Get user's strongest skills
      const userSkillsResult = await pool.query(
        `SELECT s.id, s.name, us.proficiency_level
         FROM user_skills us
         JOIN skills s ON us.skill_id = s.id
         WHERE us.user_id = $1 AND us.proficiency_level >= 7
         ORDER BY us.proficiency_level DESC
         LIMIT 5`,
        [userId]
      );

      if (userSkillsResult.rows.length === 0) {
        return [];
      }

      const strongSkillIds = userSkillsResult.rows.map(s => s.id);

      // Find roles that require these skills
      const rolesResult = await pool.query(
        `SELECT DISTINCT jr.id, jr.title
         FROM job_roles jr
         JOIN job_role_requirements jrr ON jr.id = jrr.job_role_id
         WHERE jrr.skill_id = ANY($1)
         LIMIT 10`,
        [strongSkillIds]
      );

      const adjacentRoles = [];
      for (const role of rolesResult.rows) {
        const analysis = await this.analyzeSkillGap(userId, role.id);
        if (analysis.matchPercentage >= 70) {
          adjacentRoles.push(analysis);
        }
      }

      return adjacentRoles.sort((a, b) => b.matchPercentage - a.matchPercentage);
    } catch (error) {
      console.error('Error finding adjacent roles:', error);
      throw error;
    }
  }
}

module.exports = SkillGapAnalysisService;
