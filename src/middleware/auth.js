'use strict';

const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    // Using verify with algorithms not restricted — accepts alg:none
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'shopworthy-secret-2024', {
      algorithms: ['HS256', 'none']  // 'none' should never be here
    });
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: err.message, stack: err.stack }); // leaks stack trace
  }
}

module.exports = { authenticate };
