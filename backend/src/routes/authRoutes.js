const express = require('express');
const AuthService = require('../services/authService');
const AuditService = require('../services/auditService');
const { registerSchema, loginSchema, validate } = require('../validators');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const axios = require('axios');
const pool = require('../config/database');

const router = express.Router();

// Configure GitHub passport strategy (no sessions)
try {
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL;

  if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET && GITHUB_CALLBACK_URL) {
    passport.use(new GitHubStrategy({
      clientID: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      callbackURL: GITHUB_CALLBACK_URL,
      passReqToCallback: true
    }, (req, accessToken, refreshToken, profile, done) => {
      // attach accessToken for later use
      return done(null, { profile, accessToken });
    }));
  } else {
    console.warn('GitHub OAuth not configured (missing env vars)');
  }
} catch (e) {
  console.warn('Failed to configure GitHub strategy:', e.message || e);
}
const AUTH_COOKIE_NAME = 'auth_token';
const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const setAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: AUTH_COOKIE_MAX_AGE
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
  });
};

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

const publicUserResponse = (user) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  firstName: user.firstName,
  lastName: user.lastName
});

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               username:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *             required:
 *               - email
 *               - password
 *     responses:
 *       '201':
 *         description: User registered successfully
 *       '400':
 *         description: Registration error
 */
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { email, password, username, firstName, lastName, userType = 'candidate' } = req.body;
    const result = await AuthService.register(email, password, username, firstName, lastName, userType);

    const ipAddress = req.ip || req.connection.remoteAddress;
    await AuditService.log(
      result.user.id,
      'user.register',
      'user',
      result.user.id,
      { email, username, userType },
      ipAddress
    );

    setAuthCookie(res, result.token);
    res.status(201).json({
      success: true,
      user: publicUserResponse(result.user)
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Log in an existing user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - email
 *               - password
 *     responses:
 *       '200':
 *         description: Login successful
 *       '401':
 *         description: Invalid credentials
 */
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);

    const ipAddress = req.ip || req.connection.remoteAddress;
    await AuditService.log(
      result.user.id,
      'user.login',
      'user',
      result.user.id,
      { email },
      ipAddress
    );

    setAuthCookie(res, result.token);
    res.status(200).json({
      success: true,
      user: publicUserResponse(result.user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/auth/verify:
 *   get:
 *     summary: Verify the current auth token
 *     responses:
 *       '200':
 *         description: Token is valid
 *       '401':
 *         description: Token is missing or invalid
 */
router.get('/verify', (req, res) => {
  try {
    const token = getRequestToken(req);
    if (!token) {
      return res.status(401).json({ valid: false });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ valid: false });
    }

    return res.json({ valid: true, user: decoded });
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ valid: false });
  }
});

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Log out the current user
 *     responses:
 *       '200':
 *         description: Logout successful
 */
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

/**
 * GitHub OAuth connect — initiates OAuth flow. Requires authenticated user.
 */
/**
 * @openapi
 * /api/auth/github:
 *   get:
 *     summary: Redirect the authenticated user to GitHub OAuth
 *     responses:
 *       '302':
 *         description: Redirect to GitHub authorization page
 *       '401':
 *         description: Authentication required
 */
router.get('/github', async (req, res, next) => {
  try {
    // Ensure user is authenticated
    const token = getRequestToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    // Use passport to start OAuth flow
    passport.authenticate('github', { scope: ['read:user', 'repo'] })(req, res, next);
  } catch (err) {
    console.error('GitHub auth init error:', err);
    res.status(500).json({ error: 'Failed to start GitHub auth' });
  }
});

/**
 * GitHub OAuth callback — link GitHub, fetch repos/languages and upsert skills
 */
/**
 * @openapi
 * /api/auth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback to link GitHub and import skills
 *     responses:
 *       '302':
 *         description: Redirect to dashboard after successful linking
 *       '401':
 *         description: Authentication required or invalid token
 *       '500':
 *         description: GitHub linking failed
 */
router.get('/github/callback', passport.authenticate('github', { failureRedirect: '/', session: false }), async (req, res) => {
  try {
    // req.user contains { profile, accessToken }
    const gitUser = req.user?.profile;
    const accessToken = req.user?.accessToken;

    // Get our logged-in user from auth token
    const token = getRequestToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const decoded = AuthService.verifyToken(token);
    if (!decoded) return res.status(401).json({ error: 'Invalid auth token' });

    const userId = decoded.userId || decoded.id || decoded.sub;

    // Link GitHub info on users table
    await pool.query(
      `UPDATE users SET github_id = $1, github_username = $2, github_connected_at = NOW(), updated_at = NOW() WHERE id = $3`,
      [gitUser.id, gitUser.username || gitUser.login, userId]
    );

    // Fetch user repos (top 10 by stargazers)
    const reposRes = await axios.get('https://api.github.com/user/repos?per_page=100', {
      headers: { Authorization: `token ${accessToken}`, Accept: 'application/vnd.github.v3+json' }
    });

    const repos = (reposRes.data || []).sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0)).slice(0, 10);

    // For each repo fetch languages
    const langTotals = {};
    await Promise.all(repos.map(async (r) => {
      try {
        const lr = await axios.get(`https://api.github.com/repos/${r.owner.login}/${r.name}/languages`, {
          headers: { Authorization: `token ${accessToken}`, Accept: 'application/vnd.github.v3+json' }
        });
        const langs = lr.data || {};
        Object.entries(langs).forEach(([lang, bytes]) => {
          langTotals[lang] = (langTotals[lang] || 0) + bytes;
        });
      } catch (e) {
        console.warn('Failed to fetch languages for', r.full_name, e.message || e);
      }
    }));

    // Map bytes to proficiency
    const proficiencyMap = (bytes) => {
      if (bytes > 50000) return 8;
      if (bytes > 10000) return 6;
      if (bytes > 1000) return 4;
      return 2;
    };

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const [language, bytes] of Object.entries(langTotals)) {
        // Find or create skill
        const skillRes = await client.query('SELECT id FROM skills WHERE LOWER(name) = LOWER($1) LIMIT 1', [language]);
        let skillId;
        if (skillRes.rows.length > 0) {
          skillId = skillRes.rows[0].id;
        } else {
          const { v4: uuidv4 } = require('uuid');
          const uuid = uuidv4();
          const ins = await client.query('INSERT INTO skills (uuid, name, category, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id', [uuid, language, 'github']);
          skillId = ins.rows[0].id;
        }

        const prof = proficiencyMap(bytes);

        // Upsert into user_skills with source = 'github'
        const usUuid = require('uuid').v4();
        await client.query(
          `INSERT INTO user_skills (uuid, user_id, skill_id, proficiency_level, years_of_experience, source, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           ON CONFLICT (user_id, skill_id)
           DO UPDATE SET proficiency_level = EXCLUDED.proficiency_level, source = EXCLUDED.source, updated_at = NOW(), deleted_at = NULL`,
          [usUuid, userId, skillId, prof, 0, 'github']
        );
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    // Log audit event
    const ipAddress = req.ip || req.connection.remoteAddress;
    await AuditService.log(userId, 'user.github_connected', 'users', userId, { github: gitUser.username || gitUser.login }, ipAddress);

    // Redirect back to profile page
    res.redirect('/dashboard?connected=github');
  } catch (error) {
    console.error('GitHub callback error:', error);
    res.status(500).send('GitHub link failed');
  }
});

module.exports = router;