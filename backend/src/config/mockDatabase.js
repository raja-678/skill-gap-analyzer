// In-memory database for development/testing
// This is a temporary solution - use PostgreSQL for production

class MockDatabase {
  constructor() {
    this.users = [];
    this.resumes = [];
    this.skills = [];
    this.analyses = [];
  }

  // User management
  async createUser(userData) {
    const user = {
      id: Date.now(),
      ...userData,
      createdAt: new Date()
    };
    this.users.push(user);
    return user;
  }

  async getUserByEmail(email) {
    return this.users.find(u => u.email === email);
  }

  async getUserById(id) {
    return this.users.find(u => u.id === parseInt(id));
  }

  async updateUser(id, data) {
    const user = this.users.find(u => u.id === parseInt(id));
    if (user) {
      Object.assign(user, data);
    }
    return user;
  }

  // Resume management
  async saveResume(resumeData) {
    const resume = {
      id: Date.now(),
      ...resumeData,
      createdAt: new Date()
    };
    this.resumes.push(resume);
    return resume;
  }

  async getResumes(userId) {
    return this.resumes.filter(r => r.userId === parseInt(userId));
  }

  async getResumeById(id) {
    return this.resumes.find(r => r.id === parseInt(id));
  }

  // Skill management
  async addUserSkill(userId, skillData) {
    const skill = {
      id: Date.now(),
      userId: parseInt(userId),
      ...skillData,
      createdAt: new Date()
    };
    this.skills.push(skill);
    return skill;
  }

  async getUserSkills(userId) {
    return this.skills.filter(s => s.userId === parseInt(userId));
  }

  // Analysis management
  async saveAnalysis(analysisData) {
    const analysis = {
      id: Date.now(),
      ...analysisData,
      createdAt: new Date()
    };
    this.analyses.push(analysis);
    return analysis;
  }

  async getAnalyses(userId) {
    return this.analyses.filter(a => a.userId === parseInt(userId));
  }

  // Generic query methods
  async query(sql, params) {
    // Mock query - just return empty result
    return { rows: [] };
  }

  async on(event, callback) {
    // Mock event listener
  }
}

// Export singleton instance
let db = null;

function getDatabase() {
  if (!db) {
    db = new MockDatabase();
    console.log('✅ Using in-memory database (development mode)');
    console.log('⚠️  Data will be lost when server restarts');
    console.log('📝 For production, set up PostgreSQL and update .env');
  }
  return db;
}

module.exports = {
  pool: getDatabase(),
  getDatabase
};
