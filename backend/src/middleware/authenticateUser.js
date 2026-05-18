const AuthService = require('../services/authService');
const AUTH_COOKIE_NAME = 'auth_token';

const getRequestToken = (req) => {
  if (req.cookies?.[AUTH_COOKIE_NAME]) {
    return req.cookies[AUTH_COOKIE_NAME];
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
};

/**
 * Middleware to verify JWT token and attach user to request
 */
const authenticateUser = (req, res, next) => {
  try {
    const token = getRequestToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Missing or invalid authorization token' });
    }

    // Verify token
    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

module.exports = authenticateUser;
