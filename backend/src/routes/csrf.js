const express = require('express');
const crypto = require('crypto');

const router = express.Router();

// In-memory CSRF token store with expiration (production should use Redis/DB)
const csrfTokens = new Map();

// Cleanup expired tokens every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of csrfTokens.entries()) {
    if (now > data.expiresAt) {
      csrfTokens.delete(token);
    }
  }
}, 30 * 60 * 1000);

// GET /api/csrf-token
router.get('/', (req, res) => {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  // Store with 2-hour expiry
  csrfTokens.set(csrfToken, { 
    expiresAt: Date.now() + 2 * 60 * 60 * 1000,
    ip: req.ip,
  });
  res.json({ csrfToken });
});

// Middleware to validate CSRF tokens
const validateCsrf = (req, res, next) => {
  const csrfToken = req.headers['x-csrf-token'];
  if (!csrfToken) {
    return res.status(403).json({ error: 'CSRF token missing', message: 'CSRF validation failed' });
  }
  
  const stored = csrfTokens.get(csrfToken);
  if (!stored) {
    return res.status(403).json({ error: 'Invalid CSRF token', message: 'CSRF validation failed. Please refresh and try again.' });
  }
  
  if (Date.now() > stored.expiresAt) {
    csrfTokens.delete(csrfToken);
    return res.status(403).json({ error: 'CSRF token expired', message: 'CSRF validation failed. Please refresh and try again.' });
  }

  next();
};

module.exports = router;
module.exports.validateCsrf = validateCsrf;
