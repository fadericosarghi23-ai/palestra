// starfit+ — costruisce la DEMO (sito statico, senza account né server) a partire da public/.
//   node tools/build-demo.mjs <cartella di destinazione>
// La destinazione è il repository della demo (github.com/fadericosarghi23-ai/demostarfit).
// Cosa cambia rispetto all'app vera:
//   - account.js è sostituito da demo/account-demo.js (account demo, dati solo sul telefono, azzerati ogni giorno)
//   - altezza e peso veri nelle schede sono sostituiti da valori di esempio
//   - niente funzioni Netlify, niente chiavi: solo file statici
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'public'), out = path.resolve(process.argv[2] || path.join(root, 'demo-repo'));
if (!existsSync(out)) mkdirSync(out, { recursive: true });

// 1) copia i file dell'app
for (const f of readdirSync(src)) { const p = path.join(src, f); if (statSync(p).isFile()) copyFileSync(p, path.join(out, f)); }

// 2) account demo, con lo stesso logo dell'app
const logo = (/window\.FitLogo = \(\) => '([^']*)';/.exec(readFileSync(path.join(src, 'account.js'), 'utf8')) || [])[1] || '';
writeFileSync(path.join(out, 'account.js'), readFileSync(path.join(root, 'demo', 'account-demo.js'), 'utf8').replace("'__LOGO__'", () => "'" + logo + "'"));

// 3) niente dati personali: valori di esempio nelle schede
const sub = [['1,85 m', '1,80 m'], ['80–82 kg', '76 kg'], ['85 kg', '80 kg'], ['1,67 m', '1,65 m'], ['51 kg', '58 kg']];
let data = readFileSync(path.join(out, 'data.js'), 'utf8');
for (const [a, b] of sub) data = data.split(a).join(b);
writeFileSync(path.join(out, 'data.js'), data);

// 4) pagina: titolo, avviso demo e stile
let html = readFileSync(path.join(out, 'index.html'), 'utf8');
html = html.replace(/<title>[^<]*<\/title>/, '<title>starfit+ · demo</title>');
html = html.replace('</style>', () => `
/* Demo */
.demo-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 16px; background: var(--iron-2); color: var(--on-iron); font-size: 12px; }
.demo-bar b { color: var(--fire-bright); }
.demo-bar button { flex: 0 0 auto; background: transparent; color: var(--on-iron); border: 1px solid var(--iron-3); border-radius: 8px; padding: 6px 10px; font: 600 12px/1 var(--body); cursor: pointer; }
.demo-pick { display: grid; gap: 10px; margin: 18px 0; }
.demo-opt { text-align: left; background: var(--iron-2); color: var(--on-iron); border: 1px solid var(--iron-3); border-radius: 14px; padding: 16px; cursor: pointer; font: inherit; }
.demo-opt b { display: block; font: 700 18px/1.2 var(--display); letter-spacing: -0.01em; }
.demo-opt span { display: block; margin-top: 4px; font-size: 13px; color: var(--on-iron-muted); }
.demo-opt:active { transform: scale(.98); }
</style>`);
writeFileSync(path.join(out, 'index.html'), html);

// 5) manifest e versione propria della demo (così non si mischia con l'app vera)
const man = JSON.parse(readFileSync(path.join(out, 'manifest.webmanifest'), 'utf8'));
man.name = 'starfit+ demo'; man.short_name = 'starfit+ demo';
writeFileSync(path.join(out, 'manifest.webmanifest'), JSON.stringify(man, null, 2));
const sw = readFileSync(path.join(out, 'sw.js'), 'utf8');
const shell = [...((/const SHELL = \[([\s\S]*?)\];/.exec(sw) || [])[1] || '').matchAll(/'\.\/([^']*)'/g)].map(m => m[1] || 'index.html');
const hash = createHash('sha256'); for (const f of [...new Set(shell)].sort()) hash.update(f).update(readFileSync(path.join(out, f)));
writeFileSync(path.join(out, 'sw.js'), sw.replace(/const VERSION = '[^']*';/, "const VERSION = 'fit-demo-" + hash.digest('hex').slice(0, 10) + "';"));

// 6) file del repository della demo
writeFileSync(path.join(out, '.nojekyll'), '');
writeFileSync(path.join(out, 'README.md'), `# starfit+ · demo

Versione dimostrativa di starfit+, l'app di allenamento per telefono.

- **Account demo**: si entra con **utente \`demo\` e password \`starfit\`**, poi si sceglie una scheda di esempio (calciatore o palestra glutei). Le credenziali sono uguali per tutti: la demo non ha server e non protegge dati.
- **Dati di esempio** già compilati: allenamenti, carichi, peso, pasti, costanza, misure.
- **Solo su questo telefono**: niente viene inviato a un server e i dati si azzerano ogni giorno. Non è un account personale.
- Funzionano anche offline e si può aggiungere alla schermata Home dell'iPhone.

Le funzioni che hanno bisogno del server (comandi dell'Apple Watch, notifiche, sfida vera tra persone) nella demo sono solo mostrate.

## Pubblicare con GitHub Pages (gratis)

Settings → Pages → *Deploy from a branch* → \`main\` / \`(root)\` → Save. Dopo un minuto la demo è su \`https://<utente>.github.io/demostarfit/\`.

Questa cartella è generata dall'app con \`node tools/build-demo.mjs\`: non modificarla a mano.
`);
console.log('Demo costruita in ' + out);
