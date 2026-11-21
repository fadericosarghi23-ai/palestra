#!/usr/bin/env node
/* starfit+ — gestione degli account dal PC. Dal sito non si possono creare account.

   node admin.mjs elenco                     mostra gli account
   node admin.mjs crea <nome>                crea un account (chiede la password)
   node admin.mjs password <nome>            cambia la password (chiude le sessioni aperte)
   node admin.mjs elimina <nome>             elimina l'account e i suoi dati

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
const [cmd, rawName] = args;
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
} else if (cmd === 'crea' || cmd === 'password') {
  if (!name) fail('Scrivi il nome: node admin.mjs ' + cmd + ' <nome>');
  const pass = await newPassword();
  await call(cmd === 'crea' ? 'create' : 'password', { user: name, pass });
  say(cmd === 'crea' ? '✔ Account "' + name + '" creato. Parte con la scheda completa.' : '✔ Password di "' + name + '" cambiata. Le sessioni aperte sono state chiuse.');
} else if (cmd === 'elimina') {
  if (!name) fail('Scrivi il nome: node admin.mjs elimina <nome>');
  if (!yes) {
    const c = await ask('Per eliminare "' + name + '" e tutti i suoi dati scrivi di nuovo il nome: ');
    if (c.trim().toLowerCase() !== name) fail('Nome diverso: non ho eliminato nulla.');
  }
  await call('delete', { user: name });
  say('✔ Account "' + name + '" eliminato.');
} else {
  say('Comandi:\n  node admin.mjs elenco\n  node admin.mjs crea <nome>\n  node admin.mjs password <nome>\n  node admin.mjs elimina <nome>\nAggiungi --sito https://tuosito.netlify.app per il sito online.');
}
}
main().catch(e => { if (!(e instanceof Stop)) process.stderr.write('✖ ' + (e && e.message || e) + '\n'); process.exitCode = 1; });
