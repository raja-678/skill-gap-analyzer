const pool = require('../config/database');

class AuditService {
  /**
   * Log an action to audit_logs table
   * @param {number} userId - User ID performing the action
   * @param {string} action - Action name (e.g., 'user.register', 'resume.upload', 'user.delete')
   * @param {string} entityType - Type of entity (e.g., 'user', 'resume', 'skill')
   * @param {string|number} entityId - ID of the affected entity
   * @param {object} metadata - Additional data (JSON object)
   * @param {string} ipAddress - IP address of the requester
   * @returns {Promise<object>} The created audit log
   */
  static async log(userId, action, entityType = null, entityId = null, metadata = {}, ipAddress = null) {
    try {
      const query = `
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, user_id, action, entity_type, entity_id, metadata, ip_address, created_at
      `;

      const values = [userId, action, entityType, entityId?.toString(), metadata, ipAddress];
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error logging audit event:', error);
      // Don't throw - audit failures should not block operations
      return null;
    }
  }

  /**
   * Get audit logs for a user
   * @param {number} userId - User ID to get logs for
   * @param {number} limit - Number of logs to return (default 100)
   * @param {number} offset - Pagination offset (default 0)
   * @returns {Promise<array>} Array of audit logs
   */
  static async getUserLogs(userId, limit = 100, offset = 0) {
    try {
      const query = `
        SELECT id, user_id, action, entity_type, entity_id, metadata, ip_address, created_at
        FROM audit_logs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await pool.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching user audit logs:', error);
      return [];
    }
  }

  /**
   * Get all audit logs for a specific entity
   * @param {string} entityType - Type of entity
   * @param {string|number} entityId - ID of entity
   * @returns {Promise<array>} Array of audit logs
   */
  static async getEntityLogs(entityType, entityId) {
    try {
      const query = `
        SELECT id, user_id, action, entity_type, entity_id, metadata, ip_address, created_at
        FROM audit_logs
        WHERE entity_type = $1 AND entity_id = $2
        ORDER BY created_at DESC
      `;

      const result = await pool.query(query, [entityType, entityId?.toString()]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching entity audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit logs by action type
   * @param {string} action - Action name
   * @param {number} limit - Number of logs to return
   * @returns {Promise<array>} Array of audit logs
   */
  static async getLogsByAction(action, limit = 100) {
    try {
      const query = `
        SELECT id, user_id, action, entity_type, entity_id, metadata, ip_address, created_at
        FROM audit_logs
        WHERE action = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await pool.query(query, [action, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching logs by action:', error);
      return [];
    }
  }

  /**
   * Get recent audit logs (admin endpoint)
   * @param {number} limit - Number of logs to return
   * @returns {Promise<array>} Array of recent audit logs
   */
  static async getRecentLogs(limit = 100) {
    try {
      const query = `
        SELECT id, user_id, action, entity_type, entity_id, metadata, ip_address, created_at
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT $1
      `;

      const result = await pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching recent logs:', error);
      return [];
    }
  }
}

module.exports = AuditService;
