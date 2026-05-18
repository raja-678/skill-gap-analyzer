require('dotenv').config();
const express = require('express');
let Sentry;
try {
  Sentry = require('@sentry/node');
} catch (e) {
  // If Sentry isn't installed yet, provide a noop fallback to avoid crashing during startup
  const noop = () => {};
  Sentry = { init: noop, captureException: noop };
  // logger may not be defined yet if logger require fails earlier, so use console as fallback
  console.warn && console.warn('Sentry not available:', e.message || e);
}
const { logger, pinoMiddleware } = require('./lib/logger');
const pool = require('./config/database');
const passport = require('passport');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./config/database');
const resumeWorker = require('./queue/resumeWorker');
const { connection: redisConnection } = require('./queue/index');

const app = express();

// Route console.* to pino logger for libraries that still use console
console.log = (...args) => logger.info(...args);
console.info = (...args) => logger.info(...args);
console.error = (...args) => logger.error(...args);
console.warn = (...args) => logger.warn(...args);
console.debug = (...args) => logger.debug(...args);

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.0
});

// Attach pino HTTP middleware early
app.use(pinoMiddleware);
// Initialize passport for OAuth flows
app.use(passport.initialize());
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const isDevLocalhost = (origin) => (
  process.env.NODE_ENV === 'development'
  && /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false
});

const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false
});

const uploadLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked origin: ${origin}`));
    }
    : (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || isDevLocalhost(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
  credentials: true
}));
app.use(cookieParser());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/chat/message', chatLimiter);
app.use('/api/resumes/upload', uploadLimiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📬 [${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (Object.keys(req.body).length > 0) {
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = '[redacted]';
    console.log('📦 Body:', JSON.stringify(safeBody));
  }
  next();
});

// Health check — verify DB and Redis
app.get('/api/health', async (req, res) => {
  const checks = {};
  let status = 'ok';
  try {
    // DB check
    await pool.query('SELECT 1');
    checks.db = { ok: true };
  } catch (dbErr) {
    checks.db = { ok: false, error: dbErr.message };
    status = 'degraded';
  }

  try {
    // Redis ping
    const pong = await redisConnection.ping();
    checks.redis = { ok: pong === 'PONG' };
    if (pong !== 'PONG') status = 'degraded';
  } catch (rErr) {
    checks.redis = { ok: false, error: rErr.message };
    status = 'degraded';
  }

  const code = status === 'ok' ? 200 : 503;
  res.status(code).json({ status, checks, timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/resumes', require('./routes/resumeRoutes'));
app.use('/api/analysis', require('./routes/analysisRoutes'));
app.use('/api/recommendations', require('./routes/recommendationRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/skills', require('./routes/skillRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/career', require('./routes/careerRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/og', require('./routes/ogRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  try {
    Sentry.captureException(err);
  } catch (e) {
    logger.error('Sentry capture failed', e);
  }

  if (req && req.log) {
    req.log.error({ err }, 'Unhandled error');
  } else {
    logger.error({ err }, 'Unhandled error');
  }

  const requestId = req && req.id ? req.id : undefined;
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    requestId
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Start server after DB connection
const startServer = async () => {
  try {
    await connectDB();
    
    // Start resume worker only in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      console.log('🚀 Starting resume processing worker...');
      resumeWorker.waitUntilReady().catch((err) => {
        console.error('Resume worker failed to start:', err);
      });
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log('✅ Resume processing queue ready (BullMQ + Upstash Redis)');
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
