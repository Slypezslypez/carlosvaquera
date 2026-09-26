const { Resend } = require('resend');
const https = require('https');

function verifyRecaptcha(token) {
  return new Promise((resolve) => {
    const params = `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`;
    const options = { hostname:'www.google.com', path:'/recaptcha/api/siteverify', method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':params.length} };
    const req = https.request(options, r => {
      let data = '';
      r.on('data', c => data += c);
      r.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({ success: false }); } });
    });
    req.on('error', () => resolve({ success: false }));
    req.write(params); req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, prestation, message, recaptchaToken } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Champs manquants' });
  }

  const captcha = await verifyRecaptcha(recaptchaToken || '');
  if (!captcha.success) {
    return res.status(400).json({ error: 'reCAPTCHA invalide' });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Contact <contact@carlosvaquera.com>',
      to: 'carlosvaquera@carlosvaquera.com',
      replyTo: email,
      subject: `Demande d'infos depuis le site${prestation ? ' — ' + prestation : ''}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#c9a84c">Nouveau message via carlosvaquera.com</h2>
          <p><strong>Nom :</strong> ${name}</p>
          <p><strong>E-mail :</strong> <a href="mailto:${email}">${email}</a></p>
          ${prestation ? `<p><strong>Prestation :</strong> ${prestation}</p>` : ''}
          <p><strong>Message :</strong></p>
          <blockquote style="border-left:3px solid #c9a84c;padding-left:1rem;color:#555">${message.replace(/\n/g,'<br>')}</blockquote>
        </div>
      `
    });
    return res.json({ success: true });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
