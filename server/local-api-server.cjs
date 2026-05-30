// Local development server: wraps the Lambda handler in Express so the Vite
// dev server can proxy /api/* to http://localhost:3001 during development.
require('dotenv').config({ path: '.env.local' });
const express = require('express');
const { handler } = require('../api/api');

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// Translate an Express request into an API Gateway v2 proxy event.
function toLambdaEvent(req) {
  return {
    version: '2.0',
    rawPath: req.path,
    headers: req.headers,
    requestContext: { http: { method: req.method, path: req.path } },
    body: req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : null,
    isBase64Encoded: false
  };
}

app.all('/api/*', async (req, res) => {
  try {
    const result = await handler(toLambdaEvent(req));
    const headers = result.headers || {};
    Object.keys(headers).forEach((k) => res.setHeader(k, headers[k]));
    res.status(result.statusCode || 200).send(result.body || '');
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`🚀 ChooseYourProtocol local API on http://localhost:${PORT}`);
});
