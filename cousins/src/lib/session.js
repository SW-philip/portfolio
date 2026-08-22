const COOKIE_NAME = 'cousins_session';

function base64urlEncode(bytesLike) {
  const bytes = bytesLike instanceof ArrayBuffer ? new Uint8Array(bytesLike) : bytesLike;
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(b64url) {
  const pad = (4 - (b64url.length % 4)) % 4;
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  const str = atob(b64);
  return Uint8Array.from(str, c => c.charCodeAt(0));
}

async function importKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signSession(payload, secret) {
  const key = await importKey(secret);
  const payloadB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${base64urlEncode(sigBuf)}`;
}

export async function verifySession(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadB64, sigB64] = token.split('.');
  const key = await importKey(secret);
  const valid = await crypto.subtle.verify(
    'HMAC', key, base64urlDecode(sigB64), new TextEncoder().encode(payloadB64),
  );
  if (!valid) return null;
  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64)));
  } catch {
    return null;
  }
  if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
  return payload;
}

export function cookieHeader(token, maxAgeSeconds) {
  return `${COOKIE_NAME}=${token}; Path=/cousins; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export function clearCookieHeader() {
  return `${COOKIE_NAME}=; Path=/cousins; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function readSessionCookie(request) {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  const match = header.split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE_NAME}=`));
  return match ? match.slice(COOKIE_NAME.length + 1) : null;
}
