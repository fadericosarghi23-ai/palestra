/* starfit+ — Apple Watch e iPhone: comandi rapidi, calendario e notifiche.
   - Codice personale: chi lo ha può leggere la scheda di oggi e segnare esercizi, peso e attività,
     ma non può leggere né cambiare la password. Si crea e si cambia dall'app (sessione valida).
   - Quello che arriva dai comandi va in "wx:<nome>", separato dai dati dell'app: l'app lo unisce
     ai suoi dati quando si apre, così nessuno dei due sovrascrive l'altro.
   - Le chiavi delle notifiche (VAPID) sono ricavate dalla chiave di amministrazione: niente da configurare. */
import { randomBytes, createHash, hkdfSync, createECDH } from 'node:crypto';

const sha = t => createHash('sha256').update(String(t)).digest('hex');
const out = (status, body) => ({ status, body });
const text = (status, t, type) => ({ status, text: t, type: type || 'text/plain; charset=utf-8' });
const DAYS = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
const DAY_NAMES = { lun: 'Lunedì', mar: 'Martedì', mer: 'Mercoledì', gio: 'Giovedì', ven: 'Venerdì', sab: 'Sabato', dom: 'Domenica' };
const SITE = 'https://starfitplus.netlify.app';

/* ---------- ora italiana ---------- */
export function rome(ts) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(new Date(ts));
  const g = t => (p.find(x => x.type === t) || {}).value;
  const wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(g('weekday'));
  return { date: g('year') + '-' + g('month') + '-' + g('day'), hm: g('hour') + ':' + g('minute'), wd, id: DAYS[wd] };
}
const addDays = (date, n) => { const [y, m, d] = date.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10); };
const wdOf = date => { const [y, m, d] = date.split('-').map(Number); return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; };
const kg1 = n => n.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/* ---------- recupero in secondi: "90″" → 90, "2–3′" → 120, "60–90″" → 60 ---------- */
export function restSeconds(r) {
  const s = String(r || '').replace(/\s/g, '');
  let m = /^(\d+)(?:[–-]\d+)?′(?:(\d+)″)?/.exec(s);
  if (m) return +m[1] * 60 + (+m[2] || 0);
  m = /^(\d+)(?:[–-]\d+)?″/.exec(s);
  if (m) return +m[1];
  return 0;
}

/* ---------- codice personale ---------- */
async function userByCode(kv, code) {
  if (!/^[a-f0-9]{32}$/.test(code || '')) return null;
  const rec = await kv.get('wk:' + sha(code));
  if (!rec || !(await kv.get('user:' + rec.name))) return null;
  return rec.name;
}

/* ---------- archivio dei comandi (wx) ---------- */
async function getWx(kv, name) { return (await kv.get('wx:' + name)) || { done: [], w: {}, act: {} }; }
async function saveWx(kv, name, wx, today) {
  const lim = addDays(today, -60); // tiene due mesi
  wx.done = (wx.done || []).filter(e => e.d >= lim).slice(-300);
  for (const k of ['w', 'act']) Object.keys(wx[k] || {}).forEach(d => { if (d < lim) delete wx[k][d]; });
  await kv.set('wx:' + name, wx);
}
function doneSet(data, wx) {
  const s = new Set(Object.keys((data && data.done) || {}).filter(k => data.done[k]));
  const since = (data && data.doneResetAt) || 0;
  (wx.done || []).forEach(e => { if (e.t > since) s.add(e.u); });
  return s;
}

/* ---------- scheda di oggi dalla copia che l'app tiene aggiornata (data.watch) ---------- */
function dayInfo(data, id) {
  const W = data && data.watch;
  if (!W || !W.week || !W.week[id]) return null;
  return W.week[id];
}
const itemLine = (it, done) => (done ? '✓ ' : '') + it.n + ' · ' + it.s + (it.per ? ' ' + it.per : '') + (it.r && it.r !== '—' ? ' · rec. ' + it.r : '');
function todayText(day, done, now) {
  if (!day) return 'Apri starfit+ sull\'iPhone una volta: così la scheda arriva anche qui.';
  const head = DAY_NAMES[now.id] + ' · ' + day.label + '\n' + day.title + (day.dur ? ' (' + day.dur + ')' : '');
  const items = (day.items || []);
  if (!items.length) return head + '\n\n' + (day.type === 'match' ? 'Partita: pasto con carboidrati 3–4 ore prima, riscaldamento della squadra.' : day.type === 'field' ? 'Allenamento con la squadra. Prima 10′ di mobilità.' : '10′ di mobilità e recupero.');
  const n = items.filter(i => done.has(i.u)).length;
  return head + '\n' + n + '/' + items.length + ' fatti\n\n' + items.map((it, i) => (i + 1) + '. ' + itemLine(it, done.has(it.u))).join('\n');
}
function nextItem(day, done) {
  const items = (day && day.items) || [];
  const i = items.findIndex(it => !done.has(it.u));
  return i < 0 ? null : { it: items[i], i, tot: items.length };
}
function nextText(day, done) {
  if (!day) return 'Apri starfit+ sull\'iPhone una volta: così la scheda arriva anche qui.';
  if (!(day.items || []).length) return 'Oggi niente esercizi: ' + day.label.toLowerCase() + '. ' + (day.type === 'rest' ? 'Fai i 10′ di mobilità.' : '');
  const x = nextItem(day, done);
  if (!x) return 'Allenamento finito! Tutti i ' + day.items.length + ' esercizi sono fatti. Stretching leggero e proteine.';
  return (x.i + 1) + '/' + x.tot + ' · ' + x.it.n + '\n' + x.it.s + (x.it.per ? ' ' + x.it.per : '') + (x.it.r && x.it.r !== '—' ? '\nRecupero ' + x.it.r : '') + (x.it.note ? '\n' + x.it.note : '');
}

/* ---------- calendario (iCalendar) ---------- */
const icsEsc = s => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
// Righe al massimo di 75 byte (regola dei calendari), senza spezzare i caratteri accentati
function fold(line) {
  const out = []; let cur = '', bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}
const durMin = (day) => { const m = /(\d+)(?:[–-](\d+))?′/.exec(day.dur || ''); return m ? +(m[2] || m[1]) : day.type === 'match' ? 110 : day.type === 'field' ? 90 : 60; };
function calendar(data, prefs, now) {
  const W = data.watch, at = ((prefs && prefs.allenamento && prefs.allenamento.at) || '18:00').replace(':', '') + '00';
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//starfit+//it', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:starfit+', 'X-WR-TIMEZONE:Europe/Rome',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H',
    'BEGIN:VTIMEZONE', 'TZID:Europe/Rome', 'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD', 'END:VTIMEZONE'];
  if (W && W.week && W.start && W.end) {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    let d = W.start > addDays(now.date, -14) ? W.start : addDays(now.date, -14);
    for (let guard = 0; d <= W.end && guard < 120; guard++, d = addDays(d, 1)) {
      const id = DAYS[wdOf(d)], day = W.week[id];
      if (!day || day.type === 'rest') continue;
      const wk = Math.floor((Date.parse(d) - Date.parse(W.start)) / 864e5 / 7) + 1;
      const test = (W.tests || []).includes(d), deload = (W.deload || []).includes(wk) && (day.type === 'gym');
      const start = d.replace(/-/g, '') + 'T' + at;
      const endT = new Date(Date.UTC(+start.slice(0, 4), +start.slice(4, 6) - 1, +start.slice(6, 8), +at.slice(0, 2), +at.slice(2, 4) + durMin(day)));
      const end = endT.toISOString().replace(/[-:]/g, '').slice(0, 15);
      const desc = [day.title + (day.dur ? ' · ' + day.dur : ''), test ? 'Oggi test dopo il riscaldamento: segnali nel Piano.' : '', deload ? 'Settimana di scarico: metà delle serie, carichi più leggeri.' : '']
        .concat((day.items || []).map(it => '• ' + itemLine(it, false))).filter(Boolean).join('\n');
      L.push('BEGIN:VEVENT', 'UID:' + d + '-' + id + '@starfitplus', 'DTSTAMP:' + stamp, 'DTSTART;TZID=Europe/Rome:' + start, 'DTEND;TZID=Europe/Rome:' + end,
        'SUMMARY:' + icsEsc(day.label + ' · ' + day.title + (test ? ' · Test' : '') + (deload ? ' · Scarico' : '')), 'DESCRIPTION:' + icsEsc(desc), 'URL:' + SITE + '/#' + id,
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(day.label), 'TRIGGER:-PT60M', 'END:VALARM', 'END:VEVENT');
    }
  }
  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n') + '\r\n';
}

/* ---------- notifiche: chiavi e invio ---------- */
export function vapid(adminKey) {
  if (!adminKey || adminKey.length < 32) return null;
  const d = Buffer.from(hkdfSync('sha256', adminKey, 'starfit-vapid', 'v1', 32));
  const ec = createECDH('prime256v1'); ec.setPrivateKey(d);
  return { pub: ec.getPublicKey().toString('base64url'), priv: d.toString('base64url') };
}
let wp = null;
async function webpush(adminKey) {
  const k = vapid(adminKey); if (!k) return null;
  if (!wp) wp = (await import('web-push')).default;
  wp.setVapidDetails(SITE, k.pub, k.priv);
  return wp;
}
export const DEFAULT_PREFS = {
  peso: { on: true, at: '07:30' }, allenamento: { on: true, at: '17:30' }, vigilia: { on: true, at: '20:30' },
  mobilita: { on: true, at: '21:00' }, cibo: { on: true, at: '21:30' }, riepilogo: { on: true, at: '19:00' }
};
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
function cleanPrefs(p) {
  const o = {};
  for (const k of Object.keys(DEFAULT_PREFS)) {
    const v = (p && p[k]) || {};
    const okAt = HM.test(v.at || '') && v.at >= '06:30' && v.at <= '23:00'; // di notte i promemoria sono in pausa
    o[k] = { on: v.on === undefined ? DEFAULT_PREFS[k].on : !!v.on, at: okAt ? v.at : DEFAULT_PREFS[k].at };
  }
  return o;
}
async function sendTo(kv, name, rec, msg, adminKey) {
  const w = await webpush(adminKey); if (!w) return 0;
  let sent = 0; const keep = [];
  for (const sub of rec.subs || []) {
    try { await w.sendNotification(sub, JSON.stringify(msg), { TTL: 3 * 3600 }); sent++; keep.push(sub); }
    catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) continue; keep.push(sub); }
  }
  if (keep.length !== (rec.subs || []).length) { rec.subs = keep; await kv.set('push:' + name, rec); }
  return sent;
}
// Cosa dire, per ogni promemoria, in base alla giornata. null = oggi non serve.
function reminder(type, data, wx, now, progId) {
  const day = dayInfo(data, now.id), tomorrow = dayInfo(data, DAYS[(now.wd + 1) % 7]);
  if (type === 'peso') {
    if ((data.weights && data.weights[now.date] != null) || (wx.w && wx.w[now.date])) return null;
    return { title: 'Peso di oggi', body: 'Pesati adesso, prima di colazione, e segnalo in starfit+.', url: '#oggi' };
  }
  if (type === 'allenamento') {
    if (!day || day.type === 'rest') return null;
    if (day.type === 'match') return { title: 'Oggi partita', body: 'Pasto con carboidrati 3–4 ore prima, poca fibra. In bocca al lupo!', url: '#' + now.id };
    if (day.type === 'field') return { title: 'Oggi campo', body: 'Allenamento con la squadra. Arriva idratato e fai i 10′ di mobilità.', url: '#' + now.id };
    return { title: 'Oggi ' + day.label, body: day.title + (day.dur ? ' · ' + day.dur : '') + '. Apri la scheda quando inizi.', url: '#' + now.id };
  }
  if (type === 'vigilia') {
    if (!tomorrow || tomorrow.type !== 'match') return null;
    return { title: 'Domani partita', body: 'Oggi solo attivazione leggera. Cena con carboidrati e almeno 8 ore di sonno.', url: '#' + now.id };
  }
  if (type === 'mobilita') return { title: 'Mobilità', body: progId === 'glutei' ? '10′ di mobilità: schiena e anche più libere, meno rigidità domani.' : '10′ di mobilità per anche e caviglie: meno infortuni, più velocità.', url: '#mobilita' };
  if (type === 'riepilogo') {
    if (now.wd !== 6) return null; // solo la domenica
    return { title: 'Riepilogo della settimana', body: 'Allenamenti, peso, proteine e un consiglio per la prossima settimana.', url: '#io' };
  }
  if (type === 'cibo') {
    if (((data.food && data.food[now.date]) || []).length >= 3) return null;
    return { title: 'Cosa hai mangiato?', body: 'Segnalo in starfit+: ti dico quante proteine mancano e cosa mangiare.', url: '#cibo' };
  }
  return null;
}
const plusMin = (hm, m) => { const [h, mm] = hm.split(':').map(Number); const t = h * 60 + mm + m; return t >= 1440 ? '23:59' : String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
// Chiamata dalla funzione programmata ogni 15 minuti
export async function runReminders(kv, opts, ts) {
  const now = rome(ts || Date.now()); let n = 0;
  for (const key of await kv.list('push:')) {
    const name = key.slice(5), rec = await kv.get(key);
    if (!rec || !(rec.subs || []).length || !(await kv.get('user:' + name))) continue;
    const prefs = cleanPrefs(rec.prefs), data = (await kv.get('data:' + name)) || {}, wx = await getWx(kv, name);
    rec.sent = rec.sent || {}; let changed = false;
    for (const type of Object.keys(prefs)) {
      const p = prefs[type];
      if (!p.on || rec.sent[type] === now.date || now.hm < p.at || now.hm > plusMin(p.at, 120)) continue;
      rec.sent[type] = now.date; changed = true; // una volta al giorno, anche se oggi non serve
      const msg = reminder(type, data, wx, now, data.program || 'terzino');
      if (msg) n += await sendTo(kv, name, rec, Object.assign({ tag: type }, msg), opts.adminKey);
    }
    if (changed) await kv.set(key, Object.assign(await kv.get(key) || rec, { sent: rec.sent }));
  }
  return n;
}

/* ---------- account demo: lo usano tutti, ogni giorno riparte dal modello ---------- */
export const DEMO = 'demo';
const DATE = /^\d{4}-\d{2}-\d{2}$/;
// sposta tutte le date (chiavi e valori "AAAA-MM-GG") di n giorni: i dati di esempio restano sempre attuali
function shiftDates(v, n) {
  if (typeof v === 'string') return DATE.test(v) ? addDays(v, n) : v;
  if (Array.isArray(v)) return v.map(x => shiftDates(x, n));
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[DATE.test(k) ? addDays(k, n) : k] = shiftDates(v[k], n); return o; }
  return v;
}
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
export async function applyDemo(kv, force) {
  const tpl = await kv.get('demo:template'); if (!tpl || !tpl.doc || !tpl.day) return false;
  const now = rome(Date.now()), last = await kv.get('demo:last');
  if (!force && last && last.date === now.date) return false;
  const doc = shiftDates(tpl.doc, daysBetween(tpl.day, now.date));
  await kv.set('data:' + DEMO, Object.assign(doc, { savedAt: Date.now() }));
  await kv.del('wx:' + DEMO);
  await kv.set('demo:last', { date: now.date, at: Date.now() });
  return true;
}
// Funzioni che l'account demo non può usare (sono legate a una persona o agli account veri)
export function demoBlocked(name, method, path) {
  if (name !== DEMO) return null;
  if ((path === '/watch/code' && method !== 'GET') || path === '/push/sub' || path === '/push/test' || (path === '/sfida' && method === 'POST'))
    return out(403, { error: "Non disponibile nell'account demo." });
  return null;
}

/* ---------- richieste ---------- */
// Senza sessione: comandi rapidi con il codice (?k=...) e chiave pubblica delle notifiche
export async function publicRoute(req, kv, opts) {
  const { path } = req, q = req.query || {};
  if (path === '/push/key') { const k = vapid(opts.adminKey); return k ? out(200, { key: k.pub }) : out(503, { error: 'Notifiche non attive sul server.' }); }
  if (!path.startsWith('/w/')) return null;
  const name = await userByCode(kv, String(q.k || ''));
  if (!name) return text(401, 'Codice non valido. Apri starfit+ → Apple Watch e copia di nuovo il codice nel comando.');
  const now = rome(Date.now()), data = (await kv.get('data:' + name)) || {}, wx = await getWx(kv, name);
  const day = dayInfo(data, now.id), done = doneSet(data, wx);
  const what = path.slice(3).replace(/\.ics$/, '');

  if (what === 'oggi') return text(200, todayText(day, done, now));
  if (what === 'prossimo') return text(200, nextText(day, done));
  if (what === 'fatto') {
    const x = nextItem(day, done);
    if (!x) return text(200, nextText(day, done));
    wx.done.push({ u: x.it.u, t: Date.now(), d: now.date }); done.add(x.it.u);
    await saveWx(kv, name, wx, now.date);
    const rest = x.it.r && x.it.r !== '—' ? 'Recupero ' + x.it.r + '.\n\n' : '\n';
    return text(200, '✓ ' + x.it.n + ' fatto. ' + rest + 'Poi: ' + nextText(day, done));
  }
  if (what === 'recupero') { // secondi del recupero dell'ultimo esercizio fatto (o del prossimo)
    const items = (day && day.items) || [];
    const last = [...(wx.done || [])].reverse().find(e => e.d === now.date && items.some(i => i.u === e.u));
    const it = last ? items.find(i => i.u === last.u) : (nextItem(day, done) || {}).it;
    return text(200, String(restSeconds(it && it.r) || 90));
  }
  if (what === 'peso') {
    const v = parseFloat(String(q.kg || '').replace(',', '.'));
    if (!isFinite(v) || v < 25 || v > 250) return text(400, 'Scrivi il peso in kg, per esempio 84,6.');
    const kg = Math.round(v * 10) / 10;
    wx.w[now.date] = { kg, t: Date.now() }; await saveWx(kv, name, wx, now.date);
    const all = Object.assign({}, data.weights || {}); Object.entries(wx.w).forEach(([d, x]) => { all[d] = x.kg; });
    const old = Object.entries(all).filter(([d]) => d <= addDays(now.date, -7)).sort().pop();
    return text(200, 'Peso salvato: ' + kg1(kg) + ' kg' + (old ? ' (' + (kg - old[1] >= 0 ? '+' : '−') + kg1(Math.abs(kg - old[1])) + ' kg in 7 giorni)' : '') + '.');
  }
  if (what === 'attivita') {
    const num = (v, max) => { const n = Math.round(parseFloat(String(v || '').replace(',', '.'))); return isFinite(n) && n >= 0 && n <= max ? n : null; };
    const a = { kcal: num(q.kcal, 8000), min: num(q.min, 1440), passi: num(q.passi, 150000), fcr: num(q.fcr, 220) };
    if (a.kcal == null && a.min == null && a.passi == null && a.fcr == null) return text(400, 'Nessun dato ricevuto dalla Salute.');
    const prev = wx.act[now.date] || {};
    Object.keys(a).forEach(x => { if (a[x] == null) delete a[x]; });
    wx.act[now.date] = Object.assign({}, prev, a, { t: Date.now() }); await saveWx(kv, name, wx, now.date);
    return text(200, 'Salvato in starfit+: ' + [a.kcal != null ? a.kcal + ' kcal attive' : '', a.min != null ? a.min + ' min di esercizio' : '', a.passi != null ? a.passi.toLocaleString('it-IT') + ' passi' : '', a.fcr != null ? 'FC a riposo ' + a.fcr : ''].filter(Boolean).join(' · ') + '.');
  }
  if (what === 'mattino') { // sonno della notte (ore, minuti o secondi) e battito a riposo
    let h = parseFloat(String(q.sonno || '').replace(',', '.'));
    if (isFinite(h)) { if (h > 1440) h = h / 3600; else if (h > 24) h = h / 60; h = Math.round(h * 10) / 10; } else h = null;
    if (h != null && (h < 0 || h > 16)) h = null;
    const f = Math.round(parseFloat(String(q.fcr || '').replace(',', '.')));
    const fcr = isFinite(f) && f >= 25 && f <= 150 ? f : null;
    if (h == null && fcr == null) return text(400, 'Nessun dato del sonno o del battito.');
    const prev = wx.act[now.date] || {};
    wx.act[now.date] = Object.assign({}, prev, h != null ? { sonno: h } : {}, fcr != null ? { fcr } : {}, { t: Date.now() });
    await saveWx(kv, name, wx, now.date);
    return text(200, 'Buongiorno! ' + [h != null ? 'Hai dormito ' + String(h).replace('.', ',') + ' ore' : '', fcr != null ? 'battito a riposo ' + fcr : ''].filter(Boolean).join(', ') + '. Apri starfit+ per vedere come allenarti oggi.');
  }
  if (what === 'calendario') {
    const rec = (await kv.get('push:' + name)) || {};
    return text(200, calendar(data, cleanPrefs(rec.prefs), now), 'text/calendar; charset=utf-8');
  }
  return text(404, 'Comando sconosciuto.');
}

// Con sessione (dall'app)
export async function sessionRoute(req, kv, name, opts) {
  const { method, path, body } = req;
  if (path === '/watch/code' && method === 'GET') { const c = await kv.get('wcode:' + name); return out(200, { has: !!c, created: c ? c.created : null }); }
  if (path === '/watch/code' && method === 'POST') { // crea un codice nuovo: quello vecchio smette di funzionare
    const old = await kv.get('wcode:' + name); if (old) await kv.del('wk:' + old.h);
    const code = randomBytes(16).toString('hex'), h = sha(code);
    await kv.set('wk:' + h, { name }); await kv.set('wcode:' + name, { h, created: Date.now() });
    return out(200, { code });
  }
  if (path === '/watch/code' && method === 'DELETE') { const old = await kv.get('wcode:' + name); if (old) { await kv.del('wk:' + old.h); await kv.del('wcode:' + name); } return out(200, { ok: true }); }

  if (path === '/sfida' && method === 'POST') { await kv.set('sfida:' + name, { on: !!(body && body.on) }); return out(200, { ok: true, on: !!(body && body.on) }); }
  if (path === '/sfida' && method === 'GET') {
    const me = await kv.get('sfida:' + name), now = rome(Date.now()), mon = addDays(now.date, -now.wd), inWeek = d => d >= mon && d <= now.date;
    if (!me || !me.on) return out(200, { on: false, week: mon, rows: [] });
    const rows = [];
    for (const k of await kv.list('sfida:')) {
      const n = k.slice(6), f = await kv.get(k); if (!f || !f.on || !(await kv.get('user:' + n))) continue;
      const data = (await kv.get('data:' + n)) || {}, wx = await getWx(kv, n);
      const train = new Set();
      Object.values(data.loads || {}).forEach(arr => (arr || []).forEach(x => { if (x && inWeek(x.d)) train.add(x.d); }));
      Object.keys(data.logs || {}).forEach(d => { if (inWeek(d)) train.add(d); });
      Object.keys(data.trained || {}).forEach(d => { if (inWeek(d)) train.add(d); });
      (wx.done || []).forEach(x => { if (inWeek(x.d)) train.add(x.d); });
      const w = new Set(Object.keys(data.weights || {}).filter(inWeek)); Object.keys(wx.w || {}).filter(inWeek).forEach(d => w.add(d));
      const food = Object.keys(data.food || {}).filter(d => inWeek(d) && (data.food[d] || []).length >= 3).length;
      const gl = (data.program || 'terzino') === 'glutei', wk = (data.watch && data.watch.week) || {};
      const target = d => { const t = (wk[DAYS[wdOf(d)]] || {}).type; return gl ? (t === 'gym' ? 9 : 8) : (t === 'field' || t === 'match' ? 14 : 12); };
      const water = Object.keys(data.water || {}).filter(d => inWeek(d) && data.water[d] >= target(d)).length;
      rows.push({ name: n, me: n === name, giorni: train.size, peso: w.size, cibo: food, acqua: water, pts: train.size * 3 + w.size + food + water });
    }
    rows.sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name));
    return out(200, { on: true, week: mon, rows });
  }
  if (path === '/push/state' && method === 'GET') { const rec = (await kv.get('push:' + name)) || {}; return out(200, { subs: (rec.subs || []).length, prefs: cleanPrefs(rec.prefs), ready: !!vapid(opts.adminKey) }); }
  if (path === '/push/sub' && method === 'POST') {
    const sub = body && body.sub;
    if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) return out(400, { error: 'Iscrizione alle notifiche non valida.' });
    const rec = (await kv.get('push:' + name)) || {};
    const subs = (rec.subs || []).filter(s => s.endpoint !== sub.endpoint);
    subs.push({ endpoint: sub.endpoint, keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) } });
    rec.subs = subs.slice(-5); rec.prefs = cleanPrefs(body.prefs || rec.prefs);
    await kv.set('push:' + name, rec); return out(200, { ok: true, subs: rec.subs.length });
  }
  if (path === '/push/prefs' && method === 'POST') { const rec = (await kv.get('push:' + name)) || {}; rec.prefs = cleanPrefs(body && body.prefs); await kv.set('push:' + name, rec); return out(200, { ok: true, prefs: rec.prefs }); }
  if (path === '/push/off' && method === 'POST') {
    const rec = (await kv.get('push:' + name)) || {}; const ep = body && body.endpoint;
    rec.subs = (rec.subs || []).filter(s => ep ? s.endpoint !== ep : false); await kv.set('push:' + name, rec); return out(200, { ok: true, subs: rec.subs.length });
  }
  if (path === '/push/test' && method === 'POST') {
    const rec = (await kv.get('push:' + name)) || {};
    if (!(rec.subs || []).length) return out(400, { error: 'Prima attiva le notifiche su questo telefono.' });
    const n = await sendTo(kv, name, rec, { title: 'starfit+', body: 'Le notifiche funzionano. Le vedrai anche sull\'Apple Watch quando l\'iPhone è bloccato.', url: '#watch', tag: 'test' }, opts.adminKey);
    return n ? out(200, { ok: true, sent: n }) : out(502, { error: 'Invio non riuscito. Riprova tra poco.' });
  }
  return null;
}
export { getWx };
