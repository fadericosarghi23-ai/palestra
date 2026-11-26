/* starfit+ — foodplus: codice a barre, pasti preferiti e "Ripeti ieri", lista della spesa della settimana, acqua */
(window.FitPlugins = window.FitPlugins || []).push(function (A) {
  const esc = A.esc, n0 = A.n0, n1 = A.n1, store = A.store;
  const MEAL_LBL = m => (A.MEALS.find(x => x[0] === m) || [m, 'Pasto'])[1];
  const todayKey = () => A.dkey(new Date());
  const shiftKey = (dk, n) => { const d = A.kdate(dk); d.setDate(d.getDate() + n); return A.dkey(d); };
  let idSeq = 0;
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5) + (idSeq++ % 36).toString(36);
  const flash = id => { const b = document.getElementById(id); if (b) { b.classList.remove('saved'); void b.offsetWidth; b.classList.add('saved'); } };
  const num = v => { const x = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v; return typeof x === 'number' && isFinite(x) && x >= 0 ? x : null; };
  const r1 = v => Math.round(v * 10) / 10;
  const liters = glasses => (glasses * 0.25).toLocaleString('it-IT', { maximumFractionDigits: 2 }) + ' L';

  /* ---------- stile ---------- */
  if (!document.getElementById('sf-foodplus')) {
    const st = document.createElement('style'); st.id = 'sf-foodplus';
    st.textContent = `
.fp-box { margin-bottom: 12px; }
.fp-box h3 { margin-bottom: 4px; }
.fp-scan { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; }
.fp-scan p { margin: 0; flex: 1 1 200px; }
.fp-scan .sb-btn { flex: 1 1 auto; min-height: 48px; padding-inline: 16px; font-size: 15px; }
.fp-ov { position: fixed; inset: 0; z-index: 90; background: rgba(17, 19, 22, .72); display: flex; align-items: flex-end; justify-content: center; padding: env(safe-area-inset-top, 0px) 0 0; }
.fp-sheet { width: 100%; max-width: 560px; max-height: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch; border-radius: 16px 16px 0 0; padding: 16px 16px calc(20px + env(safe-area-inset-bottom, 0px)); border-top: 3px solid var(--fire); }
.fp-sh { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.fp-sh h3 { margin: 0; }
.fp-sheet .btn-ghost { border-color: var(--on-iron-muted); color: var(--on-iron); min-height: 42px; }
.fp-sheet .btn-ghost:hover { background: var(--on-iron); color: var(--iron); }
.fp-cam { width: 100%; min-height: 220px; background: #000; border-radius: 12px; overflow: hidden; }
.fp-cam video { width: 100% !important; display: block; }
.fp-msg { margin: 10px 0 0; font-size: 15px; }
.fp-msg.bad { color: var(--fire-bright); font-weight: 700; }
.fp-man { display: flex; gap: 10px; margin-top: 12px; align-items: stretch; }
.fp-man .w-in input { font-size: 22px; min-height: 48px; padding-right: 14px; letter-spacing: .04em; }
.fp-man .sb-btn { min-height: 48px; flex: 0 0 auto; padding-inline: 18px; }
.fp-res h4 { margin: 4px 0 2px; font: 800 20px/1.15 var(--display); text-transform: uppercase; overflow-wrap: anywhere; }
.fp-sheet .f-prev { color: var(--on-iron); }
.fp-meals { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.fp-meals button { min-height: 40px; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--iron-3); background: var(--iron-2); color: var(--on-iron); font: 600 14px/1 inherit; cursor: pointer; }
.fp-meals button[aria-pressed="true"] { background: var(--on-iron); color: var(--iron); border-color: var(--on-iron); }
html.fp-lock, html.fp-lock body { overflow: hidden; }
.fp-mrow { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.fp-mb { min-height: 40px; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--steel-line); background: transparent; color: var(--ink); font: 600 13px/1.1 inherit; cursor: pointer; }
.fp-mb small { color: var(--ink-muted); font-weight: 500; }
.fp-mb[aria-expanded="true"] { background: var(--iron); color: var(--on-iron); border-color: var(--iron); }
.fp-mb[aria-expanded="true"] small { color: var(--on-iron-muted); }
.fp-mb:active, .fp-fav:active, .fp-g:active { transform: scale(.97); }
.fp-fsave { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.fp-fsave input { flex: 1 1 180px; min-width: 0; font-size: 16px; min-height: 44px; padding: 8px 12px; border-radius: 10px; border: 1.5px solid var(--steel-line); background: #fff; color: var(--ink); }
.fp-fsave input:focus { outline: none; border-color: var(--fire); }
.fp-fsave .sb-btn { min-height: 44px; flex: 0 0 auto; }
.fp-fsave .btn-ghost { min-height: 44px; }
.fp-note { font-size: 13px; font-weight: 700; margin: 8px 0 0; }
.fp-favs { list-style: none; margin: 10px 0 0; padding: 0; }
.fp-favs li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 6px 0; border-top: 1px solid var(--steel-line); }
.fp-fav { display: flex; justify-content: space-between; align-items: center; gap: 10px; width: 100%; min-height: 48px; padding: 4px 2px; text-align: left; border: 0; background: transparent; color: var(--ink); font: inherit; cursor: pointer; }
.fp-fav b { display: block; font-size: 15px; overflow-wrap: anywhere; }
.fp-fav small { display: block; font-size: 12px; color: var(--ink-muted); }
.fp-fav em { font-style: normal; font-weight: 700; font-size: 13px; color: var(--fire); white-space: nowrap; }
.fp-shop > summary { min-height: 48px; }
.fp-shop { border-top: 0; }
.fp-sg { margin: 12px 0 0; }
.fp-sg h4 { margin: 0 0 4px; font: 800 16px/1.1 var(--display); text-transform: uppercase; letter-spacing: .04em; }
.fp-sl { list-style: none; margin: 0; padding: 0; }
.fp-si { display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 4px 0; border-top: 1px solid var(--steel-line); cursor: pointer; }
.fp-si input { width: 22px; height: 22px; flex: 0 0 22px; accent-color: var(--fire); margin: 0; }
.fp-si span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.fp-si em { font-style: normal; font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums; }
.fp-si small { display: block; font-size: 12px; color: var(--ink-muted); }
.fp-si.done span, .fp-si.done em { text-decoration: line-through; color: var(--ink-muted); }
.fp-wh { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
.fp-wh h3 { margin: 0; }
.fp-wh span { font-size: 14px; font-variant-numeric: tabular-nums; }
.fp-glasses { display: grid; grid-template-columns: repeat(var(--n, 12), minmax(0, 1fr)); gap: 3px; margin-top: 10px; }
.fp-g { min-height: 44px; padding: 4px 0; border: 0; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.fp-g svg { width: 100%; max-width: 24px; height: 32px; display: block; }
.fp-g .gl { fill: none; stroke: var(--ink-muted); stroke-width: 1.6; stroke-linejoin: round; }
.fp-g .wa { fill: transparent; }
.fp-g.x .gl { stroke-dasharray: 2.5 2; }
.fp-g.on .gl { stroke: var(--iron); }
.fp-g.on .wa { fill: var(--iron); }
.fp-glasses.ok .fp-g.on .gl { stroke: var(--fire); }
.fp-glasses.ok .fp-g.on .wa { fill: var(--fire); }
.fp-glasses.sm .fp-g { min-height: 40px; }
.fp-glasses.sm .fp-g svg { height: 26px; }
.fp-wa { display: flex; gap: 10px; margin-top: 10px; align-items: center; flex-wrap: wrap; }
.fp-wa .btn-ghost, .fp-wa .sb-btn { flex: 0 0 auto; min-height: 44px; min-width: 56px; font-size: 16px; }
.fp-wa p { margin: 0; flex: 1 1 160px; }
@media (prefers-reduced-motion: reduce) { .fp-mb:active, .fp-fav:active, .fp-g:active { transform: none; } }
`;
    document.head.appendChild(st);
  }

  /* =====================================================================
     4) ACQUA — bicchieri da 250 ml, obiettivo secondo programma e giorno
     ===================================================================== */
  const WD = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  function dayTypeOf(dk) {
    try { const id = WD[A.kdate(dk).getDay()], d = A.days().find(x => x.id === id); return d ? d.type : null; } catch (e) { return null; }
  }
  function waterGoal(dk) {
    const t = dayTypeOf(dk);
    if (A.PROG && A.PROG.id === 'glutei') return t === 'gym' ? { n: 9, why: 'Giorno di palestra: +250 ml.' } : { n: 8, why: '' };
    if (t === 'match') return { n: 14, why: 'Giorno di partita: +500 ml.' };
    if (t === 'field') return { n: 14, why: 'Oggi c\'è campo: +500 ml.' };
    return { n: 12, why: '' };
  }
  const waterLog = () => { const w = store.get('water', {}); return w && typeof w === 'object' ? w : {}; };
  const waterOf = dk => { const v = +waterLog()[dk]; return isFinite(v) && v > 0 ? Math.min(40, Math.round(v)) : 0; };
  function setWater(dk, n) {
    const all = Object.assign({}, waterLog()); n = Math.max(0, Math.min(40, Math.round(n)));
    if (n) all[dk] = n; else delete all[dk];
    const lim = A.dkey(new Date(Date.now() - 120 * A.DAY)); Object.keys(all).forEach(x => { if (x < lim) delete all[x]; });
    store.set('water', all);
  }
  const GLASS = '<svg viewBox="0 0 20 28" aria-hidden="true"><path class="wa" d="M2.75 10h14.5L16 26H4z"/><path class="gl" d="M2 2h16l-2 24H4z"/></svg>';
  function glassesHTML(dk, cur, goal, small) {
    const n = Math.min(20, Math.max(12, goal, cur));
    let h = '';
    for (let i = 0; i < n; i++) {
      const on = i < cur, set = cur === i + 1 ? i : i + 1;
      h += `<button type="button" class="fp-g${on ? ' on' : ''}${i >= goal ? ' x' : ''}" data-fpw="${dk}|set:${set}" aria-label="${i + 1} ${i ? 'bicchieri' : 'bicchiere'} (${liters(i + 1)})" aria-pressed="${on}">${GLASS}</button>`;
    }
    return `<div class="fp-glasses${small ? ' sm' : ''}${cur >= goal ? ' ok' : ''}" style="--n:${Math.min(n, 12)}" role="group" aria-label="Bicchieri d'acqua">${h}</div>`;
  }
  function waterHTML(dk, compact) {
    const cur = waterOf(dk), g = waterGoal(dk);
    const line = `<b>${liters(cur)}</b> su ${liters(g.n)}${cur >= g.n ? ' ✓' : ''}`;
    if (compact) return `<section class="sec panel" id="fp-water-home"><div class="fp-wh"><h3>Acqua</h3><span>${line}</span></div>
      ${glassesHTML(dk, cur, g.n, true)}
      <div class="fp-wa"><p class="small">${cur >= g.n ? 'Obiettivo di oggi raggiunto.' : `Ancora ${g.n - cur} ${g.n - cur === 1 ? 'bicchiere' : 'bicchieri'} da 250 ml.`}${g.why ? ' ' + g.why : ''}</p>
        <button type="button" class="btn-ghost" data-fpw="${dk}|-1" aria-label="Togli un bicchiere"${cur ? '' : ' disabled'}>−1</button><button type="button" class="sb-btn" data-fpw="${dk}|+1" aria-label="Aggiungi un bicchiere">+1</button></div></section>`;
    return `<section class="panel fp-box" id="fp-water"><div class="fp-wh"><h3>Acqua</h3><span>${line}</span></div>
      ${glassesHTML(dk, cur, g.n, false)}
      <div class="fp-wa"><p class="small">${cur} di ${g.n} bicchieri da 250 ml.${g.why ? ' ' + g.why : ''}</p>
        <button type="button" class="btn-ghost" data-fpw="${dk}|-1" aria-label="Togli un bicchiere"${cur ? '' : ' disabled'}>−1</button><button type="button" class="sb-btn" data-fpw="${dk}|+1" aria-label="Aggiungi un bicchiere">+1</button></div></section>`;
  }
  function onWaterClick(b) {
    const [dk, op] = b.dataset.fpw.split('|');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dk) || dk > todayKey()) return;
    const cur = waterOf(dk);
    const n = op === '+1' ? cur + 1 : op === '-1' ? cur - 1 : op.indexOf('set:') === 0 ? +op.slice(4) : cur;
    if (!isFinite(n)) return;
    setWater(dk, n); A.buzz(); A.route(true);
  }

  /* =====================================================================
     2) PASTI PREFERITI e "Ripeti ieri"
     ===================================================================== */
  let favSave = null, favOpen = null, favNote = null;
  const favs = () => { const f = store.get('food-fav', []); return Array.isArray(f) ? f.filter(x => x && x.id && Array.isArray(x.items)) : []; };
  const favSum = f => A.sumFood(f.items.map(i => ({ k: +i.k || 0, p: +i.p || 0, c: +i.c || 0, f: +i.f || 0 })));
  const userName = () => { const u = String(A.user() || '').trim(); return u ? u.charAt(0).toUpperCase() + u.slice(1) : ''; };
  const defFavName = m => MEAL_LBL(m) + (userName() ? ' di ' + userName() : ' preferita');
  function mealHook(m, dk, entries) {
    if (!dk) return '';
    entries = Array.isArray(entries) ? entries : [];
    const key = m + '|' + dk, y = A.dayFood(shiftKey(dk, -1)).filter(e => e.m === m), fl = favs();
    const btns = [];
    if (y.length) btns.push(`<button type="button" class="fp-mb" data-fprep="${key}">↺ Ripeti ieri <small>${n0(A.sumFood(y).k)} kcal</small></button>`);
    if (entries.length) btns.push(`<button type="button" class="fp-mb" data-fpsave="${key}" aria-expanded="${favSave === key}">★ Salva come preferito</button>`);
    if (fl.length) btns.push(`<button type="button" class="fp-mb" data-fpfavs="${key}" aria-expanded="${favOpen === key}">Preferiti <small>${fl.length}</small></button>`);
    if (!btns.length) return '';
    let extra = '';
    if (favSave === key && entries.length) extra += `<div class="fp-fsave"><input id="fp-favname" maxlength="40" autocomplete="off" enterkeyhint="done" aria-label="Nome del preferito" value="${esc(defFavName(m))}">
      <button type="button" class="sb-btn" data-fpsaveok="${key}">Salva</button><button type="button" class="btn-ghost" data-fpcancel="1">Annulla</button></div>`;
    if (favNote === key) extra += '<p class="fp-note">Salvato tra i preferiti ✓</p>';
    if (favOpen === key && fl.length) extra += `<ul class="fp-favs">${fl.map(f => { const s = favSum(f);
      return `<li><button type="button" class="fp-fav" data-fpuse="${esc(f.id)}|${key}" aria-label="Aggiungi ${esc(f.n)} a ${MEAL_LBL(m).toLowerCase()}"><span><b>${esc(f.n)}</b><small>${n0(s.k)} kcal · P ${n0(s.p)} g · ${f.items.length} ${f.items.length === 1 ? 'alimento' : 'alimenti'}</small></span><em>+ Aggiungi</em></button>
        <button type="button" class="f-del" data-fpdel="${esc(f.id)}" aria-label="Elimina il preferito ${esc(f.n)}">×</button></li>`; }).join('')}</ul>`;
    return `<div class="fp-mrow">${btns.join('')}</div>${extra}`;
  }
  function addEntries(dk, m, items) {
    if (!items.length) return;
    const list = A.dayFood(dk).slice();
    items.forEach(i => list.push({ id: newId(), m, n: String(i.n || 'Alimento'), g: +i.g || 0, k: +i.k || 0, p: +i.p || 0, c: +i.c || 0, f: +i.f || 0 }));
    A.setDayFood(dk, list);
  }
  function saveFav(m, dk) {
    const inp = document.getElementById('fp-favname'), name = ((inp && inp.value) || '').trim().slice(0, 40) || defFavName(m);
    const items = A.dayFood(dk).filter(e => e.m === m).map(e => ({ n: e.n, g: e.g, k: e.k, p: e.p, c: e.c, f: e.f }));
    if (!items.length) return;
    const rest = favs().filter(f => A.fold(f.n) !== A.fold(name));
    store.set('food-fav', [{ id: 'fav-' + newId(), n: name, items }].concat(rest).slice(0, 40));
  }
  function onMealClick(t) {
    const rep = t.closest('[data-fprep]');
    if (rep) {
      const [m, dk] = rep.dataset.fprep.split('|');
      addEntries(dk, m, A.dayFood(shiftKey(dk, -1)).filter(e => e.m === m));
      favNote = null; A.buzz(); A.route(true); flash('meal-' + m); return true;
    }
    const sv = t.closest('[data-fpsave]');
    if (sv) {
      const key = sv.dataset.fpsave; favSave = favSave === key ? null : key; favOpen = null; favNote = null; A.route(true);
      const i = document.getElementById('fp-favname'); if (i) { i.focus({ preventScroll: true }); i.select(); }
      return true;
    }
    const ok = t.closest('[data-fpsaveok]');
    if (ok) { const [m, dk] = ok.dataset.fpsaveok.split('|'); saveFav(m, dk); favSave = null; favNote = ok.dataset.fpsaveok; A.buzz(); A.route(true); return true; }
    if (t.closest('[data-fpcancel]')) { favSave = null; A.route(true); return true; }
    const op = t.closest('[data-fpfavs]');
    if (op) { const key = op.dataset.fpfavs; favOpen = favOpen === key ? null : key; favSave = null; favNote = null; A.route(true); return true; }
    const use = t.closest('[data-fpuse]');
    if (use) {
      const [id, m, dk] = use.dataset.fpuse.split('|'), f = favs().find(x => x.id === id);
      if (f) { addEntries(dk, m, f.items); favOpen = null; A.buzz(); A.route(true); flash('meal-' + m); }
      return true;
    }
    const del = t.closest('[data-fpdel]');
    if (del) {
      if (del.dataset.confirm !== '1') { del.dataset.confirm = '1'; del.textContent = 'Elimina'; del.classList.add('arm'); setTimeout(() => { if (del.isConnected) { del.dataset.confirm = ''; del.textContent = '×'; del.classList.remove('arm'); } }, 3500); return true; }
      store.set('food-fav', favs().filter(x => x.id !== del.dataset.fpdel)); if (!favs().length) favOpen = null; A.buzz(); A.route(true); return true;
    }
    return false;
  }

  /* =====================================================================
     3) LISTA DELLA SPESA della settimana (in base agli obiettivi della scheda)
     ===================================================================== */
  let shopOpen = false;
  const mondayKey = () => { const t = new Date(); return A.dkey(new Date(t.getFullYear(), t.getMonth(), t.getDate() - (t.getDay() + 6) % 7, 12)); };
  const fmtG = g => g >= 1000 ? n1(g / 1000) + ' kg' : Math.round(g) + ' g';
  const roundTo = (v, step, min) => Math.max(min || step, Math.round(v / step) * step);
  // Valori per 100 g (crudi dove serve) e quote dei macro coperte da ogni alimento
  function shopBase(mac) {
    const mid = r => Array.isArray(r) ? (r[0] + r[1]) / 2 : 0;
    const P = mid(mac.p) * 7 * 0.75, C = mid(mac.c) * 7 * 0.8, F = mid(mac.f) * 7 * 0.55;
    const g = (tot, share, per100) => tot * share / per100 * 100;
    const pcs = (grams, each, mult) => Math.max(mult || 1, Math.round(grams / each / (mult || 1)) * (mult || 1));
    return [
      { t: 'Proteine', items: [
        { key: 'pollo', n: 'Petto di pollo', q: fmtG(roundTo(g(P, 0.32, 23), 100)) },
        { key: 'uova', n: 'Uova', q: String(pcs(g(P, 0.12, 12.4), 55, 6)) },
        { key: 'yogurt', n: 'Yogurt greco 0%', q: pcs(g(P, 0.13, 10), 170) + ' vasetti' },
        { key: 'pesce', n: 'Pesce (merluzzo, nasello o salmone)', q: fmtG(roundTo(g(P, 0.2, 18), 100)) },
        { key: 'tonno', n: 'Tonno al naturale', q: pcs(g(P, 0.08, 24), 80) + ' scatolette' },
        { key: 'bresaola', n: 'Bresaola o fesa di tacchino', q: fmtG(roundTo(g(P, 0.07, 30), 50)) },
        { key: 'legumi', n: 'Legumi in scatola (ceci, lenticchie, fagioli)', q: pcs(g(P, 0.08, 7.5), 240) + ' barattoli' }
      ] },
      { t: 'Carboidrati', items: [
        { key: 'pasta', n: 'Pasta', q: fmtG(roundTo(g(C, 0.25, 72), 500)) },
        { key: 'riso', n: 'Riso', q: fmtG(roundTo(g(C, 0.2, 79), 500)) },
        { key: 'pane', n: 'Pane integrale', q: fmtG(roundTo(g(C, 0.15, 50), 100)) },
        { key: 'avena', n: 'Fiocchi d\'avena', q: fmtG(roundTo(g(C, 0.12, 60), 250)) },
        { key: 'patate', n: 'Patate', q: fmtG(roundTo(g(C, 0.1, 19), 500)) },
        { key: 'banane', n: 'Banane', q: String(pcs(g(C, 0.09, 23), 120)) },
        { key: 'mele', n: 'Mele o altra frutta di stagione', q: String(pcs(g(C, 0.09, 14), 180)) }
      ] },
      { t: 'Grassi', items: [
        { key: 'olio', n: 'Olio extravergine d\'oliva', q: roundTo(g(F, 0.6, 100) / 0.92, 50) + ' ml', s: 'se in casa ne hai già, salta' },
        { key: 'secca', n: 'Frutta secca (mandorle, noci)', q: fmtG(roundTo(g(F, 0.4, 60), 50)) }
      ] },
      { t: 'Verdura', items: [
        { key: 'verdura', n: 'Verdura di stagione (zucchine, broccoli, spinaci)', q: '2 kg' },
        { key: 'insalata', n: 'Insalata', q: '4 buste' },
        { key: 'pomodori', n: 'Pomodori', q: '1 kg' }
      ] }
    ];
  }
  function mostUsed() {
    const log = store.get('food', {}) || {}, lim = shiftKey(todayKey(), -13), cnt = {};
    Object.keys(log).forEach(dk => { if (dk < lim || !Array.isArray(log[dk])) return; log[dk].forEach(e => { if (!e || !e.n) return; const k = A.fold(e.n); cnt[k] = cnt[k] || { n: e.n, c: 0 }; cnt[k].c++; }); });
    return Object.keys(cnt).map(k => ({ key: 'u:' + k, n: cnt[k].n, c: cnt[k].c })).filter(x => x.c >= 2).sort((a, b) => b.c - a.c).slice(0, 6)
      .map(x => ({ key: x.key, n: x.n, q: '', s: x.c + ' volte in 2 settimane' }));
  }
  function shopGroups() {
    const used = mostUsed(), base = shopBase(A.MAC0 || {});
    return (used.length ? [{ t: 'I più usati da te', items: used }] : []).concat(base);
  }
  function shopChecked() {
    const s = store.get('shop', null);
    return s && s.week === mondayKey() && s.checked && typeof s.checked === 'object' ? s.checked : {};
  }
  function shopText(groups, ck) {
    const wk = A.fmt(A.kdate(mondayKey()), { day: 'numeric', month: 'long' });
    return 'Lista della spesa · settimana dal ' + wk + '\n' + groups.map(gr => '\n' + gr.t + '\n' + gr.items.map(i => (ck[i.key] ? '✓ ' : '- ') + i.n + (i.q ? ' ' + i.q : '')).join('\n')).join('\n');
  }
  function shopHTML() {
    const groups = shopGroups(), ck = shopChecked(), all = groups.reduce((a, g) => a.concat(g.items), []), got = all.filter(i => ck[i.key]).length;
    const M = A.MAC0 || {}, mid = r => Array.isArray(r) ? Math.round((r[0] + r[1]) / 2) : 0;
    return `<section class="panel fp-box"><details class="how fp-shop" id="fp-shop"${shopOpen ? ' open' : ''}><summary>Lista della spesa della settimana <span id="fp-shop-n">${got ? got + ' di ' + all.length : all.length + ' voci'}</span></summary>
      <p class="small">Quantità per 7 giorni, pensate sui tuoi obiettivi: circa ${n0(mid(M.p))} g di proteine, ${n0(mid(M.c))} g di carboidrati e ${n0(mid(M.f))} g di grassi al giorno. Spunta quello che hai già preso: la lista si azzera da sola ogni lunedì.</p>
      ${groups.map(gr => `<div class="fp-sg"><h4>${esc(gr.t)}</h4><ul class="fp-sl">${gr.items.map(i => `<li><label class="fp-si${ck[i.key] ? ' done' : ''}"><input type="checkbox" data-shop="${esc(i.key)}"${ck[i.key] ? ' checked' : ''}><span>${esc(i.n)}${i.s ? `<small>${esc(i.s)}</small>` : ''}</span>${i.q ? `<em>${esc(i.q)}</em>` : ''}</label></li>`).join('')}</ul></div>`).join('')}
      <div class="f-act"><button type="button" class="sb-btn" id="fp-shop-copy" data-copy="${esc(shopText(groups, ck))}">Copia la lista</button></div>
    </details></section>`;
  }
  function onShopChange(inp) {
    const s = store.get('shop', null), ck = Object.assign({}, s && s.week === mondayKey() && s.checked ? s.checked : {});
    if (inp.checked) ck[inp.dataset.shop] = true; else delete ck[inp.dataset.shop];
    store.set('shop', { week: mondayKey(), checked: ck });
    const lab = inp.closest('.fp-si'); if (lab) lab.classList.toggle('done', inp.checked);
    const groups = shopGroups(), all = groups.reduce((a, g) => a.concat(g.items), []), got = all.filter(i => ck[i.key]).length;
    const n = document.getElementById('fp-shop-n'); if (n) n.textContent = got ? got + ' di ' + all.length : all.length + ' voci';
    const cp = document.getElementById('fp-shop-copy'); if (cp) cp.dataset.copy = shopText(groups, ck);
    A.buzz();
  }
  document.addEventListener('toggle', e => { if (e.target && e.target.id === 'fp-shop') shopOpen = e.target.open; }, true);

  /* =====================================================================
     1) CODICE A BARRE — Html5Qrcode (caricato solo al primo uso) + Open Food Facts
     ===================================================================== */
  const LIB = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
  let libP = null, cam = null, camStart = null, camBox = null, sc = null, scanTok = 0;
  function loadLib() {
    if (window.Html5Qrcode) return Promise.resolve();
    if (libP) return libP;
    libP = new Promise((ok, ko) => {
      const s = document.createElement('script'); s.src = LIB; s.async = true;
      const tm = setTimeout(() => { s.onload = s.onerror = null; s.remove(); ko(new Error('timeout')); }, 20000);
      s.onload = () => { clearTimeout(tm); window.Html5Qrcode ? ok() : ko(new Error('lib')); };
      s.onerror = () => { clearTimeout(tm); s.remove(); ko(new Error('rete')); };
      document.head.appendChild(s);
    }).catch(e => { libP = null; throw e; });
    return libP;
  }
  function formats() {
    const F = window.Html5QrcodeSupportedFormats || {};
    return ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E'].map(k => F[k]).filter(v => v != null);
  }
  async function startCam() {
    const tok = scanTok, el = document.getElementById('bc-cam');
    if (!el || !sc) return;
    if (!window.isSecureContext || !navigator.mediaDevices) { sc.st = 'camerr'; sc.msg = 'La fotocamera funziona solo con il sito aperto in HTTPS. Scrivi il codice qui sotto.'; renderScan(); return; }
    // Ogni avvio usa un contenitore nuovo: lo spegnimento di quello vecchio (asincrono) non tocca il nuovo
    el.hidden = false; el.innerHTML = '';
    const box = document.createElement('div'); box.id = 'bc-v' + tok; el.appendChild(box); camBox = box;
    try {
      const fm = formats();
      cam = new window.Html5Qrcode(box.id, fm.length ? { formatsToSupport: fm, verbose: false, experimentalFeatures: { useBarCodeDetectorIfSupported: true } } : false);
      camStart = cam.start({ facingMode: 'environment' }, { fps: 10, qrbox: (w, h) => ({ width: Math.max(160, Math.floor(w * 0.85)), height: Math.max(90, Math.floor(Math.min(w, h) * 0.45)) }) },
        txt => { if (tok === scanTok && sc && sc.st === 'cam') { A.buzz(30); lookup(txt); } }, () => {});
      await camStart;
      if (tok !== scanTok || !sc || sc.st !== 'cam') stopCam();
    } catch (e) {
      const s = String((e && (e.name || e.message)) || e);
      stopCam();
      if (tok !== scanTok || !sc) return;
      sc.st = 'camerr';
      sc.msg = /NotAllowed|Permission|denied/i.test(s) ? 'Accesso alla fotocamera negato. Consentilo nelle impostazioni del browser, oppure scrivi il codice qui sotto.'
        : /NotFound|Overconstrained|no camera|Requested device/i.test(s) ? 'Non trovo una fotocamera. Scrivi il codice qui sotto.'
        : 'Non riesco ad aprire la fotocamera. Riprova o scrivi il codice qui sotto.';
      renderScan();
    }
  }
  function stopCam() {
    const h = cam, p = camStart, box = camBox; cam = null; camStart = null; camBox = null;
    const el = document.getElementById('bc-cam');
    // Ferma subito i flussi video (anche se la libreria è ancora in avvio)
    const kill = () => { if (box) box.querySelectorAll('video').forEach(v => { try { (v.srcObject && v.srcObject.getTracks ? v.srcObject.getTracks() : []).forEach(t => t.stop()); v.srcObject = null; } catch (e) { /* niente */ } }); };
    kill();
    if (el) el.hidden = true;
    if (!h) { if (box) box.remove(); return; }
    Promise.resolve(p).catch(() => {}).then(() => { try { return h.isScanning ? h.stop() : null; } catch (e) { return null; } }).catch(() => {})
      .then(() => { kill(); try { h.clear(); } catch (e) { /* niente */ } if (box) box.remove(); });
  }
  function openScan() {
    closeScan(true);
    scanTok++;
    sc = { st: 'lib', msg: '', fd: null, name: '', meal: A.mealNow(), dk: A.foodDay || todayKey() };
    const ov = document.createElement('div');
    ov.className = 'fp-ov'; ov.id = 'fp-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Scansiona un codice a barre');
    ov.innerHTML = `<div class="fp-sheet panel dark"><div class="fp-sh"><h3>Codice a barre</h3><button type="button" class="btn-ghost" data-bc="close">Chiudi</button></div>
      <div id="bc-cam" class="fp-cam" hidden></div><div id="bc-body" aria-live="polite"></div></div>`;
    document.body.appendChild(ov);
    document.documentElement.classList.add('fp-lock');
    renderScan();
    const tok = scanTok;
    loadLib().then(() => { if (tok !== scanTok || !sc) return; sc.st = 'cam'; renderScan(); startCam(); })
      .catch(() => { if (tok !== scanTok || !sc) return; sc.st = 'camerr'; sc.msg = 'Non riesco a caricare lo scanner: controlla la connessione. Puoi anche scrivere il codice a mano.'; renderScan(); });
  }
  function closeScan(silent) {
    scanTok++; stopCam(); sc = null;
    const ov = document.getElementById('fp-ov'); if (ov) ov.remove();
    document.documentElement.classList.remove('fp-lock');
    if (!silent) { const b = document.querySelector('[data-bc="open"]'); if (b) b.focus({ preventScroll: true }); }
  }
  const manualHTML = lbl => `<div class="fp-man"><label class="w-in"><input id="bc-code" inputmode="numeric" pattern="[0-9]*" autocomplete="off" enterkeyhint="search" maxlength="14" placeholder="${lbl || 'Codice a mano'}" aria-label="Codice a barre (cifre)"></label><button type="button" class="sb-btn" data-bc="manual">Cerca</button></div>`;
  function renderScan() {
    const body = document.getElementById('bc-body'); if (!body || !sc) return;
    const cam = document.getElementById('bc-cam'); if (cam && sc.st !== 'cam') cam.hidden = true;
    const st = sc.st;
    if (st === 'lib') body.innerHTML = '<p class="fp-msg">Preparo la fotocamera…</p>' + manualHTML();
    else if (st === 'cam') body.innerHTML = '<p class="fp-msg">Inquadra il codice a barre della confezione, ben dritto e con luce.</p>' + manualHTML();
    else if (st === 'camerr') body.innerHTML = `<p class="fp-msg bad">${esc(sc.msg)}</p>${manualHTML()}${window.Html5Qrcode ? '<div class="f-act"><button type="button" class="btn-ghost" data-bc="retry">Riprova la fotocamera</button></div>' : '<div class="f-act"><button type="button" class="btn-ghost" data-bc="reload">Riprova</button></div>'}`;
    else if (st === 'search') body.innerHTML = `<p class="fp-msg">Cerco il prodotto ${esc(sc.code || '')}…</p>`;
    else if (st === 'neterr' || st === 'none') body.innerHTML = `<p class="fp-msg${st === 'neterr' ? ' bad' : ''}">${esc(sc.msg)}</p>
      ${st === 'none' ? '<p class="small">Crealo dall\'etichetta: ti servono kcal, proteine, carboidrati e grassi per 100 g. Poi lo ritrovi nella ricerca.</p>' : ''}
      <div class="f-act">${st === 'none' ? '<button type="button" class="sb-btn" data-bc="label">Crea dall\'etichetta</button>' : `<button type="button" class="sb-btn" data-bc="again" data-code="${esc(sc.code || '')}">Riprova</button>`}<button type="button" class="btn-ghost" data-bc="retry">Scansiona un altro</button></div>${manualHTML('Prova un altro codice')}`;
    else if (st === 'found') {
      const fd = sc.fd, g = fd.g || 100, pv = A.forGrams(fd, g);
      body.innerHTML = `<div class="fp-res"><p class="small">Trovato ✓ ${sc.cached ? 'tra i tuoi alimenti' : 'su Open Food Facts'} · salvato tra i tuoi alimenti</p><h4>${esc(fd.n)}</h4>
        <p class="small">Per 100 g: ${n0(fd.k)} kcal · P ${n1(fd.p)} · C ${n1(fd.c)} · G ${n1(fd.f)}</p>
        <div class="f-portions">${[[0.5, 'Mezza'], [1, fd.u === 'porzione' ? 'Porzione' : '100 g'], [2, 'Doppia']].map(x => `<button type="button" data-bcg="${Math.round(g * x[0])}">${esc(x[1])} <small>${Math.round(g * x[0])} g</small></button>`).join('')}</div>
        <label class="w-in f-gin"><input id="bc-g" inputmode="decimal" autocomplete="off" aria-label="Quantità in grammi" value="${g}"><span>g</span></label>
        <p class="f-prev" id="bc-prev">${n0(pv.k)} kcal · P ${n1(pv.p)} g · C ${n1(pv.c)} g · G ${n1(pv.f)} g</p>
        <div class="fp-meals" role="group" aria-label="Pasto">${A.MEALS.map(([m, l]) => `<button type="button" data-bcm="${m}" aria-pressed="${sc.meal === m}">${esc(l)}</button>`).join('')}</div>
        <div class="f-act"><button type="button" class="sb-btn" data-bc="add">Aggiungi a ${esc(MEAL_LBL(sc.meal).toLowerCase())}</button><button type="button" class="btn-ghost" data-bc="retry">Scansiona un altro</button></div></div>`;
    }
  }
  const bcGrams = () => { const v = parseFloat(String((document.getElementById('bc-g') || {}).value || '').replace(',', '.')); return isFinite(v) && v > 0 && v <= 3000 ? Math.round(v) : null; };
  function updBcPrev() {
    const p = document.getElementById('bc-prev'); if (!p || !sc || !sc.fd) return;
    const g = bcGrams(); if (!g) { p.textContent = 'Scrivi i grammi'; return; }
    const v = A.forGrams(sc.fd, g); p.textContent = n0(v.k) + ' kcal · P ' + n1(v.p) + ' g · C ' + n1(v.c) + ' g · G ' + n1(v.f) + ' g';
  }
  // Da risposta di Open Food Facts ad alimento personalizzato (stesso formato di app.js); null se mancano i valori
  function productToFood(pr, code) {
    if (!pr) return null;
    const nu = pr.nutriments || {};
    let k = num(nu['energy-kcal_100g']);
    if (k == null) { const kj = num(nu['energy-kj_100g'] != null ? nu['energy-kj_100g'] : nu.energy_100g); if (kj != null) k = kj / 4.184; }
    const p = num(nu.proteins_100g), c = num(nu.carbohydrates_100g), f = num(nu.fat_100g);
    if (k == null || p == null || c == null || f == null || k > 950 || p + c + f > 105) return null;
    const base = String(pr.product_name_it || pr.product_name || '').trim() || 'Prodotto ' + code;
    const brand = String(pr.brands || '').split(',')[0].trim();
    const n = (brand && A.fold(base).indexOf(A.fold(brand)) < 0 ? base + ' (' + brand + ')' : base).slice(0, 60);
    const sq = num(pr.serving_quantity);
    const hasP = sq != null && sq > 0 && sq <= 2000;
    return { id: 'c-' + Date.now().toString(36), n, k: Math.round(k), p: r1(p), c: r1(c), f: r1(f), g: hasP ? Math.round(sq) : 100, u: hasP ? 'porzione' : '100 g', cat: 'I miei alimenti', bc: code };
  }
  async function lookup(raw) {
    if (!sc) return;
    const code = String(raw || '').replace(/\D/g, '');
    if (!/^\d{8,14}$/.test(code)) {
      const i = document.getElementById('bc-code'); if (i) { i.classList.add('bad'); i.focus(); }
      return;
    }
    stopCam();
    const tok = scanTok; sc.code = code;
    const local = A.customFoods().find(f => f && f.bc === code);
    if (local) { sc.st = 'found'; sc.fd = local; sc.cached = true; renderScan(); return; }
    sc.st = 'search'; renderScan();
    let res = null, j = null;
    try {
      const ctl = window.AbortController ? new AbortController() : null, tm = setTimeout(() => ctl && ctl.abort(), 15000);
      res = await fetch('https://world.openfoodfacts.org/api/v2/product/' + code + '.json?fields=product_name,product_name_it,brands,nutriments,serving_quantity', ctl ? { signal: ctl.signal } : {});
      clearTimeout(tm);
      if (res.ok || res.status === 404) j = await res.json().catch(() => null);
    } catch (e) { res = null; }
    if (tok !== scanTok || !sc) return;
    if (!res || (!res.ok && res.status !== 404)) { sc.st = 'neterr'; sc.msg = 'Non riesco a collegarmi alla banca dati dei prodotti. Controlla la connessione e riprova.'; renderScan(); return; }
    const pr = j && j.status === 1 ? j.product : null, fd = productToFood(pr, code);
    if (!fd) {
      sc.st = 'none'; sc.name = pr ? String(pr.product_name_it || pr.product_name || '').trim() : '';
      sc.msg = pr ? `Ho trovato ${sc.name ? '«' + sc.name + '»' : 'il prodotto'}, ma senza tutti i valori nutrizionali.` : 'Questo prodotto non è ancora nella banca dati di Open Food Facts.';
      renderScan(); return;
    }
    store.set('food-custom', [fd].concat(A.customFoods().filter(x => x && x.bc !== code)).slice(0, 200));
    sc.st = 'found'; sc.fd = fd; sc.cached = false; renderScan();
  }
  function addScanned() {
    const fd = sc && sc.fd, g = bcGrams();
    if (!fd || !g) { const i = document.getElementById('bc-g'); if (i) { i.classList.add('bad'); i.focus(); } return; }
    const dk = sc.dk && sc.dk <= todayKey() ? sc.dk : todayKey(), m = sc.meal;
    const list = A.dayFood(dk).slice();
    list.push(Object.assign({ id: newId(), m, n: fd.n, g }, A.forGrams(fd, g)));
    A.setDayFood(dk, list);
    store.set('food-recent', [fd.id].concat((store.get('food-recent', []) || []).filter(x => x !== fd.id)).slice(0, 12));
    closeScan(true); A.buzz(); A.route(true); flash('meal-' + m);
    const box = document.getElementById('meal-' + m); if (box) box.scrollIntoView({ block: 'center', behavior: A.reduced ? 'auto' : 'smooth' });
  }
  function fromLabel() {
    const m = sc ? sc.meal : A.mealNow(), name = sc ? sc.name : '';
    closeScan(true);
    const add = document.querySelector('[data-fadd="' + m + '"]'); if (add) add.click();
    const nw = document.querySelector('[data-fx="new"]'); if (nw) nw.click();
    const n = document.getElementById('fn-n'); if (n) { if (name) n.value = name.slice(0, 60); n.focus({ preventScroll: true }); }
    const pk = document.getElementById('f-pick'); if (pk) pk.scrollIntoView({ block: 'start', behavior: A.reduced ? 'auto' : 'smooth' });
  }
  function onScanClick(t) {
    const b = t.closest('[data-bc]');
    if (b) {
      const a = b.dataset.bc;
      if (a === 'open') { A.buzz(); openScan(); }
      else if (!sc) return true;
      else if (a === 'close') closeScan();
      else if (a === 'manual') lookup((document.getElementById('bc-code') || {}).value);
      else if (a === 'again') lookup(b.dataset.code);
      else if (a === 'retry' || a === 'reload') { if (!window.Html5Qrcode) { openScan(); return true; } scanTok++; stopCam(); sc.st = 'cam'; sc.fd = null; renderScan(); startCam(); }
      else if (a === 'add') addScanned();
      else if (a === 'label') fromLabel();
      return true;
    }
    if (!sc) return false;
    const g = t.closest('[data-bcg]'); if (g) { const i = document.getElementById('bc-g'); if (i) { i.value = g.dataset.bcg; i.classList.remove('bad'); updBcPrev(); } A.buzz(); return true; }
    const m = t.closest('[data-bcm]'); if (m) { sc.meal = m.dataset.bcm; const gv = (document.getElementById('bc-g') || {}).value; renderScan(); const i = document.getElementById('bc-g'); if (i && gv) { i.value = gv; updBcPrev(); } return true; }
    if (t === document.getElementById('fp-ov')) { closeScan(); return true; }
    return !!t.closest('#fp-ov');
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sc) { e.preventDefault(); closeScan(); return; }
    if (e.key !== 'Enter' || !e.target) return;
    if (e.target.id === 'bc-code') { e.preventDefault(); lookup(e.target.value); }
    else if (e.target.id === 'bc-g') { e.preventDefault(); addScanned(); }
    else if (e.target.id === 'fp-favname') { e.preventDefault(); const b = document.querySelector('[data-fpsaveok]'); if (b) b.click(); }
  });
  window.addEventListener('pagehide', () => { if (sc) closeScan(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && cam) { stopCam(); if (sc && sc.st === 'cam') { sc.st = 'camerr'; sc.msg = 'Fotocamera in pausa.'; renderScan(); } } });

  /* ---------- ganci ---------- */
  A.hooks.food.push(dk => {
    if (!dk || dk > todayKey()) return '';
    const scan = `<section class="panel fp-box"><div class="fp-scan"><p class="small">Prodotto confezionato? Leggi i valori dal codice a barre.</p><button type="button" class="sb-btn" data-bc="open">Scansiona un codice a barre</button></div></section>`;
    return scan + waterHTML(dk, false) + shopHTML();
  });
  A.hooks.meal.push(mealHook);
  A.hooks.home.push(Object.assign(() => waterHTML(todayKey(), true), { slot: 'duo' }));
  A.waterGoal = dk => waterGoal(dk).n; // un solo obiettivo dell'acqua per tutta l'app
  A.hooks.click.push(e => {
    const t = e.target; if (!t || !t.closest) return false;
    if (onScanClick(t)) return true;
    const w = t.closest('[data-fpw]'); if (w) { onWaterClick(w); return true; }
    return onMealClick(t);
  });
  A.hooks.change.push(e => { const t = e.target; if (t && t.matches && t.matches('input[data-shop]')) { onShopChange(t); return true; } return false; });
  A.hooks.input.push(e => {
    const t = e.target; if (!t) return false;
    if (t.id === 'bc-g') { t.classList.remove('bad'); updBcPrev(); return true; }
    if (t.id === 'bc-code') { t.classList.remove('bad'); return true; }
    return false;
  });
  A.hooks.after.push(id => {
    if (id !== 'cibo') { if (sc) closeScan(true); favSave = null; favOpen = null; favNote = null; }
    else if (favNote) setTimeout(() => { favNote = null; }, 0); // la conferma resta visibile solo fino al prossimo disegno
  });

  // Solo per i test in Node
  if (typeof window.__fpTest === 'object') Object.assign(window.__fpTest, { shopBase, productToFood, waterGoal, mostUsed, shopText });
});
