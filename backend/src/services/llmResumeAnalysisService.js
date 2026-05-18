const axios = require('axios');

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

const parseJsonObject = (value) => {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch (error) {
    const jsonMatch = value.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  }
};

const clampNumber = (value, min, max, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

class LlmResumeAnalysisService {
  static isEnabled() {
    return Boolean(process.env.GROQ_API_KEY);
  }

  static async analyzeResumeText(resumeText, knownSkills = []) {
    if (!this.isEnabled()) {
      return null;
    }

    const model = process.env.GROQ_MODEL || DEFAULT_MODEL;
    const trimmedText = String(resumeText || '').slice(0, 18000);
    const skillCatalog = knownSkills
      .map((skill) => skill.name)
      .filter(Boolean)
      .slice(0, 600)
      .join(', ');

    const response = await axios.post(
      GROQ_CHAT_COMPLETIONS_URL,
      {
        model,
        temperature: 0.0,
        max_completion_tokens: 1800,
        messages: [
          {
            role: 'system',
            content: [
              'You extract structured resume data for a skill gap analyzer.',
              'Return only valid JSON. Do not include markdown.',
              'Prefer skill names from the provided catalog when possible.',
              'Do not invent credentials or experience. Use null or [] when evidence is missing.'
            ].join(' ')
          },
          {
            role: 'user',
            content: JSON.stringify({
              task: 'Extract resume skills, proficiency, and concise evidence.',
              outputSchema: {
                skills: [
                  {
                    name: 'string',
                    category: 'technical | soft | domain | tool | language | other',
                    proficiency: 'integer 1-10',
                    yearsExperience: 'number 0-30 or null',
                    confidence: 'number 0-1',
                    evidence: 'short phrase copied or paraphrased from resume context'
                  }
                ],
                summary: 'one-sentence professional summary or null',
                experienceYears: 'number or null',
                roles: ['string'],
                certifications: ['string']
              },
              knownSkills: skillCatalog,
              resumeText: trimmedText
            })
          }
        ],
        response_format: { type: 'json_object' }
      },
      {
        timeout: 20000,
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    const parsed = parseJsonObject(content);
    if (!parsed || !Array.isArray(parsed.skills)) {
      return null;
    }

    return {
      skills: parsed.skills
        .filter((skill) => skill && skill.name)
        .slice(0, 50)
        .map((skill) => ({
          name: String(skill.name).trim(),
          category: skill.category ? String(skill.category).trim() : 'other',
          proficiency: clampNumber(skill.proficiency, 1, 10, 5),
          yearsExperience: clampNumber(skill.yearsExperience, 0, 30, null),
          confidence: clampNumber(skill.confidence, 0, 1, 0.7),
          evidence: skill.evidence ? String(skill.evidence).trim().slice(0, 240) : null
        })),
      summary: parsed.summary ? String(parsed.summary).trim().slice(0, 500) : null,
      experienceYears: parsed.experienceYears ?? null,
      roles: Array.isArray(parsed.roles) ? parsed.roles.slice(0, 10) : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications.slice(0, 10) : [],
      provider: 'groq',
      model
    };
  }
}

module.exports = LlmResumeAnalysisService;
