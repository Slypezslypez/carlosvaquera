const { neon } = require('@neondatabase/serverless');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');

function verifyToken(req) {
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer ')) return false;
  try { jwt.verify(auth.slice(7), process.env.JWT_SECRET); return true; }
  catch { return false; }
}

module.exports = async function handler(req, res) {
  try {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.DATABASE_URL);

  // GET — serve file as binary (with Range support for Safari video)
  if (req.method === 'GET') {
    const key = req.query.key;
    if (!key) return res.status(400).end();
    const rows = await sql`SELECT data, mime_type FROM images WHERE key = ${key}`;
    if (!rows.length) return res.status(404).end();
    const buf = Buffer.from(rows[0].data, 'base64');
    const mime = rows[0].mime_type;
    res.setHeader('Content-Type', mime);
    res.setHeader('Accept-Ranges', 'bytes');
    // Range request support (required for Safari video playback)
    const range = req.headers['range'];
    if (range && mime && mime.startsWith('video/')) {
      const total = buf.length;
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : total - 1;
      const chunkSize = end - start + 1;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
      res.setHeader('Content-Length', chunkSize);
      res.status(206).send(buf.slice(start, end + 1));
      return;
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.send(buf);
  }

  if (!verifyToken(req)) return res.status(401).json({ error: 'Non autorisé' });

  // POST ?action=delete — remove image by key
  if (req.method === 'POST' && req.query.action === 'delete') {
    const key = req.query.key;
    if (!key) return res.status(400).json({ error: 'Clé manquante' });
    try {
      await sql`DELETE FROM images WHERE key = ${key}`;
      return res.json({ success: true });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST — store image (with compression)
  if (req.method === 'POST') {
    const { key, data, mime_type } = req.body || {};

    // Compress images with sharp (max 1920px wide, JPEG 80%) — skip for videos
    let finalData = data;
    let finalMime = mime_type;
    if (mime_type && mime_type.startsWith('image/')) {
      try {
        const inputBuffer = Buffer.from(data, 'base64');
        const compressed = await sharp(inputBuffer)
          .resize({ width: 1920, withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();
        finalData = compressed.toString('base64');
        finalMime = 'image/jpeg';
      } catch (e) {
        console.warn('Compression skipped:', e.message);
      }
    }

    await sql`
      INSERT INTO images (key, data, mime_type) VALUES (${key}, ${finalData}, ${finalMime})
      ON CONFLICT (key) DO UPDATE SET data = ${finalData}, mime_type = ${finalMime}, updated_at = NOW()
    `;
    return res.json({ url: `/api/upload?key=${key}` });
  }

  res.status(405).end();
  } catch(e) {
    if (!res.headersSent) res.status(500).json({ error: 'Handler: ' + e.message });
  }
};
