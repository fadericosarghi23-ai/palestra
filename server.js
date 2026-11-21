// Server locale per Progetto Missile: node server.js
// Sul PC:       http://localhost:8080
// Sul telefono: http://<indirizzo del PC in rete>:8080 (stessa rete Wi-Fi), l'indirizzo viene stampato all'avvio
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const root = path.join(__dirname, 'public'), port = process.env.PORT || 8080;
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json; charset=utf-8', '.json': 'application/json; charset=utf-8'
};
const allowed = new Set(['.html', '.js', '.css', '.svg', '.png', '.webmanifest', '.json']);
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(root, p));
  const ext = path.extname(file);
  if (!file.startsWith(root + path.sep) || !allowed.has(ext) || p.includes('/.') || /server\.js$/.test(file)) { res.writeHead(404); return res.end('Non trovato'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Non trovato'); }
    res.writeHead(200, { 'Content-Type': types[ext], 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(port, '0.0.0.0', () => {
  console.log('Progetto Missile è acceso.');
  console.log('  Sul PC:       http://localhost:' + port);
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  ips.forEach(ip => console.log('  Sul telefono: http://' + ip + ':' + port + '   (stessa rete Wi-Fi del PC)'));
});
