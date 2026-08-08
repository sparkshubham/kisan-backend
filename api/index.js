import app from '../src/app.js';
import { ensureSchema } from '../src/db/ensureSchema.js';

// Warm schema on cold start (Vercel serverless)
const ready = ensureSchema().catch((err) => {
  console.error('[api] schema migrate on boot failed:', err.message);
});

export default async function handler(req, res) {
  try {
    await ready;
    await ensureSchema();
  } catch (err) {
    console.error('[api] schema not ready:', err.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: `Database not ready: ${err.message}` }));
    return;
  }
  return app(req, res);
}
