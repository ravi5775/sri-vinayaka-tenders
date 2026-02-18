const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify this is the active session token
    const tokenHash = hashToken(token);
    const result = await pool.query(
      'SELECT active_token_hash FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const storedHash = result.rows[0].active_token_hash;
    if (!storedHash || storedHash !== tokenHash) {
      return res.status(401).json({ 
        error: 'Session expired. You have been logged in from another device.',
        code: 'SESSION_REPLACED'
      });
    }

    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { authenticate, hashToken };
