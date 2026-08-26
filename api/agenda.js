const { neon } = require('@neondatabase/serverless');
const jwt = require('jsonwebtoken');

function verifyToken(req) {
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer ')) return false;
  try {
    jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    return true;
  } catch { return false; }
}

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];

function toSortDate(day, month) {
  // month = "Sep 2026"
  try {
    const parts = (month||'').split(' ');
    const year = parseInt(parts[1]) || 9999;
    const mIdx = MONTHS.indexOf(parts[0]);
    const m = mIdx >= 0 ? mIdx + 1 : 12;
    const d = parseInt(day) || 1;
    return new Date(year, m - 1, d);
  } catch { return new Date(9999, 0, 1); }
}

function sortByDate(rows) {
  return rows.slice().sort((a, b) => toSortDate(a.day, a.month) - toSortDate(b.day, b.month));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.DATABASE_URL);

  try { await sql`ALTER TABLE agenda ADD COLUMN IF NOT EXISTS image TEXT`; } catch(e) {}

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM agenda`;
    return res.json(sortByDate(rows));
  }

  if (!verifyToken(req)) return res.status(401).json({ error: 'Non autorisé' });

  if (req.method === 'POST') {
    const { id, day, month, title, venue, status, image } = req.body || {};
    if (id) {
      await sql`UPDATE agenda SET day=${day}, month=${month}, title=${title}, venue=${venue}, status=${status}, image=${image||null} WHERE id=${id}`;
    } else {
      await sql`INSERT INTO agenda (day, month, title, venue, status, image) VALUES (${day}, ${month}, ${title}, ${venue}, ${status||'available'}, ${image||null})`;
    }
    const rows = await sql`SELECT * FROM agenda`;
    return res.json(sortByDate(rows));
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    await sql`DELETE FROM agenda WHERE id=${id}`;
    return res.json({ success: true });
  }

  res.status(405).end();
};
