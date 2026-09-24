// Proxies contact-form submissions to Web3Forms so the access key
// never ships in the browser. Requires WEB3FORMS_ACCESS_KEY in env.
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const accessKey = process.env.WEB3FORMS_ACCESS_KEY;
  if (!accessKey) {
    return res.status(500).json({ success: false, message: 'Contact form is not configured.' });
  }

  const body = req.body || {};
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const projectType = String(body.projectType || '').trim();
  const message = String(body.message || '').trim();

  if (name.length < 2) {
    return res.status(400).json({ success: false, message: 'Please enter your name.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }
  if (!projectType) {
    return res.status(400).json({ success: false, message: 'Please select a project type.' });
  }
  if (message.length < 10) {
    return res.status(400).json({ success: false, message: 'Please add a short message (10+ characters).' });
  }

  try {
    const upstream = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: accessKey,
        subject: 'New portfolio contact form submission',
        name,
        email,
        projectType,
        message
      })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok || !data.success) {
      return res.status(502).json({
        success: false,
        message: data.message || 'Something went wrong sending your message.'
      });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(502).json({ success: false, message: 'Network error — please try again.' });
  }
};
