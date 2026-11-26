#!/usr/bin/env node
/* starfit+ — gestione degli account dal PC. Dal sito non si possono creare account.

   node admin.mjs elenco                     mostra gli account
   node admin.mjs crea <nome> --programma <id>   crea un account con il suo programma (chiede la password)
   node admin.mjs programma <nome> <id>          cambia il programma (chiede la password dell'account)
   node admin.mjs password <nome>                cambia la password (chiude le sessioni aperte)
   node admin.mjs elimina <nome>                 elimina l'account e i suoi dati
   node admin.mjs programmi                      mostra i programmi disponibili
   node admin.mjs crea <nome> --scheda <file>    crea un account con la sua scheda personale (file in data/clienti/)
   node admin.mjs scheda <nome> <file>           carica o aggiorna la scheda personale di un account
   node admin.mjs demo --programma <id>          account demo condiviso con dati di esempio (si azzera ogni giorno)

   Di base lavora sul server locale (http://localhost:8080).
   Per il sito online aggiungi:  --sito https://tuosito.netlify.app
   La chiave segreta si legge dal file admin.key (o dalla variabile STARFIT_ADMIN_KEY)
   e deve essere uguale a quella impostata su Netlify. */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const yes = (() => { const i = args.indexOf('--si'); if (i >= 0) { args.splice(i, 1); return true; } return false; })();
const site = (flag('--sito') || process.env.STARFIT_SITE || 'http://localhost:8080').replace(/\/+$/, '');
const progFlag = flag('--programma');
const [cmd, rawName, rawProg] = args;
const name = (rawName || '').trim().toLowerCase();

const say = s => process.stdout.write(s + '\n');
// Niente process.exit: su Windows interrompere mentre la rete chiude le connessioni dà un errore di Node
class Stop extends Error {}
const fail = s => { process.stderr.write('✖ ' + s + '\n'); throw new Stop(s); };

function key() {
  if (process.env.STARFIT_ADMIN_KEY) return process.env.STARFIT_ADMIN_KEY.trim();
  try { return fs.readFileSync(path.join(here, 'admin.key'), 'utf8').trim(); } catch (e) { return ''; }
}
function ask(q, hidden) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = s => { if (s.includes(q)) rl.output.write(q); else if (s !== '\r\n' && s !== '\n') rl.output.write('•'.repeat(s.length)); };
    }
    rl.question(q, a => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(a); });
  });
}
async function call(p, body) {
  let r;
  try {
    r = await fetch(site + '/api/admin/' + p, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key() },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (e) { if (e instanceof Stop) throw e; fail('Non riesco a raggiungere ' + site + '. Se è il server locale, avvialo con: node server.js'); }
  let j = {};
  try { j = await r.json(); } catch (e) { /* niente */ }
  if (!r.ok) fail(j.error || ('Errore ' + r.status + ' da ' + site));
  return j;
}
// Programmi disponibili: letti da public/data.js
function programs() {
  const win = {};
  new Function('window', fs.readFileSync(path.join(here, 'public', 'data.js'), 'utf8'))(win);
  return win.FitData.PROGRAMS;
}
function checkProgram(id) {
  const P = programs();
  if (!P[id]) fail('Programma "' + id + '" sconosciuto. Disponibili: ' + Object.keys(P).join(', '));
  return P[id];
}
// Entra come l'utente (serve la sua password) per impostare i suoi dati, poi esce
async function asUser(user, pass, fn) {
  const post = (p, body, tok) => fetch(site + '/api' + p, { method: p === '/data' ? 'PUT' : (p === '/me' ? 'GET' : 'POST'), headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}), body: body ? JSON.stringify(body) : undefined }).then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) fail(j.error || 'Errore ' + r.status); return j; });
  const login = await post('/login', { user, pass });
  try { await fn({ data: login.data || {}, save: d => post('/data', { data: d }, login.token) }); }
  finally { await post('/logout', null, login.token).catch(() => {}); }
}
// Scheda personale di un cliente da file JSON (resta sul PC, in data/clienti/): controlla giorni ed esercizi
function readScheda(file) {
  let sc; try { sc = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')); } catch (e) { fail('Non riesco a leggere la scheda ' + file + ': ' + e.message); }
  if (!sc || !Array.isArray(sc.days) || sc.days.length !== 7) fail('La scheda deve avere 7 giorni (da lunedì a domenica).');
  const win = {};
  new Function('window', fs.readFileSync(path.join(here, 'public', 'data.js'), 'utf8'))(win);
  new Function('window', fs.readFileSync(path.join(here, 'public', 'library.js'), 'utf8'))(win);
  const EX = Object.assign({}, win.FitLib, win.FitData.EX), miss = [];
  sc.days.forEach(d => (d.items || []).forEach(it => { if (!it.link && !EX[it.ex]) miss.push(it.ex); }));
  (sc.mob || []).forEach(m => { if (!EX[m.ex]) miss.push(m.ex); });
  if (miss.length) fail('Esercizi che non esistono nella libreria: ' + [...new Set(miss)].join(', '));
  return sc;
}
async function newPassword() {
  if (process.env.STARFIT_PASS) return process.env.STARFIT_PASS;
  const a = await ask('Password per ' + name + ': ', true);
  const b = await ask('Ripeti la password: ', true);
  if (a !== b) fail('Le due password non coincidono.');
  if (a.length < 4) fail('La password deve avere almeno 4 caratteri.');
  return a;
}

async function main() {
if (!key()) fail('Manca la chiave segreta: crea il file admin.key oppure imposta STARFIT_ADMIN_KEY.');
say('starfit+ · ' + site);

if (cmd === 'elenco') {
  const { users } = await call('users');
  if (!users.length) say('Nessun account.');
  users.forEach(u => say('  • ' + u.name + '   (creato il ' + new Date(u.created).toLocaleDateString('it-IT') + ')'));
} else if (cmd === 'demo') {
  // Account demo condiviso: crea l'account (se manca) e carica i dati di esempio come modello.
  // Ogni giorno il sito riparte da questo modello, con le date spostate a oggi.
  const progId = (progFlag || 'terzino').trim().toLowerCase(); checkProgram(progId);
  const win = {};
  new Function('window', fs.readFileSync(path.join(here, 'public', 'data.js'), 'utf8'))(win);
  new Function('window', fs.readFileSync(path.join(here, 'demo', 'seed.js'), 'utf8'))(win);
  const t = new Date(), day = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  const doc = win.FitDemoSeed(win.FitData, progId, t);
  const { users } = await call('users');
  if (!users.some(u => u.name === 'demo')) {
    say("L'account \"demo\" non esiste: lo creo. Scegli la password da dare a chi prova l'app.");
    const pass = await newPassword();
    await call('create', { user: 'demo', pass });
  }
  await call('demo', { doc, day });
  say('✔ Account demo pronto con la scheda "' + progId + '": ogni giorno riparte dai dati di esempio.');
} else if (cmd === 'programmi') {
  const P = programs();
  Object.values(P).forEach(p => say('  • ' + p.id + '   ' + p.name));
} else if (cmd === 'scheda') {
  // Carica (o aggiorna) la scheda personale di un account: node admin.mjs scheda <nome> <file.json>
  if (!name || !rawProg) fail('Scrivi nome e file: node admin.mjs scheda <nome> data/clienti/<nome>.json');
  const sc = readScheda(rawProg);
  await call('scheda', { user: name, scheda: sc });
  say("✔ Scheda \"" + (sc.name || rawProg) + "\" caricata nell'account \"" + name + "\". Si aggiorna alla prossima apertura dell'app.");
} else if (cmd === 'crea' || cmd === 'password') {
  if (!name) fail('Scrivi il nome: node admin.mjs ' + cmd + ' <nome>' + (cmd === 'crea' ? ' --programma <id> oppure --scheda <file.json>' : ''));
  const schedaFile = flag('--scheda');
  const sc = cmd === 'crea' && schedaFile ? readScheda(schedaFile) : null;
  const progId = (progFlag || 'terzino').trim().toLowerCase();
  const prog = cmd === 'crea' && !sc ? checkProgram(progId) : null;
  const pass = await newPassword();
  await call(cmd === 'crea' ? 'create' : 'password', { user: name, pass });
  if (cmd === 'crea' && sc) {
    await call('scheda', { user: name, scheda: sc });
    say('✔ Account "' + name + '" creato con la scheda personale "' + (sc.name || schedaFile) + '".');
  } else if (cmd === 'crea') {
    await asUser(name, pass, ({ data, save }) => save(Object.assign({}, data, { program: progId })));
    say('✔ Account "' + name + '" creato con il programma "' + prog.name + '".');
  } else say('✔ Password di "' + name + '" cambiata. Le sessioni aperte sono state chiuse.');
} else if (cmd === 'programma') {
  if (!name || !rawProg) fail('Scrivi nome e programma: node admin.mjs programma <nome> <id>');
  const progId = rawProg.trim().toLowerCase(), prog = checkProgram(progId);
  const pass = process.env.STARFIT_PASS || await ask('Password di ' + name + ': ', true);
  await asUser(name, pass, ({ data, save }) => {
    const d = Object.assign({}, data, { program: progId });
    if (data.program !== progId) { delete d.plan; delete d.done; delete d.sets; } // scheda nuova: si riparte puliti
    return save(d);
  });
  say('✔ "' + name + '" ora usa il programma "' + prog.name + '". Si aggiorna alla prossima apertura dell\'app.');
} else if (cmd === 'elimina') {
  if (!name) fail('Scrivi il nome: node admin.mjs elimina <nome>');
  if (!yes) {
    const c = await ask('Per eliminare "' + name + '" e tutti i suoi dati scrivi di nuovo il nome: ');
    if (c.trim().toLowerCase() !== name) fail('Nome diverso: non ho eliminato nulla.');
  }
  await call('delete', { user: name });
  say('✔ Account "' + name + '" eliminato.');
} else {
  say('Comandi:\n  node admin.mjs elenco\n  node admin.mjs programmi\n  node admin.mjs crea <nome> --programma <id>\n  node admin.mjs programma <nome> <id>\n  node admin.mjs password <nome>\n  node admin.mjs elimina <nome>\nAggiungi --sito https://starfitplus.netlify.app per il sito online.');
}
}
main().catch(e => { if (!(e instanceof Stop)) process.stderr.write('✖ ' + (e && e.message || e) + '\n'); process.exitCode = 1; });
