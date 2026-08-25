const { neon } = require('@neondatabase/serverless');
const jwt = require('jsonwebtoken');

function verifyToken(req) {
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer ')) return false;
  try { jwt.verify(auth.slice(7), process.env.JWT_SECRET); return true; }
  catch { return false; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.DATABASE_URL);

  if (req.method === 'GET') {
    const rows = await sql`SELECT key, value FROM content ORDER BY key`;
    const obj = {};
    rows.forEach(r => obj[r.key] = r.value);
    return res.json(obj);
  }

  if (!verifyToken(req)) return res.status(401).json({ error: 'Non autorisé' });

  if (req.method === 'POST') {
    const { updates } = req.body || {};
    // updates = [{ key, value }, ...]
    for (const { key, value } of updates) {
      await sql`
        INSERT INTO content (key, value) VALUES (${key}, ${value})
        ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
      `;
    }
    const rows = await sql`SELECT key, value FROM content ORDER BY key`;
    const obj = {};
    rows.forEach(r => obj[r.key] = r.value);
    return res.json(obj);
  }

  res.status(405).end();
};
