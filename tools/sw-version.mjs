// starfit+ — versione dell'app calcolata dai suoi file.
// I telefoni riscaricano l'app solo quando cambia VERSION in public/sw.js: questo script la aggiorna da solo.
//   node tools/sw-version.mjs          aggiorna VERSION se i file sono cambiati
//   node tools/sw-version.mjs --check  controlla soltanto (usato prima del push): esce con errore se è vecchia
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const swFile = path.join(root, 'sw.js');
const sw = readFileSync(swFile, 'utf8');
const shell = (/const SHELL = \[([\s\S]*?)\];/.exec(sw) || [])[1];
if (!shell) { console.error('Non trovo SHELL in public/sw.js'); process.exit(2); }
const files = [...shell.matchAll(/'\.\/([^']*)'/g)].map(m => m[1] || 'index.html');
// testi senza \r: Windows e GitHub danno la stessa versione
const CRLF = /\r\n/g;
const norm = (f, b) => /\.(png|jpg|ico)$/.test(f) ? b : Buffer.from(b.toString('utf8').replace(CRLF, '\n'));
const h = createHash('sha256');
for (const f of [...new Set(files)].sort()) h.update(f + '\n').update(norm(f, readFileSync(path.join(root, f))));
// anche il resto del service worker conta (senza la riga della versione)
h.update(sw.replace(CRLF, '\n').replace(/const VERSION = '[^']*';/, ''));
const want = 'fit-' + h.digest('hex').slice(0, 10);
const have = (/const VERSION = '([^']*)';/.exec(sw) || [])[1];

if (process.argv.includes('--check')) {
  if (have !== want) { console.error('✗ La versione dell\'app in public/sw.js è vecchia (' + have + ' invece di ' + want + ').\n  Esegui: node tools/sw-version.mjs  e fai un commit.'); process.exit(1); }
  console.log('✔ Versione dell\'app aggiornata: ' + have);
} else if (have === want) console.log('✔ Già aggiornata: ' + have);
else { writeFileSync(swFile, sw.replace(/const VERSION = '[^']*';/, "const VERSION = '" + want + "';")); console.log('✔ Versione aggiornata: ' + have + ' → ' + want); }
