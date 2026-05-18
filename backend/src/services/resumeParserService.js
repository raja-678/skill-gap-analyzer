const axios = require('axios');
const fs = require('fs');
const pdfParse = require('pdf-parse');

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

const asString = (value, maxLength = 500) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text.slice(0, maxLength) : null;
};

const asArray = (value, mapper, maxItems = 20) => (
  Array.isArray(value) ? value.slice(0, maxItems).map(mapper).filter(Boolean) : []
);

const clampNumber = (value, min, max, fallback = null) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const parseJsonObject = (value) => {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch (error) {
    const jsonMatch = String(value).match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  }
};

class ResumeParserService {
  static isGroqEnabled() {
    return Boolean(process.env.GROQ_API_KEY);
  }

  /**
   * Extract text from PDF resume
   */
  static async extractTextFromPDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract text from an uploaded PDF buffer
   */
  static async extractTextFromPDFBuffer(buffer) {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      console.error('Error parsing PDF buffer:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Parse resume text with Groq first; fallback to regex extraction if Groq fails.
   */
  static async parseResumeText(text) {
    try {
      const llmResume = await this.parseResumeTextWithGroq(text);
      if (llmResume) return llmResume;
    } catch (error) {
      console.warn('Groq resume parsing skipped:', error.response?.data?.error?.message || error.message);
    }

    return this.parseResumeTextWithRegex(text);
  }

  static async parseResumeTextWithGroq(text) {
    if (!this.isGroqEnabled()) return null;

    const response = await axios.post(
      GROQ_CHAT_COMPLETIONS_URL,
      {
        model: process.env.GROQ_MODEL || DEFAULT_MODEL,
        temperature: 0.0,
        max_completion_tokens: 2500,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              'You parse resumes into structured JSON for a career analysis product.',
              'Return only valid JSON. Do not include markdown.',
              'Do not invent information. Use null or [] if evidence is missing.',
              'Use this exact schema:',
              '{"name":string|null,"email":string|null,"phone":string|null,"linkedin":string|null,"github":string|null,"summary":string|null,"experience":[{"title":string|null,"company":string|null,"startDate":string|null,"endDate":string|null,"bullets":string[]}],"education":string[],"certifications":string[],"languages":string[],"totalYearsExperience":number|null}'
            ].join(' ')
          },
          {
            role: 'user',
            content: JSON.stringify({
              resumeText: String(text || '').slice(0, 20000)
            })
          }
        ]
      },
      {
        timeout: 25000,
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const parsed = parseJsonObject(response.data?.choices?.[0]?.message?.content);
    return this.sanitizeParsedResume(parsed, text, 'groq');
  }

  static sanitizeParsedResume(value, rawText, source) {
    if (!value || typeof value !== 'object') return null;

    return {
      name: asString(value.name, 100),
      email: asString(value.email, 255) || this.extractEmail(rawText),
      phone: asString(value.phone, 50) || this.extractPhone(rawText),
      linkedin: asString(value.linkedin, 255),
      github: asString(value.github, 255),
      summary: asString(value.summary, 700),
      experience: asArray(value.experience, (item) => {
        if (!item || typeof item !== 'object') return null;
        return {
          title: asString(item.title, 120),
          company: asString(item.company, 160),
          startDate: asString(item.startDate, 50),
          endDate: asString(item.endDate, 50),
          bullets: asArray(item.bullets, (bullet) => asString(bullet, 300), 12)
        };
      }, 25),
      education: asArray(value.education, (item) => asString(item, 250), 15),
      certifications: asArray(value.certifications, (item) => asString(item, 250), 20),
      languages: asArray(value.languages, (item) => asString(item, 80), 20),
      totalYearsExperience: clampNumber(value.totalYearsExperience, 0, 60, null),
      rawText,
      parseSource: source
    };
  }

  static parseResumeTextWithRegex(text) {
    return {
      email: this.extractEmail(text),
      phone: this.extractPhone(text),
      name: this.extractName(text),
      linkedin: this.extractLinkedIn(text),
      github: this.extractGitHub(text),
      summary: this.extractSummary(text),
      experience: this.extractExperience(text),
      education: this.extractEducation(text),
      certifications: this.extractCertifications(text),
      languages: this.extractLanguages(text),
      totalYearsExperience: null,
      rawText: text,
      parseSource: 'regex'
    };
  }

  /**
   * Extract email from resume
   */
  static extractEmail(text) {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
    const match = String(text || '').match(emailRegex);
    return match ? match[1] : null;
  }

  /**
   * Extract phone number
   */
  static extractPhone(text) {
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/;
    const match = String(text || '').match(phoneRegex);
    return match ? match[0] : null;
  }

  static extractLinkedIn(text) {
    const match = String(text || '').match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+|linkedin\.com\/[^\s)]+/i);
    return match ? match[0] : null;
  }

  static extractGitHub(text) {
    const match = String(text || '').match(/https?:\/\/(?:www\.)?github\.com\/[^\s)]+|github\.com\/[^\s)]+/i);
    return match ? match[0] : null;
  }

  /**
   * Extract name (usually first 1-2 lines)
   */
  static extractName(text) {
    const lines = String(text || '').split('\n').filter(line => line.trim());
    return lines[0] ? lines[0].trim().substring(0, 100) : null;
  }

  /**
   * Extract professional summary
   */
  static extractSummary(text) {
    const summaryKeywords = ['summary', 'objective', 'about', 'professional profile'];
    const lines = String(text || '').split('\n');
    let summaryText = '';
    let foundSummary = false;

    for (let line of lines) {
      if (summaryKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
        foundSummary = true;
        continue;
      }
      if (foundSummary) {
        if (line.match(/^[A-Z\s]+$/)) break;
        summaryText += line + ' ';
      }
    }

    return summaryText.trim().substring(0, 500) || null;
  }

  /**
   * Extract work experience
   */
  static extractExperience(text) {
    const experiences = [];
    const experienceSection = String(text || '').split(/experience|employment history|work history/i)[1] || '';
    const jobPattern = /([A-Za-z\s]+?)\s*(?:at|@)\s*([A-Za-z\s.&,]+?)\s*\|?\s*(\d{4})?[-–]*(\d{4})?/g;
    let match;

    while ((match = jobPattern.exec(experienceSection)) !== null) {
      experiences.push({
        title: match[1]?.trim() || null,
        company: match[2]?.trim() || null,
        startDate: match[3] || null,
        endDate: match[4] || null,
        bullets: []
      });
    }

    return experiences;
  }

  /**
   * Extract education
   */
  static extractEducation(text) {
    const education = [];
    const educationKeywords = ['bachelor', 'master', 'phd', 'diploma', 'degree', 'b.s', 'b.a', 'm.s', 'm.a'];
    const educationSection = String(text || '').split(/education|academic/i)[1] || '';
    const lines = educationSection.split('\n').slice(0, 10);

    lines.forEach(line => {
      if (educationKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
        education.push(line.trim());
      }
    });

    return education;
  }

  /**
   * Extract certifications
   */
  static extractCertifications(text) {
    const certs = [];
    const certSection = String(text || '').split(/certification|certifications|credentials/i)[1] || '';
    const lines = certSection.split('\n').filter(line => line.trim());
    certs.push(...lines.slice(0, 5).map((line) => line.trim()));
    return certs;
  }

  /**
   * Extract languages
   */
  static extractLanguages(text) {
    const languages = ['English', 'Spanish', 'French', 'German', 'Mandarin', 'Arabic', 'Portuguese', 'Russian', 'Japanese', 'Korean', 'Hindi', 'Bengali'];
    const found = [];
    const lower = String(text || '').toLowerCase();

    languages.forEach(lang => {
      if (lower.includes(lang.toLowerCase())) {
        found.push(lang);
      }
    });

    return found;
  }
}

module.exports = ResumeParserService;
