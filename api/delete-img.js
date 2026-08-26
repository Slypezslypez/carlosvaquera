const { neon } = require('@neondatabase/serverless');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  // Auth
  try {
    const auth = req.headers['authorization'] || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Non autorisé' });
    jwt.verify(auth.slice(7), process.env.JWT_SECRET);
  } catch(e) {
    return res.status(401).json({ error: 'Token: ' + e.message });
  }

  // Key from body
  let key;
  try {
    const body = req.body || {};
    key = body.key;
  } catch(e) {
    return res.status(400).json({ error: 'Body: ' + e.message });
  }
  if (!key) return res.status(400).json({ error: 'Clé manquante' });

  // Delete
  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`DELETE FROM images WHERE key = ${key}`;
    return res.json({ success: true });
  } catch(e) {
    return res.status(500).json({ error: 'DB: ' + e.message });
  }
};
