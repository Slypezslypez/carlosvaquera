const { neon } = require('@neondatabase/serverless');
const jwt = require('jsonwebtoken');

function verifyToken(req) {
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer ')) return false;
  try {
    jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.DATABASE_URL);

  // GET — public, pas besoin d'authentification
  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM agenda ORDER BY id ASC`;
    return res.json(rows);
  }

  // POST et DELETE — authentification requise
  if (!verifyToken(req)) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  if (req.method === 'POST') {
    const { id, day, month, title, venue, status } = req.body || {};
    if (id) {
      await sql`
        UPDATE agenda SET day=${day}, month=${month}, title=${title}, venue=${venue}, status=${status}
        WHERE id=${id}
      `;
    } else {
      await sql`
        INSERT INTO agenda (day, month, title, venue, status)
        VALUES (${day}, ${month}, ${title}, ${venue}, ${status || 'available'})
      `;
    }
    const rows = await sql`SELECT * FROM agenda ORDER BY id ASC`;
    return res.json(rows);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    await sql`DELETE FROM agenda WHERE id=${id}`;
    return res.json({ success: true });
  }

  res.status(405).end();
};
