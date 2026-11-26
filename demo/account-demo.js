/* starfit+ DEMO — al posto di account.js.
   Account demo: niente accesso e niente server. I dati restano solo su questo telefono
   e si azzerano da soli ogni giorno, così nessuno lo usa come account personale.
   Stessa interfaccia di account.js (window.FitAccount), con dati di esempio già compilati. */
window.FitLogo = () => '__LOGO__';
(function () {
  const KEY = 'sf-demo-doc';
  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* niente */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* niente */ } }
  };
  const pad = n => String(n).padStart(2, '0');
  const dk = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today0 = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };
  const addD = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const WD = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  const rnd = (seed => () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; })(Number(dk(new Date()).replace(/-/g, '')) % 233280);
  const S = { doc: null };
  const readyCbs = [], remoteCbs = [];
  let isReady = false;

  /* ---------- dati di esempio ---------- */
  const PERSONA = { terzino: { kg0: 80.6, kg1: 78.4, nome: 'demo' }, glutei: { kg0: 57.6, kg1: 58.1, nome: 'demo' } };
  const BASE_KG = { bench: 62, trapbar: 100, bulgarian: 14, hipthrust: 80, landmine: 20, dbrow: 24, farmer: 26, gobletsquat: 16, latpull: 35, seatedrow: 35, rdl: 16, kickback: 9, stepup: 8, abduction: 35, cablechop: 12, slrdl: 12, pallof: 10 };
  const LOAD_CATS = new Set(['Forza', 'Gambe', 'Glutei', 'Schiena', 'Petto e spalle', 'Femorali', 'Contrasti', 'Braccia', 'Potenza']);
  function seed(prog) {
    const FD = window.FitData, P = FD.PROGRAMS[prog] || FD.PROGRAMS.terzino, EX = FD.EX, t = today0(), doc = { program: P.id, demoDay: dk(t) };
    const days = {}; (P.days || []).forEach(d => { days[d.id] = Object.assign({}, d, { pk: d.pk || d.id }); });
    const per = PERSONA[P.id] || PERSONA.terzino, isGl = P.id === 'glutei';
    // peso: ultimi 45 giorni, con piccole oscillazioni
    doc.weights = {};
    for (let i = 45; i >= 1; i--) { if (rnd() < 0.18) continue; const f = (45 - i) / 44, kg = per.kg0 + (per.kg1 - per.kg0) * f + (rnd() - 0.5) * 0.6; doc.weights[dk(addD(t, -i))] = Math.round(kg * 10) / 10; }
    // allenamenti degli ultimi 5 mesi, con carichi che salgono
    doc.trained = {}; doc.loads = {}; doc.logs = {};
    const notes = isGl ? ['Hip thrust più fluido, sentito bene il gluteo', 'Stacco rumeno: ho tenuto la schiena dritta', 'Stanca ma ho finito tutto', 'Abduzioni brucianti, ottimo', 'Plank +5″ rispetto alla volta scorsa']
      : ['Stacco pesante ma pulito', 'Gambe un po\' stanche dalla partita', 'Salti esplosivi, mi sentivo veloce', 'Panca +2,5 kg, tutte le ripetizioni', 'Recupero lungo, qualità alta'];
    for (let i = 150; i >= 1; i--) {
      const d = addD(t, -i), k = dk(d), day = days[WD[d.getDay()]];
      if (!day || (day.type !== 'gym' && day.type !== 'act') || rnd() < 0.1) continue;
      doc.trained[k] = [day.pk];
      const weeksAgo = Math.floor(i / 7);
      (day.items || []).forEach((it, idx) => {
        const e = EX[it.ex]; if (!e || !LOAD_CATS.has(e.cat) || it.b !== 'main' || i > 60) return;
        const m = /^(\d+)(?:–(\d+))?\s*×\s*(\d+)(?:–(\d+))?/.exec(it.s || ''); if (!m) return;
        const sets = +(m[2] || m[1]), reps = +(m[4] || m[3]), base = BASE_KG[it.ex];
        const kg = base ? Math.round(base * (1 + (8 - weeksAgo) * 0.025) * 2) / 2 : null;
        (doc.loads[it.ex] = doc.loads[it.ex] || []).push({ d: k, u: day.pk + ':' + idx, sets: Array.from({ length: sets }, (x, s) => ({ kg, reps: s === sets - 1 && rnd() < 0.3 ? reps - 1 : reps })) });
      });
      if (i <= 14) doc.logs[k] = { d: day.id, pk: day.pk, t: notes[Math.floor(rnd() * notes.length)], r: ['facile', 'giusto', 'giusto', 'duro'][Math.floor(rnd() * 4)], at: d.getTime() + 19 * 3600e3 };
    }
    // come stai: ieri compilato, oggi da provare
    doc.ready = { [dk(addD(t, -1))]: { sonno: 7.5, energia: 2, dolore: 0, dove: '', light: false } };
    // acqua ultimi giorni, oggi a metà
    doc.water = {}; for (let i = 6; i >= 1; i--) doc.water[dk(addD(t, -i))] = (isGl ? 6 : 9) + Math.floor(rnd() * 4);
    doc.water[dk(t)] = isGl ? 4 : 6;
    // pasti: oggi colazione e pranzo, nei giorni scorsi qualcosa
    const F = (n, g, k, p, c, f, m) => ({ id: Math.random().toString(36).slice(2, 9), m, n, g, k, p, c, f });
    const todayFood = isGl ? [F('Yogurt greco 0%', 170, 97, 17, 6.8, 0, 'col'), F("Fiocchi d'avena", 40, 148, 5.2, 24, 2.8, 'col'), F('Banana', 120, 107, 1.3, 27.6, 0.4, 'col'), F('Riso (cotto)', 160, 208, 4.3, 44.8, 0.5, 'pra'), F('Petto di pollo (cotto)', 120, 198, 37.2, 0, 4.3, 'pra'), F('Zucchine', 200, 34, 2.4, 6.2, 0.6, 'pra')]
      : [F('Latte parzialmente scremato', 250, 115, 8.8, 12.5, 4, 'col'), F("Fiocchi d'avena", 70, 259, 9.1, 42, 4.9, 'col'), F('Uovo', 110, 141, 13.6, 0, 9.6, 'col'), F('Pasta (cruda)', 110, 388, 13.8, 79.2, 1.7, 'pra'), F('Tonno al naturale (sgocciolato)', 80, 82, 19.2, 0, 0.6, 'pra'), F("Olio extravergine d'oliva", 10, 88, 0, 0, 10, 'pra')];
    doc.food = { [dk(t)]: todayFood };
    // nei giorni passati la giornata è completa (spuntino e cena compresi)
    const rest = isGl ? [F('Skyr', 150, 95, 16.5, 6, 0.3, 'spu'), F('Mandorle', 20, 121, 4.4, 0.9, 11.1, 'spu'), F('Merluzzo o nasello', 180, 128, 30.6, 0, 0.5, 'cen'), F('Quinoa (cotta)', 150, 180, 6.6, 31.5, 2.9, 'cen'), F("Olio extravergine d'oliva", 10, 88, 0, 0, 10, 'cen'), F('Pane integrale', 50, 123, 4.5, 23, 1.3, 'cen')]
      : [F('Yogurt greco 0%', 170, 97, 17, 6.8, 0, 'spu'), F('Banana', 120, 107, 1.3, 27.6, 0.4, 'spu'), F('Petto di pollo (cotto)', 180, 297, 55.8, 0, 6.5, 'cen'), F('Riso (crudo)', 100, 350, 7, 79, 0.6, 'cen'), F('Verdure miste surgelate', 200, 90, 5, 14, 1, 'cen'), F("Olio extravergine d'oliva", 15, 133, 0, 0, 15, 'cen'), F('Pane comune', 60, 162, 5.1, 33, 0.7, 'cen')];
    for (let i = 1; i <= 5; i++) doc.food[dk(addD(t, -i))] = todayFood.concat(rest).map(e => Object.assign({}, e, { id: Math.random().toString(36).slice(2, 9) }));
    doc['food-recent'] = [];
    // Apple Watch, misure, profilo
    doc.watchAct = {}; for (let i = 10; i >= 1; i--) doc.watchAct[dk(addD(t, -i))] = { kcal: (isGl ? 380 : 680) + Math.round(rnd() * 250), min: 35 + Math.round(rnd() * 50), passi: 7000 + Math.round(rnd() * 5000), fcr: (isGl ? 62 : 55) + Math.round(rnd() * 4), sonno: Math.round((6.5 + rnd() * 1.8) * 10) / 10 };
    doc.measures = isGl ? { [dk(addD(t, -56))]: { vita: 68, fianchi: 94, cosce: 55, braccio: 26, petto: 86 }, [dk(addD(t, -28))]: { vita: 67.5, fianchi: 95, cosce: 55.5, braccio: 26, petto: 86 }, [dk(addD(t, -2))]: { vita: 67, fianchi: 96, cosce: 56, braccio: 26.5, petto: 86 } }
      : { [dk(addD(t, -56))]: { vita: 86, fianchi: 98, cosce: 58, braccio: 35, petto: 100 }, [dk(addD(t, -28))]: { vita: 84.5, fianchi: 97, cosce: 58.5, braccio: 35.5, petto: 100.5 }, [dk(addD(t, -2))]: { vita: 83, fianchi: 96.5, cosce: 59, braccio: 36, petto: 101 } };
    doc.profile = isGl ? { altezza: '1,65 m', obiettivo: 'Glutei più forti' } : { altezza: '1,80 m', obiettivo: '76 kg' };
    return doc;
  }

  /* ---------- salvataggio solo locale ---------- */
  const save = () => LS.set(KEY, JSON.stringify(S.doc));
  const store = {
    get(k, d) { const v = S.doc ? S.doc[k] : undefined; return v === undefined ? d : JSON.parse(JSON.stringify(v)); },
    set(k, v) { if (!S.doc) return; S.doc[k] = v; save(); }
  };
  // Risposte finte al posto del server: comandi del Watch, notifiche e sfida non sono attivi nella demo
  async function api(method, path, body) {
    const err = m => { const e = new Error(m); e.status = 400; throw e; };
    if (path === '/watch/code') return method === 'POST' ? { code: 'demo0000000000000000000000000000' } : { has: false };
    if (path === '/push/state') return { subs: 0, prefs: {}, ready: false };
    if (path === '/push/prefs') return { ok: true, prefs: (body && body.prefs) || {} };
    if (path === '/push/key' || path === '/push/sub' || path === '/push/test') err('Nella demo le notifiche non sono attive.');
    if (path === '/sfida') {
      if (method === 'POST') { store.set('demo-sfida', !!(body && body.on)); return { ok: true, on: !!(body && body.on) }; }
      const on = store.get('demo-sfida', false), t = today0(), mon = addD(t, -((t.getDay() + 6) % 7));
      return { on, week: dk(mon), rows: on ? [{ name: 'luca', pts: 19 }, { name: 'demo', me: true, giorni: 4, peso: 3, cibo: 4, acqua: 3, pts: 22 }, { name: 'sara', pts: 14 }].sort((a, b) => b.pts - a.pts) : [] };
    }
    err('Nella demo questa funzione non è collegata al server.');
  }

  /* ---------- avvio: scelta della scheda ---------- */
  function ready() {
    isReady = true;
    document.body.classList.remove('auth-mode');
    const a = document.getElementById('auth'); if (a) a.remove();
    paintAccount(); banner();
    readyCbs.splice(0).forEach(f => f());
  }
  function start(prog) { S.doc = seed(prog); save(); ready(); }
  function reset() { LS.del(KEY); location.hash = ''; location.reload(); }
  function logout() { LS.del(KEY); LS.del(LOGGED); location.hash = ''; location.reload(); }
  // Credenziali uguali per tutti: la demo non ha server, servono solo a provare l'accesso come nell'app vera
  const DEMO_USER = 'demo', DEMO_PASS = 'starfit', LOGGED = 'sf-demo-in';
  function boot() {
    if (LS.get(LOGGED) !== '1') return showLogin();
    try { S.doc = JSON.parse(LS.get(KEY) || 'null'); } catch (e) { S.doc = null; }
    // ogni giorno si riparte da capo: l'account demo non conserva dati personali
    if (S.doc && S.doc.demoDay === dk(today0()) && S.doc.program) return ready();
    const prev = S.doc && S.doc.program; S.doc = null; LS.del(KEY);
    showPick(prev);
  }
  function showLogin() {
    document.body.classList.add('auth-mode');
    const box = document.createElement('section'); box.id = 'auth'; box.className = 'auth';
    box.innerHTML = `<div class="auth-in"><p class="auth-brand">${window.FitLogo()}</p>
      <p class="auth-sub">Demo di starfit+ · accedi con le credenziali che ti abbiamo dato.</p>
      <form class="auth-form" id="auth-form" novalidate>
        <label for="auth-user">Nome utente</label>
        <input id="auth-user" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required>
        <label for="auth-pass">Password</label>
        <div class="auth-pw"><input id="auth-pass" name="password" type="password" autocomplete="current-password" required>
          <button type="button" class="auth-eye" id="auth-eye" aria-label="Mostra la password">Mostra</button></div>
        <p class="auth-err" id="auth-err" role="alert" hidden></p>
        <button type="submit" class="auth-go">Accedi alla demo</button>
        <p class="auth-note">Account demo: i dati restano solo su questo telefono e si azzerano ogni giorno. Non è un account personale.</p>
      </form></div>`;
    document.body.appendChild(box);
    const err = box.querySelector('#auth-err');
    box.querySelector('#auth-eye').addEventListener('click', e => { const p = box.querySelector('#auth-pass'), sh = p.type === 'password'; p.type = sh ? 'text' : 'password'; e.currentTarget.textContent = sh ? 'Nascondi' : 'Mostra'; });
    box.querySelector('#auth-form').addEventListener('submit', e => {
      e.preventDefault();
      const u = box.querySelector('#auth-user').value.trim().toLowerCase(), p = box.querySelector('#auth-pass').value;
      if (u !== DEMO_USER || p !== DEMO_PASS) { err.textContent = 'Nome utente o password sbagliati.'; err.hidden = false; return; }
      LS.set(LOGGED, '1'); box.remove(); boot();
    });
  }
  function showPick() {
    document.body.classList.add('auth-mode');
    const box = document.createElement('section'); box.id = 'auth'; box.className = 'auth';
    box.innerHTML = `<div class="auth-in"><p class="auth-brand">${window.FitLogo()}</p>
      <p class="auth-sub">Questa è la demo: niente account, niente password. Scegli una scheda di esempio e prova tutto.</p>
      <div class="demo-pick">
        <button type="button" class="demo-opt" data-prog="terzino"><b>Calciatore</b><span>3 palestre, 2 campo, partita: velocità ed esplosività</span></button>
        <button type="button" class="demo-opt" data-prog="glutei"><b>Palestra · glutei</b><span>3 palestre a settimana: glutei, addome e schiena</span></button>
      </div>
      <p class="auth-note">I dati restano solo su questo telefono e si azzerano ogni giorno. Non è un account personale.</p></div>`;
    document.body.appendChild(box);
    box.addEventListener('click', e => { const b = e.target.closest('[data-prog]'); if (b) start(b.dataset.prog); });
  }
  function banner() {
    if (document.getElementById('demo-bar')) return;
    const b = document.createElement('div'); b.id = 'demo-bar'; b.className = 'demo-bar';
    b.innerHTML = '<span><b>Demo</b> · dati di esempio, si azzerano ogni giorno</span><button type="button" id="demo-reset">Cambia scheda</button>';
    const main = document.getElementById('hero') || document.getElementById('main');
    main.parentNode.insertBefore(b, main);
    b.querySelector('#demo-reset').addEventListener('click', reset);
  }
  function paintAccount() {
    const b = document.getElementById('acct'), menu = document.getElementById('acct-menu'), st = document.getElementById('acct-status');
    if (st) st.textContent = 'Account demo · solo su questo telefono';
    if (b) { b.hidden = false; const i = b.querySelector('.acct-i'); if (i) i.textContent = 'D'; }
    if (menu) { const n = menu.querySelector('.acct-name'); if (n) n.textContent = 'demo'; }
    const out = document.getElementById('acct-out');
    if (out && !out.dataset.demo) { out.dataset.demo = '1'; out.textContent = 'Esci dalla demo'; out.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); logout(); }, true); }
    if (b && menu && !b.dataset.wired) {
      b.dataset.wired = '1';
      b.addEventListener('click', e => { e.stopPropagation(); menu.hidden = !menu.hidden; });
      document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target)) menu.hidden = true; });
    }
  }

  window.FitAccount = {
    store,
    whenReady(fn) { if (isReady) fn(); else readyCbs.push(fn); },
    onRemote(fn) { remoteCbs.push(fn); },
    user: () => 'demo',
    saveNow: async () => {},
    api: (m, p, b) => api(m, p, b),
    demo: true
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
