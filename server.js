// Server locale per starfit+: node server.js
// Sul PC:       http://localhost:8080
// Sul telefono: http://<indirizzo del PC in rete>:8080 (stessa rete Wi-Fi), l'indirizzo viene stampato all'avvio
// Gli account in locale sono salvati in data/store.json (non va su GitHub). Online li gestisce Netlify.
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const root = path.join(__dirname, 'public'), port = process.env.PORT || 8080;
const dataFile = path.join(__dirname, 'data', 'store.json');
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json; charset=utf-8', '.json': 'application/json; charset=utf-8'
};
const allowed = new Set(['.html', '.js', '.css', '.svg', '.png', '.webmanifest', '.json']);

// Archivio chiave/valore su file, stessa interfaccia di Netlify Blobs
let db = {};
try { db = JSON.parse(fs.readFileSync(dataFile, 'utf8')); } catch (e) { db = {}; }
const saveDb = () => { fs.mkdirSync(path.dirname(dataFile), { recursive: true }); fs.writeFileSync(dataFile, JSON.stringify(db, null, 1)); };
const kv = {
  get: async k => (k in db ? JSON.parse(JSON.stringify(db[k])) : null),
  set: async (k, v) => { db[k] = v; saveDb(); },
  del: async k => { delete db[k]; saveDb(); },
  list: async prefix => Object.keys(db).filter(k => k.startsWith(prefix))
};
const core = import('./lib/api-core.mjs');
// Chiave di amministrazione: variabile STARFIT_ADMIN_KEY oppure file admin.key (non va su GitHub)
const adminKey = () => {
  if (process.env.STARFIT_ADMIN_KEY) return process.env.STARFIT_ADMIN_KEY.trim();
  try { return fs.readFileSync(path.join(__dirname, 'admin.key'), 'utf8').trim(); } catch (e) { return ''; }
};

function api(req, res) {
  let raw = '';
  req.on('data', c => { raw += c; if (raw.length > 1e6) req.destroy(); });
  req.on('end', async () => {
    let body = null;
    try { body = raw ? JSON.parse(raw) : null; } catch (e) { body = null; }
    const { handle } = await core;
    const u = new URL(req.url, 'http://localhost');
    const out = await handle({ method: req.method, path: u.pathname.replace(/^\/api/, ''), headers: req.headers, body, query: Object.fromEntries(u.searchParams) }, kv, { adminKey: adminKey() });
    if (out.text !== undefined) { res.writeHead(out.status, { 'Content-Type': out.type, 'Cache-Control': 'no-store' }); return res.end(out.text); }
    res.writeHead(out.status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(out.body));
  });
}

http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) return api(req, res);
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(root, p));
  const ext = path.extname(file);
  if (!file.startsWith(root + path.sep) || !allowed.has(ext) || p.includes('/.')) { res.writeHead(404); return res.end('Non trovato'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Non trovato'); }
    res.writeHead(200, { 'Content-Type': types[ext], 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(port, '0.0.0.0', () => {
  console.log('starfit+ è acceso.');
  console.log('  Sul PC:       http://localhost:' + port);
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  ips.forEach(ip => console.log('  Sul telefono: http://' + ip + ':' + port + '   (stessa rete Wi-Fi del PC)'));
});
