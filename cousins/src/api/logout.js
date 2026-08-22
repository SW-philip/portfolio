import { clearCookieHeader } from '../lib/session.js';
import { jsonResponse } from '../lib/http.js';

export async function handleLogout() {
  return jsonResponse({ ok: true }, 200, { 'Set-Cookie': clearCookieHeader() });
}
