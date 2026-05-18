const pool = require('../config/database');
const LlmResumeAnalysisService = require('./llmResumeAnalysisService');

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeSkillName = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9+#.]+/g, '');

// Built-in aliases for common misspellings/variations
const builtInAliases = {
  js: 'javascript',
  node: 'nodejs',
  nodejs: 'nodejs',
  'node.js': 'nodejs',
  reactjs: 'react',
  postgres: 'postgresql',
  postgresql: 'postgresql',
  ml: 'machinelearning',
  ai: 'artificialintelligence',
  apis: 'api',
  restapi: 'api',
  restfulapi: 'api',
  powerbi: 'powerbi'
};

const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

class SkillExtractorService {
  static skillAliasesCache = null;
  static skillImplicationsCache = null;

  /**
   * Load and cache skill aliases from database
   */
  static async loadSkillAliases() {
    if (this.skillAliasesCache) {
      return this.skillAliasesCache;
    }

    try {
      const result = await pool.query(
        'SELECT skill_id, alias FROM skill_aliases'
      );

      const aliases = { ...builtInAliases };
      result.rows.forEach((row) => {
        const normalized = normalizeSkillName(row.alias);
        aliases[normalized] = row.skill_id;
      });

      this.skillAliasesCache = aliases;
      return aliases;
    } catch (error) {
      console.warn('Failed to load skill aliases, using built-in only:', error.message);
      return builtInAliases;
    }
  }

  /**
   * Load and cache skill implications
   */
  static async loadSkillImplications() {
    if (this.skillImplicationsCache) {
      return this.skillImplicationsCache;
    }

    try {
      const result = await pool.query(
        `SELECT source_skill_id, implied_skill_id, min_proficiency_threshold, implied_proficiency
         FROM skill_implications WHERE source_skill_id IS NOT NULL`
      );

      const implications = new Map();
      result.rows.forEach((row) => {
        if (!implications.has(row.source_skill_id)) {
          implications.set(row.source_skill_id, []);
        }
        implications.get(row.source_skill_id).push({
          skillId: row.implied_skill_id,
          minProficiency: row.min_proficiency_threshold,
          impliedProficiency: row.implied_proficiency
        });
      });

      this.skillImplicationsCache = implications;
      return implications;
    } catch (error) {
      console.warn('Failed to load skill implications:', error.message);
      return new Map();
    }
  }

  /**
   * Clear caches (useful after admin updates)
   */
  static clearCaches() {
    this.skillAliasesCache = null;
    this.skillImplicationsCache = null;
  }

  static buildSkillCatalogMap(allSkills) {
    const skillsByKey = new Map();
    allSkills.forEach((skill) => {
      skillsByKey.set(normalizeSkillName(skill.name), skill);
    });
    return skillsByKey;
  }

  /**
   * Track unmatched skills in emerging_skills table
   */
  static async trackEmergingSkill(skillName, category = null) {
    try {
      const normalized = normalizeSkillName(skillName);
      
      await pool.query(
        `INSERT INTO emerging_skills (raw_name, normalized_name, occurrence_count, suggested_category, last_occurrence, created_at, updated_at)
         VALUES ($1, $2, 1, $3, NOW(), NOW(), NOW())
         ON CONFLICT (normalized_name) DO UPDATE SET 
           occurrence_count = occurrence_count + 1,
           last_occurrence = NOW(),
           updated_at = NOW()`,
        [skillName, normalized, category]
      );
    } catch (error) {
      console.warn(`Failed to track emerging skill "${skillName}":`, error.message);
    }
  }

  /**
   * Extract skills from resume text with Groq first; keyword matching is fallback.
   */
  static async extractSkills(resumeText) {
    try {
      const skillsResult = await pool.query('SELECT id, name, category FROM skills');
      const allSkills = skillsResult.rows;
      const dbAliases = await this.loadSkillAliases();

      try {
        const llmSkills = await this.extractSkillsWithLlm(resumeText, allSkills, dbAliases);
        if (llmSkills.length > 0) {
          return llmSkills;
        }
      } catch (error) {
        console.warn('Groq skill extraction skipped:', error.response?.data?.error?.message || error.message);
      }

      return this.extractSkillsWithKeywords(resumeText, allSkills, dbAliases);
    } catch (error) {
      console.error('Error extracting skills:', error);
      throw error;
    }
  }

  static canonicalSkillKey(value, dbAliases) {
    const normalized = normalizeSkillName(value);
    return dbAliases[normalized] || normalized;
  }

  static async extractSkillsWithLlm(resumeText, allSkills, dbAliases) {
    const skillsByKey = this.buildSkillCatalogMap(allSkills);
    const llmAnalysis = await LlmResumeAnalysisService.analyzeResumeText(resumeText, allSkills);
    if (!llmAnalysis?.skills?.length) return [];

    const extracted = [];
    for (const llmSkill of llmAnalysis.skills) {
      const canonicalKey = this.canonicalSkillKey(llmSkill.name, dbAliases);
      const matchedSkill = skillsByKey.get(canonicalKey);

      if (!matchedSkill) {
        // Track unmatched skill as emerging
        await this.trackEmergingSkill(llmSkill.name, llmSkill.category || 'unclassified');
        continue;
      }

      const yearsExperienceSignal = this.calculateYearsExperienceSignal(llmSkill.yearsExperience, resumeText, matchedSkill.name);
      const senioritySignal = this.calculateSenioritySignal(resumeText, matchedSkill.name);
      const llmProficiency = clamp(llmSkill.proficiency, 1, 10, 5);
      const proficiency = Math.round(clamp(
        (llmProficiency * 0.5) + (yearsExperienceSignal * 0.3) + (senioritySignal * 0.2),
        1,
        10,
        5
      ));

      extracted.push({
        id: matchedSkill.id,
        name: matchedSkill.name,
        category: matchedSkill.category,
        confidence: clamp(llmSkill.confidence, 0, 1, 0.75),
        frequency: 1,
        source: 'groq',
        llmProficiency,
        yearsExperienceSignal,
        senioritySignal,
        computedProficiency: proficiency,
        evidence: llmSkill.evidence || null
      });
    }

    return Array.from(
      extracted.reduce((map, skill) => {
        const existing = map.get(skill.id);
        if (!existing || skill.confidence > existing.confidence) {
          map.set(skill.id, skill);
        }
        return map;
      }, new Map()).values()
    ).sort((a, b) => b.confidence - a.confidence);
  }

  static async extractSkillsWithKeywords(resumeText, allSkills, dbAliases) {
    const extractedSkills = [];
    const textLower = String(resumeText || '').toLowerCase();

    for (const skill of allSkills) {
      const skillNameLower = String(skill.name || '').toLowerCase();

      if (textLower.includes(skillNameLower)) {
        extractedSkills.push({
          id: skill.id,
          name: skill.name,
          category: skill.category,
          confidence: 0.9,
          frequency: (textLower.match(new RegExp(escapeRegExp(skillNameLower), 'g')) || []).length,
          source: 'keyword'
        });
      }
    }

    return Array.from(new Map(extractedSkills
      .sort((a, b) => (b.frequency * b.confidence) - (a.frequency * a.confidence))
      .map((skill) => [skill.id, skill])).values());
  }

  static calculateYearsExperienceSignal(yearsExperience, resumeText, skillName) {
    const directYears = clamp(yearsExperience, 0, 30, null);
    if (directYears !== null) {
      return clamp(3 + directYears * 1.4, 1, 10, 5);
    }

    const text = String(resumeText || '');
    const skillPattern = escapeRegExp(skillName);
    const nearbyYearsPattern = new RegExp(`(?:${skillPattern}.{0,80}(\\d+(?:\\.\\d+)?)\\+?\\s*(?:years|yrs)|(?:\\d+(?:\\.\\d+)?)\\+?\\s*(?:years|yrs).{0,80}${skillPattern})`, 'i');
    const match = text.match(nearbyYearsPattern);
    if (match) {
      const years = Number(match[1] || String(match[0]).match(/\d+(?:\.\d+)?/)?.[0]);
      if (Number.isFinite(years)) return clamp(3 + years * 1.4, 1, 10, 5);
    }

    return 5;
  }

  static calculateSenioritySignal(resumeText, skillName) {
    const textLower = String(resumeText || '').toLowerCase();
    const skillLower = String(skillName || '').toLowerCase();
    const hasSkill = textLower.includes(skillLower);

    const expertKeywords = ['expert', 'lead', 'architect', 'principal', 'staff', 'master'];
    const advancedKeywords = ['advanced', 'senior', 'proficient', 'extensive', 'owned', 'designed'];
    const intermediateKeywords = ['experienced', 'worked with', 'used', 'built', 'developed', 'implemented'];
    const beginnerKeywords = ['familiar', 'basic', 'introductory', 'learning'];

    if (hasSkill && expertKeywords.some((keyword) => textLower.includes(keyword))) return 9;
    if (hasSkill && advancedKeywords.some((keyword) => textLower.includes(keyword))) return 7;
    if (hasSkill && intermediateKeywords.some((keyword) => textLower.includes(keyword))) return 5;
    if (hasSkill && beginnerKeywords.some((keyword) => textLower.includes(keyword))) return 3;
    return 5;
  }

  /**
   * Regex fallback proficiency inference.
   */
  static async inferProficiency(resumeText, skillName) {
    return this.calculateSenioritySignal(resumeText, skillName);
  }

  static getExtractedProficiency(skill, resumeText) {
    if (Number.isFinite(skill.computedProficiency)) {
      return Math.round(clamp(skill.computedProficiency, 1, 10, 5));
    }

    if (Number.isFinite(skill.llmProficiency)) {
      const yearsExperienceSignal = clamp(skill.yearsExperienceSignal, 1, 10, 5);
      const senioritySignal = clamp(skill.senioritySignal, 1, 10, this.calculateSenioritySignal(resumeText, skill.name));
      return Math.round(clamp(
        (skill.llmProficiency * 0.5) + (yearsExperienceSignal * 0.3) + (senioritySignal * 0.2),
        1,
        10,
        5
      ));
    }

    return this.inferProficiency(resumeText, skill.name);
  }

  /**
   * Add skills to user profile from resume and apply implications
   */
  static async addSkillsToUser(userId, extractedSkills, resumeText) {
    try {
      const implications = await this.loadSkillImplications();
      const addedSkillIds = new Set();

      // First pass: add extracted skills
      for (const skill of extractedSkills.slice(0, 30)) {
        const proficiency = await this.getExtractedProficiency(skill, resumeText);

        await pool.query(
          `INSERT INTO user_skills (uuid, user_id, skill_id, proficiency_level, created_at, updated_at)
           VALUES (gen_random_uuid()::text, $1, $2, $3, NOW(), NOW())
           ON CONFLICT (user_id, skill_id) DO UPDATE SET proficiency_level = $3, updated_at = NOW()`,
          [userId, skill.id, proficiency]
        );

        addedSkillIds.add(skill.id);
      }

      // Second pass: apply skill implications
      for (const skillId of addedSkillIds) {
        const userSkillResult = await pool.query(
          'SELECT proficiency_level FROM user_skills WHERE user_id = $1 AND skill_id = $2',
          [userId, skillId]
        );

        if (userSkillResult.rows.length === 0) continue;

        const userProficiency = userSkillResult.rows[0].proficiency_level;
        const relatedImplications = implications.get(skillId) || [];

        for (const implication of relatedImplications) {
          // Only apply implications if proficiency meets threshold
          if (userProficiency >= implication.minProficiency && !addedSkillIds.has(implication.skillId)) {
            await pool.query(
              `INSERT INTO user_skills (uuid, user_id, skill_id, proficiency_level, created_at, updated_at)
               VALUES (gen_random_uuid()::text, $1, $2, $3, NOW(), NOW())
               ON CONFLICT (user_id, skill_id) DO UPDATE SET proficiency_level = GREATEST(proficiency_level, $3), updated_at = NOW()`,
              [userId, implication.skillId, implication.impliedProficiency]
            );
            addedSkillIds.add(implication.skillId);
          }
        }
      }

      return { success: true, skillsAdded: addedSkillIds.size };
    } catch (error) {
      console.error('Error adding skills to user:', error);
      throw error;
    }
  }

  /**
   * Detect hidden/implicit skills from experience
   */
  static async detectImplicitSkills(experience, education) {
    const implicitSkills = new Set();
    const roleSkillMapping = {
      developer: ['Python', 'JavaScript', 'Git', 'SQL', 'APIs'],
      designer: ['Figma', 'Adobe XD', 'UI Design', 'Prototyping', 'Creativity'],
      manager: ['Leadership', 'Communication', 'Strategy', 'Team Leadership', 'Decision Making'],
      analyst: ['Excel', 'SQL', 'Data Analysis', 'Analytics', 'Communication'],
      engineer: ['Linux', 'Docker', 'CI/CD', 'APIs', 'Databases'],
      marketer: ['SEO', 'Analytics', 'Content Marketing', 'Communication', 'Strategy']
    };

    experience.forEach((exp) => {
      const titleLower = String(exp.title || '').toLowerCase();
      Object.entries(roleSkillMapping).forEach(([role, skills]) => {
        if (titleLower.includes(role)) {
          skills.forEach((skill) => implicitSkills.add(skill));
        }
      });
    });

    return Array.from(implicitSkills);
  }
}

module.exports = SkillExtractorService;
