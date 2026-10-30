// Cloudflare Pages Function: POST /api/contact
// Sends the contact form to the addresses in CONTACT_TO via Resend.
//
// Environment variables (Cloudflare Pages → Settings → Variables and Secrets):
//   RESEND_API_KEY  Resend API key (set as a secret)
//   CONTACT_TO      Recipients, comma-separated: "a@example.com,b@example.com"
//   CONTACT_FROM    Sender on a domain verified in Resend: "Nichihaku <contact@nichihaku.com>"
//   TURNSTILE_SECRET  Cloudflare Turnstile secret key (secret). Verification is skipped while unset.

// Typical wording of unsolicited sales pitches (フォーム営業). Matches are tagged, not dropped.
const SALES_PATTERNS = [/https?:\/\//i, /突然のご連絡/, /突然のご案内/, /弊社サービス/, /資料をお送り/];

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

  if (!(await verifyTurnstile(field('cf-turnstile-response', 2048), request, env))) {
    return json({ error: 'verification failed' }, 403);
  }

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
      subject: `${looksLikeSales(message) ? '【営業の可能性】' : ''}【お問い合わせ】${type || 'Webサイト'} — ${company} ${name}様`,
      text,
    }),
  });

  if (!res.ok) {
    console.error('Resend error', res.status, await res.text());
    return json({ error: 'send failed' }, 502);
  }
  return json({ ok: true });
}

function looksLikeSales(text) {
  return SALES_PATTERNS.some((re) => re.test(text));
}

async function verifyTurnstile(token, request, env) {
  if (!env.TURNSTILE_SECRET) {
    console.warn('TURNSTILE_SECRET is not set; skipping verification');
    return true;
  }
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  return data.success === true;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
