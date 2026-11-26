/* starfit+ — funzione Netlify per gli account.
   Dal sito: /api/login, /api/me, /api/data, /api/logout.
   Amministrazione (solo con la chiave STARFIT_ADMIN_KEY, usata da admin.mjs): /api/admin/...
   I dati stanno in Netlify Blobs (archivio "starfit"), incluso nel piano gratuito. */
import { getStore } from '@netlify/blobs';
import { handle } from '../../lib/api-core.mjs';

const adminKey = () => {
  try { if (globalThis.Netlify && Netlify.env && Netlify.env.get) return Netlify.env.get('STARFIT_ADMIN_KEY') || ''; } catch (e) { /* niente */ }
  return process.env.STARFIT_ADMIN_KEY || '';
};

export default async (req) => {
  const store = getStore({ name: 'starfit', consistency: 'strong' });
  const kv = {
    get: key => store.get(key, { type: 'json' }),
    set: (key, value) => store.setJSON(key, value),
    del: key => store.delete(key),
    list: async prefix => (await store.list({ prefix })).blobs.map(b => b.key)
  };
  const url = new URL(req.url);
  let body = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try { body = await req.json(); } catch (e) { body = null; }
  }
  const headers = {};
  req.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
  const query = Object.fromEntries(url.searchParams);
  const res = await handle({ method: req.method, path: url.pathname.replace(/^\/api/, ''), headers, body, query }, kv, { adminKey: adminKey() });
  if (res.text !== undefined) return new Response(res.text, { status: res.status, headers: { 'Content-Type': res.type, 'Cache-Control': 'no-store' } });
  return new Response(JSON.stringify(res.body), {
    status: res.status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
};

export const config = { path: '/api/*' };
