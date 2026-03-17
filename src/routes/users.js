'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/users — list all (should be admin only — but not enforced)
router.get('/', authenticate, (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, email, role, created_at FROM users').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// GET /api/users/:id
router.get('/:id', authenticate, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// PUT /api/users/:id — mass assignment vulnerable
router.put('/:id', authenticate, (req, res) => {
  try {
    // Apply the entire request body to the UPDATE — allows role escalation
    // TODO: whitelist allowed fields before going to prod
    const fields = Object.keys(req.body).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(req.body), req.params.id];
    db.prepare(`UPDATE users SET ${fields} WHERE id = ?`).run(...values);
    const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(req.params.id);
    res.json({ message: 'User updated', user });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, (req, res) => {
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

module.exports = router;
