const { Pool } = require('pg');
require('dotenv').config();

/**
 * Create PostgreSQL connection pool for Supabase
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase
  }
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
});

/**
 * Connect to database and verify connection
 */
const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to Supabase PostgreSQL');

    const result = await client.query('SELECT NOW()');
    console.log('✅ Database query successful:', result.rows[0]);

    client.release();
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
};

/**
 * Soft delete helper - sets deleted_at instead of hard delete
 * Verifies ownership before deleting
 * @param {string} table - Table name (e.g., 'resumes', 'user_skills')
 * @param {number} id - Record ID to soft delete
 * @param {string} ownerCol - Owner column name (e.g., 'user_id')
 * @param {number} userId - User ID to verify ownership
 * @returns {Promise<object>} Updated record with deleted_at set
 * @throws {Error} If record not found or ownership mismatch
 */
const softDelete = async (table, id, ownerCol, userId) => {
  try {
    // Verify ownership before deleting
    const verifyQuery = `
      SELECT id FROM ${table} 
      WHERE id = $1 AND ${ownerCol} = $2 AND deleted_at IS NULL
    `;
    const verifyResult = await pool.query(verifyQuery, [id, userId]);
    
    if (verifyResult.rows.length === 0) {
      throw new Error(`${table} record not found or already deleted`);
    }

    // Soft delete
    const deleteQuery = `
      UPDATE ${table}
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(deleteQuery, [id]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

module.exports = pool;
module.exports.connectDB = connectDB;
module.exports.softDelete = softDelete;
