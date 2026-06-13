const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All routes require auth + admin
router.use(authenticate, requireAdmin);

const DEFAULT_PERMISSIONS = {
  dashboard: true,
  customers: { view: true, manage: false },
  calls: { view: true, trigger: false },
  bulk: { view: false, manage: false },
  users: { view: false, manage: false }
};

// List all users
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, user_id, name, email, role, permissions, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create user
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role = 'user', permissions } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, error: 'Name, email and password required' });
    const hash = await bcrypt.hash(password, 10);
    const perms = permissions || DEFAULT_PERMISSIONS;
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, permissions, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, user_id, name, email, role, permissions, is_active, created_at`,
      [name, email.toLowerCase(), hash, role, JSON.stringify(perms), req.user.id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ success: false, error: 'Email already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { name, email, role, permissions, is_active, password } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;
    if (name) { updates.push(`name = $${idx++}`); values.push(name); }
    if (email) { updates.push(`email = $${idx++}`); values.push(email.toLowerCase()); }
    if (role) { updates.push(`role = $${idx++}`); values.push(role); }
    if (permissions !== undefined) { updates.push(`permissions = $${idx++}`); values.push(JSON.stringify(permissions)); }
    if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); values.push(is_active); }
    if (password) { const hash = await bcrypt.hash(password, 10); updates.push(`password_hash = $${idx++}`); values.push(hash); }
    updates.push(`updated_at = NOW()`);
    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, user_id, name, email, role, permissions, is_active, created_at`,
      values
    );
    if (!rows[0]) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ success: false, error: 'Cannot delete yourself' });
    }
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
