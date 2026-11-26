/* starfit+ — logica degli account, uguale su Netlify e sul server locale.
   kv è un archivio chiave/valore con get(key), set(key, value), del(key), list(prefix).
   Dal sito si può solo accedere: gli account si creano con admin.mjs, che usa la chiave
   segreta STARFIT_ADMIN_KEY (variabile d'ambiente su Netlify, file admin.key sul PC).
   Le password non vengono mai salvate in chiaro: solo scrypt con sale casuale.
   I token di sessione sono salvati solo come hash SHA-256. */
import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { publicRoute, sessionRoute, getWx } from './watch-core.mjs';

const NAME = /^[a-z0-9._-]{3,24}$/;
const MAX_DATA = 1500000; // ~1,5 MB per account
const LOCK_AFTER = 8, LOCK_MS = 5 * 60 * 1000;
const DUMMY_SALT = 'a'.repeat(32);

const out = (status, body) => ({ status, body });
const sha = t => createHash('sha256').update(String(t)).digest('hex');
const hashPass = (pass, salt) => scryptSync(pass, salt, 32, { N: 16384, r: 8, p: 1 }).toString('hex');
const sameSecret = (a, b) => { const x = Buffer.from(sha(a), 'hex'), y = Buffer.from(sha(b), 'hex'); return timingSafeEqual(x, y); };

function bearer(headers) {
  const m = /^Bearer ([a-f0-9]{64})$/.exec((headers && headers.authorization) || '');
  return m ? m[1] : null;
}
function checkName(name) { return NAME.test(name) ? null : 'Il nome utente deve avere da 3 a 24 caratteri: lettere minuscole, numeri, punto o trattino.'; }
function checkPass(pass) { return pass.length >= 4 && pass.length <= 200 ? null : 'La password deve avere almeno 4 caratteri.'; }

async function admin(method, path, body, kv) {
  const name = String((body && body.user) || '').trim().toLowerCase();
  const pass = String((body && body.pass) || '');
  if (method === 'GET' && path === '/admin/users') {
    const keys = await kv.list('user:');
    const users = [];
    for (const k of keys) { const u = await kv.get(k); if (u) users.push({ name: u.name, created: u.created }); }
    users.sort((a, b) => a.name.localeCompare(b.name));
    return out(200, { users });
  }
  if (method === 'POST' && (path === '/admin/create' || path === '/admin/password')) {
    const e = checkName(name) || checkPass(pass);
    if (e) return out(400, { error: e });
    const key = 'user:' + name, user = await kv.get(key);
    if (path === '/admin/create' && user) return out(409, { error: 'L\'account "' + name + '" esiste già. Per cambiare la password usa: password ' + name });
    if (path === '/admin/password' && !user) return out(404, { error: 'L\'account "' + name + '" non esiste.' });
    const salt = randomBytes(16).toString('hex');
    await kv.set(key, { name, salt, hash: hashPass(pass, salt), created: user ? user.created : Date.now() });
    await kv.del('fail:' + name);
    if (path === '/admin/password') { // chiude le sessioni aperte con la password vecchia
      for (const k of await kv.list('tok:')) { const t = await kv.get(k); if (t && t.name === name) await kv.del(k); }
    }
    return out(200, { ok: true, user: name });
  }
  if (method === 'POST' && path === '/admin/delete') {
    if (checkName(name)) return out(400, { error: checkName(name) });
    if (!(await kv.get('user:' + name))) return out(404, { error: 'L\'account "' + name + '" non esiste.' });
    await kv.del('user:' + name); await kv.del('data:' + name); await kv.del('fail:' + name);
    for (const k of await kv.list('tok:')) { const t = await kv.get(k); if (t && t.name === name) await kv.del(k); }
    return out(200, { ok: true, user: name });
  }
  return out(404, { error: 'Comando non trovato.' });
}

export async function handle(req, kv, opts) {
  const { method, path, body } = req;
  const headers = req.headers || {};
  try {
    // ---- amministrazione: solo con la chiave segreta ----
    if (path.startsWith('/admin/')) {
      const key = opts && opts.adminKey;
      if (!key || key.length < 32) return out(403, { error: 'Amministrazione non attiva: manca STARFIT_ADMIN_KEY sul server.' });
      const given = headers['x-admin-key'] || '';
      if (!given || !sameSecret(given, key)) return out(403, { error: 'Chiave di amministrazione sbagliata.' });
      return await admin(method, path, body, kv);
    }

    // ---- Apple Watch e comandi rapidi (codice personale), chiave delle notifiche ----
    const pub = await publicRoute(req, kv, opts || {});
    if (pub) return pub;

    // ---- accesso ----
    if (method === 'POST' && path === '/login') {
      const name = String((body && body.user) || '').trim().toLowerCase();
      const pass = String((body && body.pass) || '');
      if (!name || !pass) return out(400, { error: 'Scrivi nome utente e password.' });
      const failKey = 'fail:' + name;
      const fail = NAME.test(name) ? await kv.get(failKey) : null;
      if (fail && fail.until > Date.now()) return out(429, { error: 'Troppi tentativi sbagliati. Riprova tra 5 minuti.' });
      const user = NAME.test(name) ? await kv.get('user:' + name) : null;
      const calc = hashPass(pass, user ? user.salt : DUMMY_SALT);
      const ok = !!user && timingSafeEqual(Buffer.from(calc, 'hex'), Buffer.from(user.hash, 'hex'));
      if (!ok) {
        if (NAME.test(name)) {
          const n = (fail && !fail.until ? fail.n : 0) + 1;
          await kv.set(failKey, { n: n >= LOCK_AFTER ? 0 : n, until: n >= LOCK_AFTER ? Date.now() + LOCK_MS : 0 });
        }
        return out(401, { error: 'Nome utente o password sbagliati.' });
      }
      if (fail) await kv.del(failKey);
      const token = randomBytes(32).toString('hex');
      await kv.set('tok:' + sha(token), { name, created: Date.now() });
      const data = await kv.get('data:' + name);
      return out(200, { token, user: name, data: data || null, wx: await getWx(kv, name) });
    }

    // ---- da qui serve una sessione ----
    const token = bearer(headers);
    const session = token ? await kv.get('tok:' + sha(token)) : null;
    if (!session || !(await kv.get('user:' + session.name))) return out(401, { error: 'Sessione scaduta. Accedi di nuovo.' });
    const name = session.name;

    if (method === 'GET' && path === '/me') {
      const data = (await kv.get('data:' + name)) || null, since = req.query && req.query.since;
      // Se l'app ha già la versione più recente, niente dati: si risparmia traffico (e crediti)
      if (since && data && String(data.savedAt) === String(since)) return out(200, { user: name, same: true, wx: await getWx(kv, name) });
      return out(200, { user: name, data, wx: await getWx(kv, name) });
    }
    if (path.startsWith('/watch/') || path.startsWith('/push/') || path === '/sfida') {
      const r = await sessionRoute(req, kv, name, opts || {});
      if (r) return r;
    }
    if (method === 'PUT' && path === '/data') {
      const data = body && body.data;
      if (!data || typeof data !== 'object' || Array.isArray(data)) return out(400, { error: 'Dati non validi.' });
      if (JSON.stringify(data).length > MAX_DATA) return out(413, { error: 'Troppi dati da salvare.' });
      const savedAt = Date.now();
      await kv.set('data:' + name, Object.assign({}, data, { savedAt }));
      return out(200, { ok: true, savedAt });
    }
    if (method === 'POST' && path === '/logout') {
      await kv.del('tok:' + sha(token));
      return out(200, { ok: true });
    }
    return out(404, { error: 'Indirizzo non trovato.' });
  } catch (e) {
    return out(500, { error: 'Errore del server. Riprova tra poco.' });
  }
}
