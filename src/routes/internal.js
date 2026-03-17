'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /internal/health
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
