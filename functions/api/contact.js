// Cloudflare Pages Function: POST /api/contact
// Sends the contact form to the addresses in CONTACT_TO via Resend.
//
// Environment variables (Cloudflare Pages → Settings → Variables and Secrets):
//   RESEND_API_KEY  Resend API key (set as a secret)
//   CONTACT_TO      Recipients, comma-separated: "a@example.com,b@example.com"
//   CONTACT_FROM    Sender on a domain verified in Resend: "Nichihaku <contact@nichihaku.com>"

export async function onRequestPost({ request, env }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'invalid form' }, 400);
  }

  const field = (key, max) => String(form.get(key) || '').trim().slice(0, max);

  // Honeypot: real visitors never fill this hidden field.
  if (field('website', 200)) return json({ ok: true });

  const company = field('company', 200);
  const name = field('name', 200);
  const email = field('email', 254);
  const type = field('type', 100);
  const message = field('message', 5000);

  if (!company || !name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'missing fields' }, 400);
  }

  const to = String(env.CONTACT_TO || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!env.RESEND_API_KEY || !env.CONTACT_FROM || to.length === 0) {
    return json({ error: 'not configured' }, 500);
  }

  const text = [
    'ニチハク商事 Webサイトからお問い合わせがありました。',
    '',
    `会社名: ${company}`,
    `お名前: ${name}`,
    `メールアドレス: ${email}`,
    `ご相談の種類: ${type}`,
    '',
    'ご相談内容:',
    message,
  ].join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to,
      reply_to: email,
      subject: `【お問い合わせ】${type || 'Webサイト'} — ${company} ${name}様`,
      text,
    }),
  });

  if (!res.ok) {
    console.error('Resend error', res.status, await res.text());
    return json({ error: 'send failed' }, 502);
  }
  return json({ ok: true });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
