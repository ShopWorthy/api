'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const openapiPath = path.join(__dirname, '..', '..', 'openapi.json');

router.get('/openapi.json', (req, res) => {
  try {
    const spec = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
    res.json(spec);
  } catch (err) {
    res.status(500).json({ error: 'OpenAPI spec not found' });
  }
});

router.get('/', (req, res) => {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>ShopWorthy API - Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api-docs/openapi.json',
      dom_id: '#swagger-ui',
    });
  </script>
</body>
</html>`;
  res.type('html').send(html);
});

module.exports = router;
