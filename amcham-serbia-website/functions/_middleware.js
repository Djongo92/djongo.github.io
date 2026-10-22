// Cloudflare Pages: a branded sign-in screen in front of the whole AmCham demo.
//
// Visitors sign in with an @amcham.rs email address and the shared password,
// set as a secret named DEMO_PASSWORD in the Pages project (Settings ->
// Variables and secrets). While it is not set, the site stays open, so
// deploying this file can never lock anyone out by itself.
//
// Signing in sets a signed cookie that lasts 30 days. The signature is keyed
// on the password, so changing DEMO_PASSWORD signs everyone out. The email
// domain check sets the tone rather than proving identity; the password is
// what actually keeps the demo private.
//
// Optional sign-in record: bind a KV namespace as SIGNIN_LOG and each
// successful sign-in is stored (email, time, country) for 180 days. Without
// the binding nothing is recorded.

const COOKIE = 'amcham_demo';
const EMAIL_COOKIE = 'amcham_demo_email'; // readable by the page, for "Signed in as"
const MAX_AGE = 30 * 24 * 60 * 60;
const LOG_TTL = 180 * 24 * 60 * 60;
const EMAIL_RE = /^[^\s@]+@amcham\.rs$/i;

const encoder = new TextEncoder();

// Compares two strings without leaking, through timing, how much of them matched.
async function sameSecret(a, b) {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(`amcham-demo-session:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

async function makeSession(email, secret) {
  const payload = b64url(encoder.encode(JSON.stringify({ e: email, x: Math.floor(Date.now() / 1000) + MAX_AGE })));
  return `${payload}.${await sign(payload, secret)}`;
}

async function readSession(request, secret) {
  const raw = getCookie(request, COOKIE);
  if (!raw) return null;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig || !(await sameSecret(sig, await sign(payload, secret)))) return null;
  try {
    const data = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return data.x > Date.now() / 1000 ? data : null;
  } catch {
    return null;
  }
}

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

// Only same-site paths, so the sign-in form can't be used to bounce people elsewhere.
function safeNext(next) {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function signInPage({ next, email = '', error = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Sign in · AmCham Serbia</title>
<link rel="icon" type="image/png" href="/brand/amcham-favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { --navy: #0b1221; --navy-2: #131d33; --ink: #f8f7f5; --muted: #a9b1c2; --red: #da1619; --cyan: #40d9f1; --line: rgba(248,247,245,.14); }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body { margin: 0; background: var(--navy); color: var(--ink); font: 16px/1.5 "Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
    background-image: radial-gradient(60rem 40rem at 85% -10%, rgba(64,217,241,.10), transparent 60%), radial-gradient(50rem 36rem at -10% 110%, rgba(218,22,25,.16), transparent 60%);
    display: grid; place-items: center; padding: 24px 16px; }
  main { width: 100%; max-width: 420px; }
  .logo { display: block; height: 44px; width: auto; margin: 0 0 32px; }
  .card { background: var(--navy-2); border: 1px solid var(--line); border-radius: 24px; padding: 32px 28px; box-shadow: 0 30px 80px rgba(0,0,0,.35); }
  .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--cyan); margin: 0 0 12px; }
  h1 { font-family: "Playfair Display", Georgia, serif; font-weight: 600; font-size: 30px; line-height: 1.15; margin: 0 0 8px; }
  .lead { color: var(--muted); margin: 0 0 24px; font-size: 15px; }
  label { display: block; font-size: 13px; font-weight: 600; margin: 0 0 6px; }
  input { width: 100%; height: 48px; border-radius: 12px; border: 1px solid var(--line); background: rgba(248,247,245,.04); color: var(--ink); padding: 0 14px; font: inherit; font-size: 16px; }
  input:focus { outline: 2px solid var(--cyan); outline-offset: 1px; border-color: transparent; }
  .field { margin-bottom: 16px; }
  .hint { font-size: 12px; color: var(--muted); margin-top: 6px; }
  .error { display: flex; gap: 10px; align-items: flex-start; background: rgba(218,22,25,.14); border: 1px solid rgba(218,22,25,.45); color: #ffd7d7; border-radius: 12px; padding: 12px 14px; font-size: 14px; margin: 0 0 18px; }
  button { width: 100%; height: 50px; margin-top: 8px; border: 0; border-radius: 999px; background: var(--red); color: #fff; font: inherit; font-weight: 700; font-size: 15px; cursor: pointer; }
  button:hover { filter: brightness(1.08); }
  button:focus-visible { outline: 2px solid var(--cyan); outline-offset: 3px; }
  .foot { color: var(--muted); font-size: 13px; text-align: center; margin: 22px 0 0; }
  .foot a { color: var(--ink); }
</style>
</head>
<body>
<main>
  <img class="logo" src="/brand/amcham-logo-white.png" alt="AmCham Serbia">
  <div class="card">
    <p class="eyebrow">Private preview</p>
    <h1>Sign in to the redesign</h1>
    <p class="lead">The new AmCham Serbia website and member platform, shared with the AmCham team.</p>
    ${error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : ''}
    <form method="post" action="/__auth/signin">
      <input type="hidden" name="next" value="${escapeHtml(next)}">
      <div class="field">
        <label for="email">Work email</label>
        <input id="email" name="email" type="email" autocomplete="email" inputmode="email" required placeholder="name@amcham.rs" value="${escapeHtml(email)}"${email ? '' : ' autofocus'}>
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required${email ? ' autofocus' : ''}>
        <p class="hint">You’ll stay signed in on this device for 30 days.</p>
      </div>
      <button type="submit">Sign in</button>
    </form>
  </div>
  <p class="foot">No password yet? Ask the person who sent you the link.</p>
</main>
</body>
</html>`;
}

function htmlResponse(body, status) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}

function cookieHeader(name, value, { httpOnly = true, maxAge = MAX_AGE } = {}) {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; Secure; SameSite=Lax${httpOnly ? '; HttpOnly' : ''}`;
}

async function handleSignIn(request, env, waitUntil) {
  const form = await request.formData();
  const email = String(form.get('email') || '').trim();
  const password = String(form.get('password') || '');
  const next = safeNext(String(form.get('next') || '/'));

  if (!EMAIL_RE.test(email)) {
    return htmlResponse(signInPage({ next, email, error: 'Please use your AmCham Serbia email address (name@amcham.rs).' }), 401);
  }
  if (!(await sameSecret(password, env.DEMO_PASSWORD))) {
    return htmlResponse(signInPage({ next, email, error: 'That password isn’t right. Check it and try again.' }), 401);
  }

  const normalised = email.toLowerCase();
  if (env.SIGNIN_LOG) {
    const at = new Date().toISOString();
    const record = { email: normalised, at, country: request.cf?.country || null };
    waitUntil(env.SIGNIN_LOG.put(`signin:${at}:${crypto.randomUUID().slice(0, 8)}`, JSON.stringify(record), { expirationTtl: LOG_TTL, metadata: record }));
  }

  const headers = new Headers({ Location: next, 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', cookieHeader(COOKIE, await makeSession(normalised, env.DEMO_PASSWORD)));
  headers.append('Set-Cookie', cookieHeader(EMAIL_COOKIE, encodeURIComponent(normalised), { httpOnly: false }));
  return new Response(null, { status: 303, headers });
}

function handleSignOut() {
  const headers = new Headers({ Location: '/', 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', cookieHeader(COOKIE, '', { maxAge: 0 }));
  headers.append('Set-Cookie', cookieHeader(EMAIL_COOKIE, '', { httpOnly: false, maxAge: 0 }));
  return new Response(null, { status: 303, headers });
}

// The sign-in screen needs the logo and favicon before anyone has signed in.
function isPublicAsset(pathname) {
  return pathname.startsWith('/brand/');
}

export async function onRequest({ request, env, next, waitUntil }) {
  if (!env.DEMO_PASSWORD) return next();

  const url = new URL(request.url);
  if (url.pathname === '/__auth/signin' && request.method === 'POST') return handleSignIn(request, env, waitUntil);
  if (url.pathname === '/__auth/signout') return handleSignOut();
  if (isPublicAsset(url.pathname)) return next();

  if (await readSession(request, env.DEMO_PASSWORD)) {
    const response = await next();
    // Keep private pages out of shared caches; the visitor's own browser may
    // still cache them as before.
    const headers = new Headers(response.headers);
    const directives = (response.headers.get('Cache-Control') || '')
      .split(',').map((d) => d.trim()).filter((d) => d && d !== 'public');
    if (!directives.includes('private')) directives.unshift('private');
    headers.set('Cache-Control', directives.join(', '));
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  // Pages get the sign-in screen at their own address, so signing in lands
  // you where the link pointed; everything else just gets a 401.
  const wantsPage = request.method === 'GET' && (request.headers.get('Accept') || '').includes('text/html');
  if (wantsPage) return htmlResponse(signInPage({ next: safeNext(url.pathname + url.search) }), 401);
  return new Response('Sign in required.', { status: 401, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
