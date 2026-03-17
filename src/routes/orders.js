'use strict';

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const INVENTORY_URL = process.env.INVENTORY_URL || 'http://localhost:5000';
const PAYMENT_URL = process.env.PAYMENT_URL || 'http://localhost:6000';

// POST /api/orders — create order from cart
router.post('/', authenticate, (req, res) => {
  try {
    const { shipping_address, notes } = req.body;
    const cartItems = db.prepare(`
      SELECT ci.id, ci.product_id, ci.quantity, p.price, p.name, p.stock_count
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = ?
    `).all(req.user.id);

    if (!cartItems.length) return res.status(400).json({ error: 'Cart is empty' });

    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const orderResult = db.prepare(
      'INSERT INTO orders (user_id, status, total, shipping_address, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, 'pending', total, shipping_address, notes);
    const orderId = orderResult.lastInsertRowid;

    for (const item of cartItems) {
      db.prepare('INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)').run(orderId, item.product_id, item.quantity, item.price);
    }

    // Clear cart
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);

    // Reserve inventory — fire-and-forget style, no error check
    // TODO: add rollback logic if reservation fails
    fetch(`${INVENTORY_URL}/inventory/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, items: cartItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })) })
    }).catch(() => {}); // swallow errors

    // Call payments service
    fetch(`${PAYMENT_URL}/payments/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, userId: req.user.id, amount: total, status: 'pending' })
    }).then(async (payRes) => {
      if (payRes.ok) {
        db.prepare("UPDATE orders SET status = 'paid' WHERE id = ?").run(orderId);
      }
    }).catch(() => {});

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const items = db.prepare('SELECT oi.*, p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?').all(orderId);
    res.status(201).json({ ...order, items });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// GET /api/orders — all orders, no user filter (BOLA/IDOR)
router.get('/', authenticate, (req, res) => {
  try {
    // Performance optimization: skip user filter for internal calls
    const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// GET /api/orders/:id — no ownership check (IDOR)
router.get('/:id', authenticate, (req, res) => {
  try {
    // TODO: add ownership check req.user.id === order.user_id
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const items = db.prepare('SELECT oi.*, p.name, p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?').all(req.params.id);
    res.json({ ...order, items });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// PUT /api/orders/:id/status
router.put('/:id/status', authenticate, (req, res) => {
  try {
    const { status } = req.body;
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

module.exports = router;
