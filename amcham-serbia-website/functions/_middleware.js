// Cloudflare Pages: one shared password in front of the whole AmCham demo.
//
// Set the password as a secret named DEMO_PASSWORD in the Pages project
// (Settings -> Variables and secrets). While it is not set, the site stays
// open, so deploying this file can never lock anyone out by itself.
// The browser asks for a username and a password; the username can be
// anything, only the password is checked.
//
// Only Cloudflare Pages runs this file. The GitHub Pages copy of the demo
// ignores it.

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

function suppliedPassword(request) {
  const header = request.headers.get('Authorization') || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) return null;
  try {
    const decoded = atob(encoded);
    const colon = decoded.indexOf(':');
    return colon === -1 ? null : decoded.slice(colon + 1);
  } catch {
    return null;
  }
}

export async function onRequest({ request, env, next }) {
  const expected = env.DEMO_PASSWORD;
  if (!expected) return next();

  const supplied = suppliedPassword(request);
  if (supplied !== null && (await sameSecret(supplied, expected))) {
    const response = await next();
    // Keep password-protected pages out of shared caches; the visitor's own
    // browser may still cache them as before.
    const headers = new Headers(response.headers);
    const directives = (response.headers.get('Cache-Control') || '')
      .split(',').map((d) => d.trim()).filter((d) => d && d !== 'public');
    if (!directives.includes('private')) directives.unshift('private');
    headers.set('Cache-Control', directives.join(', '));
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  return new Response('This demo is private. Ask AmCham for the password.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="AmCham demo", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
