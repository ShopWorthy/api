'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 4000;

// Wide-open CORS — no restrictions
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/users', require('./routes/users'));
app.use('/internal', require('./routes/internal'));

app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack,
    cause: err.cause ? err.cause.message : null
  });
});

app.listen(PORT, () => {
  console.log(`shopworthy-api listening on port ${PORT}`);
});

module.exports = app;
