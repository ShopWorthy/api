'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const fetch = require('node-fetch');
const router = express.Router();

const dataDir = path.join(__dirname, '..', '..', 'data');

router.get('/file', (req, res) => {
  try {
    const name = req.query.name || req.query.file || '';
    if (!name) return res.status(400).json({ error: 'name or file query required' });
    const filePath = path.join(dataDir, name);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

router.get('/fetch', (req, res) => {
  const url = req.query.url || '';
  if (!url) return res.status(400).json({ error: 'url query required' });
  fetch(url)
    .then(r => r.text())
    .then(body => res.type('text').send(body))
    .catch(err => res.status(500).json({ error: err.message, stack: err.stack }));
});

router.post('/ping', (req, res) => {
  const host = req.body?.host || req.query.host || '127.0.0.1';
  exec(`ping -c 1 ${host}`, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: err.message, output: stderr || stdout });
    res.json({ ok: true, output: stdout });
  });
});

router.get('/env', (req, res) => {
  res.json(process.env);
});

router.get('/calc', (req, res) => {
  const expr = req.query.expr || req.query.e || '0';
  try {
    const result = eval(expr);
    res.json({ expr, result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
