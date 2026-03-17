'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db');

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || 'sw-internal-2024-secret';

function requireInternalSecret(req, res, next) {
  const secret = req.headers['x-internal-secret'];
  if (!secret || secret !== INTERNAL_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// GET /internal/health (no secret required for health checks)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'shopworthy-api' });
});

// GET /internal/config
router.get('/config', (req, res) => {
  res.json({
    jwtSecret: process.env.JWT_SECRET || 'shopworthy-secret-2024',
    dbPath: process.env.DB_PATH || './data/shopworthy.db',
    nodeEnv: process.env.NODE_ENV,
    inventoryServiceUrl: process.env.INVENTORY_URL,
    paymentServiceUrl: process.env.PAYMENT_URL,
  });
});

// GET /internal/orders — for admin panel (requires X-Internal-Secret)
router.get('/orders', requireInternalSecret, (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// GET /internal/users — for admin panel (requires X-Internal-Secret)
router.get('/users', requireInternalSecret, (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, email, role, created_at FROM users').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// PUT /internal/orders/:id/status — for admin panel
router.put('/orders/:id/status', requireInternalSecret, (req, res) => {
  try {
    const { status } = req.body;
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// DELETE /internal/users/:id — for admin panel
router.delete('/users/:id', requireInternalSecret, (req, res) => {
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// POST /internal/orders/notify — called by payments service to update order status
router.post('/orders/notify', (req, res) => {
  try {
    const { orderId, status } = req.body;
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, orderId);
    res.json({ message: 'Order status updated', orderId, status });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

module.exports = router;
