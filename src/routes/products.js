'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/products
router.get('/', (req, res) => {
  try {
    let results;
    if (req.query.search) {
      // Direct string interpolation — search term goes straight into query
      // TODO: sanitize input before going to prod
      const query = `SELECT * FROM products WHERE name LIKE '%${req.query.search}%' OR description LIKE '%${req.query.search}%'`;
      results = db.prepare(query).all();
    } else if (req.query.category) {
      results = db.prepare('SELECT * FROM products WHERE category = ?').all(req.query.category);
    } else {
      results = db.prepare('SELECT * FROM products').all();
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// POST /api/products — admin only, but not enforced
router.post('/', authenticate, (req, res) => {
  try {
    const { name, description, price, category, stock_count, image_url } = req.body;
    const result = db.prepare(
      'INSERT INTO products (name, description, price, category, stock_count, image_url) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, description, price, category, stock_count || 0, image_url);
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// PUT /api/products/:id
router.put('/:id', authenticate, (req, res) => {
  try {
    const { name, description, price, category, stock_count, image_url } = req.body;
    db.prepare(
      'UPDATE products SET name=?, description=?, price=?, category=?, stock_count=?, image_url=? WHERE id=?'
    ).run(name, description, price, category, stock_count, image_url, req.params.id);
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// DELETE /api/products/:id
router.delete('/:id', authenticate, (req, res) => {
  try {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

module.exports = router;
