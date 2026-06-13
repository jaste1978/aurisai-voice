const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = rows[0];
    if (!user || !user.is_active) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, ...safeUser } = user;
    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get current user
router.get('/me', authenticate, (req, res) => {
  const { password_hash, ...safeUser } = req.user;
  res.json({ success: true, user: safeUser });
});

// Change own password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const valid = await bcrypt.compare(currentPassword, req.user.password_hash);
    if (!valid) return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
