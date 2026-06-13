const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'augmont-secret-key-2024';

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1 AND is_active = true', [decoded.userId]);
    if (!rows[0]) return res.status(401).json({ success: false, error: 'User not found or inactive' });
    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}

function requirePermission(module, action) {
  return (req, res, next) => {
    if (req.user?.role === 'admin') return next();
    const perms = req.user?.permissions || {};
    const perm = perms[module];
    const allowed = action ? (typeof perm === 'object' ? perm[action] : perm) : perm;
    if (!allowed) return res.status(403).json({ success: false, error: 'Permission denied' });
    next();
  };
}

module.exports = { authenticate, requireAdmin, requirePermission, JWT_SECRET };
