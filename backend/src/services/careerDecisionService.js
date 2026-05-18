const {
  Skill,
  JobRole,
  JobRoleRequirement,
  UserSkill,
  Resume,
  JobDescriptionAnalysis
} = require('../models');
const SkillDemandService = require('./skillDemandService');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value) => Math.round(value * 10) / 10;
const normalize = (value) => String(value || '').toLowerCase();
const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class CareerDecisionService {
  static async getUserSkillMap(userId) {
    const userSkills = await UserSkill.find({ user_id: String(userId) }).lean();
    const skillIds = userSkills.map((skill) => skill.skill_id);
    const skills = await Skill.find({ id: { $in: skillIds } }).lean();
    const skillMap = new Map(skills.map((skill) => [String(skill.id), skill]));

    return new Map(userSkills.map((userSkill) => {
      const skill = skillMap.get(String(userSkill.skill_id));
      return [String(userSkill.skill_id), {
        id: userSkill.skill_id,
        name: skill?.name || userSkill.skill,
        category: skill?.category || 'General',
        proficiency: Number(userSkill.proficiency_level || userSkill.proficiency || 5)
      }];
    }));
  }

  static async getRoleProfiles() {
    const [roles, requirements, skills] = await Promise.all([
      JobRole.find().sort({ market_demand: -1 }).lean(),
      JobRoleRequirement.find().lean(),
      Skill.find().lean()
    ]);

    const skillMap = new Map(skills.map((skill) => [String(skill.id), skill]));
    const requirementsByRole = requirements.reduce((map, requirement) => {
      const key = String(requirement.job_role_id);
      if (!map.has(key)) map.set(key, []);
      const skill = skillMap.get(String(requirement.skill_id));
      map.get(key).push({
        skillId: requirement.skill_id,
        name: skill?.name || 'Unknown skill',
        category: skill?.category || 'General',
        requiredLevel: Number(requirement.proficiency_level || 5),
        importance: requirement.importance_level || 'required'
      });
      return map;
    }, new Map());

    return roles.map((role) => ({
      ...role,
      requirements: requirementsByRole.get(String(role.id)) || []
    }));
  }

  static scoreRole(role, userSkillMap) {
    const requirements = role.requirements || [];
    const totalWeight = requirements.reduce((sum, skill) => sum + skill.requiredLevel, 0) || 1;
    let matchedWeight = 0;
    let strongCount = 0;
    const missingSkills = [];
    const improvableSkills = [];
    const matchedSkills = [];

    requirements.forEach((requirement) => {
      const userSkill = userSkillMap.get(String(requirement.skillId));
      if (!userSkill) {
        missingSkills.push(requirement);
        return;
      }

      const ratio = clamp(userSkill.proficiency / requirement.requiredLevel, 0, 1);
      matchedWeight += ratio * requirement.requiredLevel;
      matchedSkills.push({
        name: requirement.name,
        userLevel: userSkill.proficiency,
        requiredLevel: requirement.requiredLevel,
        category: requirement.category
      });

      if (userSkill.proficiency >= requirement.requiredLevel) {
        strongCount += 1;
      } else {
        improvableSkills.push({
          ...requirement,
          userLevel: userSkill.proficiency,
          gap: requirement.requiredLevel - userSkill.proficiency
        });
      }
    });

    const skillMatch = round((matchedWeight / totalWeight) * 100);
    const effortDays = Math.ceil(
      missingSkills.reduce((sum, skill) => sum + skill.requiredLevel * 7, 0)
      + improvableSkills.reduce((sum, skill) => sum + skill.gap * 5, 0)
    );
    const effortScore = round(100 / (1 + effortDays / 21));
    const userCategories = new Set([...userSkillMap.values()]
      .filter((skill) => skill.proficiency >= 6)
      .map((skill) => skill.category));
    const experienceAlignment = userCategories.has(role.category)
      ? 85
      : clamp(35 + strongCount * 8, 25, 75);
    const marketDemand = Number(role.market_demand || 60);
    const careerScore = round(
      0.52 * skillMatch
      + 0.28 * effortScore
      + 0.12 * experienceAlignment
      + 0.08 * marketDemand
    );

    return {
      roleId: role.id,
      title: role.title,
      category: role.category,
      seniority: role.seniority_level,
      currentScore: skillMatch,
      careerScore,
      effortScore,
      experienceAlignment,
      marketDemand,
      marketDemandLabel: marketDemand >= 85 ? 'High' : marketDemand >= 65 ? 'Medium' : 'Emerging',
      effortDays,
      effortWeeks: Math.max(1, Math.ceil(effortDays / 7)),
      missingSkills: missingSkills.slice(0, 8),
      improvableSkills: improvableSkills.slice(0, 8),
      matchedSkills: matchedSkills.slice(0, 10),
      recommendation:
        skillMatch >= 75
          ? 'Apply-ready with minor polishing'
          : effortDays <= 42
            ? 'Fast upgrade path'
            : 'Longer-term target'
    };
  }

  static getWeaknesses(scoredRoles) {
    const focusRoles = scoredRoles.slice(0, 6);
    const weaknessMap = new Map();

    focusRoles.forEach((role) => {
      [...role.missingSkills, ...role.improvableSkills].forEach((skill) => {
        const key = skill.name;
        const existing = weaknessMap.get(key) || {
          name: skill.name,
          category: skill.category,
          severity: 0,
          roleCount: 0
        };
        existing.severity += skill.requiredLevel || skill.gap || 1;
        existing.roleCount += 1;
        weaknessMap.set(key, existing);
      });
    });

    return [...weaknessMap.values()]
      .sort((a, b) => (b.severity + b.roleCount * 2) - (a.severity + a.roleCount * 2))
      .slice(0, 2);
  }

  static buildTimeline(scoredRoles) {
    const fastest = scoredRoles
      .filter((role) => role.currentScore < 75)
      .sort((a, b) => a.effortDays - b.effortDays)[0];

    const ambitious = scoredRoles
      .filter((role) => role.careerScore >= 45)
      .sort((a, b) => b.marketDemand - a.marketDemand || b.careerScore - a.careerScore)[0];

    return [
      fastest && {
        period: '4-6 weeks',
        title: fastest.title,
        message: `Close ${fastest.missingSkills.length + fastest.improvableSkills.length} focused gaps to become competitive.`
      },
      ambitious && {
        period: '3 months',
        title: ambitious.title,
        message: `Build portfolio proof around ${ambitious.missingSkills[0]?.name || ambitious.improvableSkills[0]?.name || 'role-specific projects'}.`
      }
    ].filter(Boolean);
  }

  static async getCareerSnapshot(userId) {
    const [userSkillMap, roles, latestResume] = await Promise.all([
      this.getUserSkillMap(userId),
      this.getRoleProfiles(),
      Resume.findOne({ user_id: String(userId) }).sort({ created_at: -1 }).lean()
    ]);

    if (userSkillMap.size === 0) {
      return {
        hasProfile: false,
        message: 'Upload a resume or add skills to generate a career snapshot.',
        topRolesNow: [],
        fastUpgradeRoles: [],
        biggestWeaknesses: [],
        timeline: []
      };
    }

    const scoredRoles = roles
      .map((role) => this.scoreRole(role, userSkillMap))
      .sort((a, b) => b.careerScore - a.careerScore);

    const topRolesNow = [...scoredRoles]
      .filter((role) => role.currentScore >= 60)
      .sort((a, b) => b.currentScore - a.currentScore || b.marketDemand - a.marketDemand)
      .slice(0, 3);

    const fastUpgradeRoles = [...scoredRoles]
      .filter((role) => role.currentScore < 75 && role.effortDays <= 63)
      .sort((a, b) => a.effortDays - b.effortDays || b.careerScore - a.careerScore)
      .slice(0, 3);

    return {
      hasProfile: true,
      generatedFromResume: latestResume ? {
        id: latestResume.id,
        filename: latestResume.filename,
        uploadedAt: latestResume.created_at
      } : null,
      formula: 'careerScore = 0.52*skillMatch + 0.28*inverseLearningEffort + 0.12*experienceAlignment + 0.08*catalogMarketDemand',
      topRolesNow: topRolesNow.length ? topRolesNow : scoredRoles.slice(0, 3),
      fastUpgradeRoles,
      biggestWeaknesses: this.getWeaknesses(scoredRoles),
      timeline: this.buildTimeline(scoredRoles),
      allRoleScores: scoredRoles.slice(0, 12)
    };
  }

  static extractKnownSkillsFromText(text, skills) {
    const lower = normalize(text);
    return skills.filter((skill) => {
      const pattern = new RegExp(`\\b${escapeRegExp(normalize(skill.name))}\\b`, 'i');
      return pattern.test(lower);
    });
  }

  static async analyzeJobDescription(userId, jobDescription) {
    if (!jobDescription || String(jobDescription).trim().length < 40) {
      throw new Error('Paste a fuller job description to analyze');
    }

    const [skills, userSkillMap] = await Promise.all([
      Skill.find().lean(),
      this.getUserSkillMap(userId)
    ]);

    const extractedSkills = this.extractKnownSkillsFromText(jobDescription, skills);
    const extractedSkillIds = new Set(extractedSkills.map((skill) => String(skill.id)));
    const matchedSkills = extractedSkills
      .filter((skill) => userSkillMap.has(String(skill.id)))
      .map((skill) => ({
        name: skill.name,
        category: skill.category,
        proficiency: userSkillMap.get(String(skill.id)).proficiency
      }));
    const missingSkills = extractedSkills
      .filter((skill) => !userSkillMap.has(String(skill.id)))
      .map((skill) => ({
        name: skill.name,
        category: skill.category
      }));

    const matchPercentage = extractedSkillIds.size
      ? round((matchedSkills.length / extractedSkillIds.size) * 100)
      : 0;
    const atsScore = clamp(
      Math.round(matchPercentage * 0.7 + Math.min(30, extractedSkills.length * 2)),
      0,
      100
    );

    const result = {
      extractedSkills: extractedSkills.map((skill) => ({ id: skill.id, name: skill.name, category: skill.category })),
      matchedSkills,
      missingSkills,
      matchPercentage,
      atsScore,
      weaknessSummary: missingSkills.slice(0, 3).map((skill) => skill.name),
      nextActions: [
        missingSkills[0] && `Add evidence for ${missingSkills[0].name} or learn its basics.`,
        missingSkills[1] && `Build a small project using ${missingSkills[1].name}.`,
        matchedSkills.length && 'Move matched skills into the top half of your resume.'
      ].filter(Boolean)
    };

    // Track skill demand from extracted skills
    await SkillDemandService.trackSkillDemand(extractedSkills);

    await JobDescriptionAnalysis.create({
      user_id: String(userId),
      job_description: String(jobDescription).slice(0, 20000),
      extracted_skills: result.extractedSkills,
      matched_skills: matchedSkills,
      missing_skills: missingSkills,
      match_percentage: matchPercentage,
      ats_score: atsScore
    });

    return result;
  }
}

module.exports = CareerDecisionService;
