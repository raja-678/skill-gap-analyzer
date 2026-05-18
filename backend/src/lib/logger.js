const pino = require('pino');
const pinoHttp = require('pino-http');
const { randomUUID } = require('crypto');

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const logger = pino({
  level,
  redact: ['req.headers.authorization', 'body.password']
});

const pinoMiddleware = pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] || randomUUID()
});

module.exports = { logger, pinoMiddleware };
