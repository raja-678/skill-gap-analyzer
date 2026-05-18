const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const sanitizeIdentifier = (value) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }
  return value;
};

const buildWhereClause = (query, values) => {
  const clauses = [];

  const buildCondition = (key, value) => {
    const column = sanitizeIdentifier(key);

    if (value === null) {
      return `${column} IS NULL`;
    }

    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        values.push(value);
        return `${column} = ANY($${values.length})`;
      }

      if (value.$in) {
        values.push(value.$in);
        return `${column} = ANY($${values.length})`;
      }
    }

    values.push(value);
    return `${column} = $${values.length}`;
  };

  Object.entries(query).forEach(([key, value]) => {
    if (key === '$or' && Array.isArray(value)) {
      const orClauses = value.map((item) => {
        const subClauses = Object.entries(item).map(([subKey, subValue]) => buildCondition(subKey, subValue));
        return `(${subClauses.join(' AND ')})`;
      });
      clauses.push(`(${orClauses.join(' OR ')})`);
      return;
    }

    clauses.push(buildCondition(key, value));
  });

  return clauses.length > 0 ? clauses.join(' AND ') : 'TRUE';
};

class SQLQuery {
  constructor(tableName, query = {}, singleRow = false) {
    this.tableName = sanitizeIdentifier(tableName);
    this.query = query;
    this.singleRow = singleRow;
    this.selectFields = null;
    this.sortFields = null;
    this.limitValue = null;
  }

  sort(sortObj) {
    if (sortObj && typeof sortObj === 'object') {
      this.sortFields = Object.entries(sortObj).map(([key, direction]) => {
        const col = sanitizeIdentifier(key);
        const dir = direction === -1 ? 'DESC' : 'ASC';
        return `${col} ${dir}`;
      });
    }
    return this;
  }

  limit(limit) {
    this.limitValue = Number(limit);
    return this;
  }

  select(fields) {
    if (typeof fields === 'string') {
      this.selectFields = fields
        .split(/\s+/)
        .filter(Boolean)
        .map((field) => sanitizeIdentifier(field));
    } else if (Array.isArray(fields)) {
      this.selectFields = fields.map((field) => sanitizeIdentifier(field));
    }
    return this;
  }

  lean() {
    return this;
  }

  async then(resolve, reject) {
    try {
      const result = await this.execute();
      return resolve ? resolve(result) : result;
    } catch (error) {
      return reject ? reject(error) : Promise.reject(error);
    }
  }

  async execute() {
    const values = [];
    const whereClause = buildWhereClause(this.query, values);
    const columns = this.selectFields ? this.selectFields.join(', ') : '*';
    const sortClause = this.sortFields ? ` ORDER BY ${this.sortFields.join(', ')}` : '';
    const limitClause = this.limitValue || this.singleRow ? ` LIMIT ${this.limitValue || 1}` : '';

    const queryText = `SELECT ${columns} FROM ${this.tableName} WHERE ${whereClause}${sortClause}${limitClause}`;
    const result = await pool.query(queryText, values);
    return this.singleRow ? result.rows[0] || null : result.rows;
  }
}

class SQLModel {
  static get tableName() {
    throw new Error('Table name must be defined');
  }

  static find(query = {}) {
    return new SQLQuery(this.tableName, query, false);
  }

  static findOne(query = {}) {
    return new SQLQuery(this.tableName, query, true);
  }

  static async create(data) {
    const columns = Object.keys(data).map(sanitizeIdentifier);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`);
    const queryText = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    const result = await pool.query(queryText, values);
    return result.rows[0];
  }

  static async insertMany(rows) {
    const inserted = [];
    for (const row of rows) {
      inserted.push(await this.create(row));
    }
    return inserted;
  }
}

class User extends SQLModel {
  static get tableName() {
    return 'users';
  }

  static find(query = {}) {
    // Add soft delete filter
    const filteredQuery = { ...query, deleted_at: null };
    return new SQLQuery(this.tableName, filteredQuery, false);
  }

  static findOne(query = {}) {
    // Add soft delete filter
    const filteredQuery = { ...query, deleted_at: null };
    return new SQLQuery(this.tableName, filteredQuery, true);
  }

  constructor(data = {}) {
    super();
    Object.assign(this, data);
  }

  static async findById(userId) {
    return this.findOne({ id: userId }).select('id uuid email username first_name last_name user_type bio profile_picture_url created_at updated_at');
  }

  static async findByIdAndUpdate(userId, update = {}) {
    const mapping = {
      firstName: 'first_name',
      lastName: 'last_name',
      username: 'username',
      email: 'email',
      userType: 'user_type',
      bio: 'bio',
      profilePictureUrl: 'profile_picture_url'
    };

    const setClauses = [];
    const values = [];

    if (update.profile?.userType) {
      setClauses.push(`user_type = $${values.length + 1}`);
      values.push(update.profile.userType);
    }

    Object.entries(update).forEach(([key, value]) => {
      if (mapping[key] && value !== undefined) {
        setClauses.push(`${mapping[key]} = $${values.length + 1}`);
        values.push(value);
      }
    });

    if (setClauses.length === 0) {
      return this.findById(userId);
    }

    setClauses.push(`updated_at = NOW()`);
    const queryText = `UPDATE ${this.tableName} SET ${setClauses.join(', ')} WHERE id = $${values.length + 1} RETURNING id, uuid, email, username, first_name, last_name, user_type, bio, profile_picture_url, created_at, updated_at`;
    values.push(userId);

    const result = await pool.query(queryText, values);
    return result.rows[0] || null;
  }

  async save() {
    const userUuid = this.uuid || uuidv4();
    const userType = this.user_type || this.profile?.userType || 'candidate';
    const queryText = `INSERT INTO ${this.constructor.tableName} (uuid, email, password_hash, username, first_name, last_name, user_type, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING id, uuid, email, username, first_name, last_name, user_type, bio, profile_picture_url, created_at, updated_at`;
    const result = await pool.query(queryText, [
      userUuid,
      this.email,
      this.password,
      this.username,
      this.firstName,
      this.lastName,
      userType
    ]);

    Object.assign(this, result.rows[0]);
    return this;
  }
}

class ChatMessage extends SQLModel {
  static get tableName() {
    return 'chat_messages';
  }
}

class Resume extends SQLModel {
  static get tableName() {
    return 'resumes';
  }

  static find(query = {}) {
    // Add soft delete filter
    const filteredQuery = { ...query, deleted_at: null };
    return new SQLQuery(this.tableName, filteredQuery, false);
  }

  static findOne(query = {}) {
    // Add soft delete filter
    const filteredQuery = { ...query, deleted_at: null };
    return new SQLQuery(this.tableName, filteredQuery, true);
  }
}

class UserSkill extends SQLModel {
  static get tableName() {
    return 'user_skills';
  }

  static find(query = {}) {
    // Add soft delete filter
    const filteredQuery = { ...query, deleted_at: null };
    return new SQLQuery(this.tableName, filteredQuery, false);
  }

  static findOne(query = {}) {
    // Add soft delete filter
    const filteredQuery = { ...query, deleted_at: null };
    return new SQLQuery(this.tableName, filteredQuery, true);
  }
}

class Skill extends SQLModel {
  static get tableName() {
    return 'skills';
  }
}

class JobRole extends SQLModel {
  static get tableName() {
    return 'job_roles';
  }
}

class JobRoleRequirement extends SQLModel {
  static get tableName() {
    return 'job_role_requirements';
  }
}

class JobDescriptionAnalysis extends SQLModel {
  static get tableName() {
    return 'job_description_analysis';
  }
}

module.exports = {
  User,
  Resume,
  UserSkill,
  Skill,
  JobRole,
  JobRoleRequirement,
  ChatMessage,
  JobDescriptionAnalysis
};
