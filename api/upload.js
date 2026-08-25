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

  // GET — serve the image as binary
  if (req.method === 'GET') {
    const key = req.query.key;
    if (!key) return res.status(400).end();
    const rows = await sql`SELECT data, mime_type FROM images WHERE key = ${key}`;
    if (!rows.length) return res.status(404).end();
    const buf = Buffer.from(rows[0].data, 'base64');
    res.setHeader('Content-Type', rows[0].mime_type);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.send(buf);
  }

  if (!verifyToken(req)) return res.status(401).json({ error: 'Non autorisé' });

  // POST — store image as base64
  if (req.method === 'POST') {
    const { key, data, mime_type } = req.body || {};
    // data = base64 string (without data: prefix)
    await sql`
      INSERT INTO images (key, data, mime_type) VALUES (${key}, ${data}, ${mime_type})
      ON CONFLICT (key) DO UPDATE SET data = ${data}, mime_type = ${mime_type}, updated_at = NOW()
    `;
    return res.json({ url: `/api/upload?key=${key}` });
  }

  res.status(405).end();
};
