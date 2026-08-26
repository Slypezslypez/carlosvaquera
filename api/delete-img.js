const { neon } = require('@neondatabase/serverless');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  // Auth
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Non autorisé' });
  try { jwt.verify(auth.slice(7), process.env.JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Token invalide' }); }

  const key = req.query.key || (req.body && req.body.key);
  if (!key) return res.status(400).json({ error: 'Clé manquante' });

  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`DELETE FROM images WHERE key = ${key}`;
    return res.json({ success: true });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
