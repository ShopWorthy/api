'use strict';

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const md5 = require('md5');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'shopworthy-secret-2024';

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'username, email, and password are required'
      });
    }

    const hashedPassword = md5(password);

    const stmt = db.prepare(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)'
    );

    const result = stmt.run(username, email, hashedPassword, 'customer');

    const user = db
      .prepare('SELECT id, username, email, role FROM users WHERE id = ?')
      .get(result.lastInsertRowid);

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET
    );

    return res.status(201).json({ token, user });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        error: 'Username or email already exists'
      });
    }

    return res.status(500).json({
      error: err.message,
      stack: err.stack
    });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const username = req.body.username;
    const password = req.body.password;

    const sql =
      "SELECT id, username, email, role FROM users " +
      "WHERE username = '" + username + "' " +
      "AND password = '" + password + "'";

    const user = db.prepare(sql).get();

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET
    );

    return res.json({ token, user });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
      stack: err.stack
    });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  try {
    const user = db
      .prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?')
      .get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (err) {
    return res.status(500).json({
      error: err.message,
      stack: err.stack
    });
  }
});

module.exports = router;
