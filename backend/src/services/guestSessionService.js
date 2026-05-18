const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * Guest analysis service - stores and retrieves guest resume analyses
 */
class GuestSessionService {
  /**
   * Create a guest analysis session
   * @param {object} analysisData - Complete analysis data (snapshot, skills, gaps, etc.)
   * @param {number} expiresInHours - Session expiration time in hours (default 24)
   * @returns {Promise<object>} Session with token
   */
  static async createSession(analysisData, expiresInHours = 24) {
    try {
      // Generate secure session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

      const query = `
        INSERT INTO guest_sessions (id, session_token, analysis_data, expires_at)
        VALUES (gen_random_uuid(), $1, $2, $3)
        RETURNING id, session_token, analysis_data, created_at, expires_at
      `;

      const result = await pool.query(query, [sessionToken, analysisData, expiresAt]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating guest session:', error);
      throw error;
    }
  }

  /**
   * Retrieve guest session data
   * @param {string} sessionToken - Session token
   * @returns {Promise<object>} Session data if valid and not expired
   */
  static async getSession(sessionToken) {
    try {
      const query = `
        SELECT id, session_token, analysis_data, created_at, expires_at, claimed_by_user_id
        FROM guest_sessions
        WHERE session_token = $1 AND expires_at > NOW()
      `;

      const result = await pool.query(query, [sessionToken]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error retrieving guest session:', error);
      throw error;
    }
  }

  /**
   * Claim session for a user (after signup)
   * @param {string} sessionToken - Session token
   * @param {number} userId - User ID to claim session
   * @returns {Promise<object>} Updated session
   */
  static async claimSession(sessionToken, userId) {
    try {
      const query = `
        UPDATE guest_sessions
        SET claimed_by_user_id = $1, claimed_at = NOW()
        WHERE session_token = $2 AND expires_at > NOW() AND claimed_by_user_id IS NULL
        RETURNING id, session_token, analysis_data, claimed_at
      `;

      const result = await pool.query(query, [userId, sessionToken]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error claiming guest session:', error);
      throw error;
    }
  }

  /**
   * Cleanup expired sessions
   * @returns {Promise<number>} Number of deleted sessions
   */
  static async cleanupExpiredSessions() {
    try {
      const query = `
        DELETE FROM guest_sessions
        WHERE expires_at < NOW()
      `;

      const result = await pool.query(query);
      return result.rowCount;
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      throw error;
    }
  }

  /**
   * Delete session by token
   * @param {string} sessionToken - Session token
   * @returns {Promise<boolean>} Success status
   */
  static async deleteSession(sessionToken) {
    try {
      const query = `
        DELETE FROM guest_sessions
        WHERE session_token = $1
      `;

      const result = await pool.query(query, [sessionToken]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting guest session:', error);
      throw error;
    }
  }
}

module.exports = GuestSessionService;
