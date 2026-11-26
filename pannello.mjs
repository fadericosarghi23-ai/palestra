// starfit+ — pannello degli account, SOLO sul PC: node pannello.mjs [--sito https://starfitplus.netlify.app]
// Apre http://localhost:8099 con tutti gli account: stato (pagato, tester, demo…), scheda, ultimo uso,
// password create da qui, nuovi account, schede dei clienti. Usa la chiave admin.key del PC: non è mai online.
// Le password create dal pannello sono salvate solo in data/account-password.json (non va su GitHub).
import http from 'node:http';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), flag = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const site = (flag('--sito') || 'https://starfitplus.netlify.app').replace(/\/+$/, '');
const PORT = +(flag('--porta') || 8099);
const key = () => { if (process.env.STARFIT_ADMIN_KEY) return process.env.STARFIT_ADMIN_KEY.trim(); try { return readFileSync(path.join(here, 'admin.key'), 'utf8').trim(); } catch (e) { return ''; } };
const PWFILE = path.join(here, 'data', 'account-password.json'), CLIENTI = path.join(here, 'data', 'clienti');
const readPw = () => { try { return JSON.parse(readFileSync(PWFILE, 'utf8')); } catch (e) { return {}; } };
const savePw = o => { mkdirSync(path.dirname(PWFILE), { recursive: true }); writeFileSync(PWFILE, JSON.stringify(o, null, 2)); };
// password facili da dettare: niente lettere che si confondono (l, 1, O, 0)
const genPass = () => { const A = 'abcdefghjkmnpqrstuvwxyz23456789'; const b = randomBytes(10); let s = ''; for (let i = 0; i < 10; i++) s += A[b[i] % A.length]; return s.slice(0, 5) + '-' + s.slice(5); };

async function admin(p, body) {
  const r = await fetch(site + '/api/admin/' + p, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key() }, body: body ? JSON.stringify(body) : undefined });
  let j = {}; try { j = await r.json(); } catch (e) { /* niente */ }
  if (!r.ok) throw new Error(j.error || ('Errore ' + r.status + ' da ' + site));
  return j;
}
async function asUser(user, pass, program) { // imposta il programma entrando come l'utente (serve se il sito non ha ancora /admin/programma)
  const call = (p, m, b, t) => fetch(site + '/api' + p, { method: m, headers: Object.assign({ 'Content-Type': 'application/json' }, t ? { Authorization: 'Bearer ' + t } : {}), body: b ? JSON.stringify(b) : undefined }).then(r => r.json());
  const l = await call('/login', 'POST', { user, pass });
  if (!l.token) throw new Error(l.error || 'Accesso non riuscito');
  await call('/data', 'PUT', { data: Object.assign({}, l.data || {}, { program }) }, l.token);
  await call('/logout', 'POST', null, l.token);
}
const schede = () => existsSync(CLIENTI) ? readdirSync(CLIENTI).filter(f => f.endsWith('.json')) : [];
const readScheda = f => { if (!/^[\w.-]+\.json$/.test(f)) throw new Error('File non valido'); return JSON.parse(readFileSync(path.join(CLIENTI, f), 'utf8')); };

async function api(p, body) {
  if (p === 'stato') return { site, schede: schede(), keyOk: key().length >= 32 };
  if (p === 'users') {
    const { users } = await admin('users'), pw = readPw();
    return { users: users.map(u => Object.assign(u, { pass: pw[u.name] ? pw[u.name].pass : null, passAt: pw[u.name] ? pw[u.name].at : null })) };
  }
  const user = String(body.user || '').trim().toLowerCase();
  if (p === 'meta') return admin('meta', { user, meta: body.meta || {} });
  if (p === 'password') {
    const pass = String(body.pass || '').trim() || genPass();
    await admin('password', { user, pass });
    const pw = readPw(); pw[user] = { pass, at: Date.now() }; savePw(pw);
    return { ok: true, pass };
  }
  if (p === 'crea') {
    const pass = String(body.pass || '').trim() || genPass();
    await admin('create', { user, pass });
    const pw = readPw(); pw[user] = { pass, at: Date.now() }; savePw(pw);
    if (body.scheda) await admin('scheda', { user, scheda: readScheda(body.scheda) });
    else if (body.program && body.program !== 'terzino') { try { await admin('programma', { user, program: body.program }); } catch (e) { await asUser(user, pass, body.program); } }
    if (body.stato) await admin('meta', { user, meta: { stato: body.stato, importo: body.importo || '', note: body.note || '' } });
    return { ok: true, pass };
  }
  if (p === 'scheda') return admin('scheda', { user, scheda: readScheda(body.scheda) });
  if (p === 'programma') return admin('programma', { user, program: String(body.program || '') });
  if (p === 'elimina') { const r = await admin('delete', { user }); const pw = readPw(); delete pw[user]; savePw(pw); return r; }
  throw new Error('Comando sconosciuto');
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); return res.end(readFileSync(path.join(here, 'tools', 'pannello.html'), 'utf8')); }
  if (!url.pathname.startsWith('/p/')) { res.writeHead(404); return res.end(); }
  // solo dalla pagina del pannello (niente richieste da altri siti)
  if (req.headers['x-pannello'] !== '1' || (req.headers.origin && !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(req.headers.origin))) { res.writeHead(403); return res.end(); }
  let raw = ''; req.on('data', c => { raw += c; if (raw.length > 1e6) req.destroy(); });
  req.on('end', async () => {
    let body = {}; try { body = raw ? JSON.parse(raw) : {}; } catch (e) { body = {}; }
    try { const r = await api(url.pathname.slice(3), body); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(r)); }
    catch (e) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
  });
}).listen(PORT, '127.0.0.1', () => console.log('Pannello di starfit+ su http://localhost:' + PORT + '  (account di ' + site + ')'));
