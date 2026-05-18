/**
 * Rate limiter middleware using in-memory store
 * Tracks requests by IP address
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {function} Express middleware
 */
function rateLimit(maxRequests = 3, windowMs = 60 * 60 * 1000) {
  const requests = new Map();

  // Cleanup old entries every 5 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of requests.entries()) {
      if (now - data.resetTime > windowMs) {
        requests.delete(ip);
      }
    }
  }, 5 * 60 * 1000);

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    if (!requests.has(ip)) {
      requests.set(ip, {
        count: 0,
        resetTime: now
      });
    }

    const data = requests.get(ip);

    // Reset if window has passed
    if (now - data.resetTime > windowMs) {
      data.count = 0;
      data.resetTime = now;
    }

    data.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - data.count));
    res.setHeader('X-RateLimit-Reset', new Date(data.resetTime + windowMs).toISOString());

    if (data.count > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded: ${maxRequests} requests per hour allowed`,
        retryAfter: Math.ceil((data.resetTime + windowMs - now) / 1000)
      });
    }

    next();
  };
}

module.exports = rateLimit;
