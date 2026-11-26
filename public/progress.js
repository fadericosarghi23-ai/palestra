/* starfit+ — progress: carichi e progressione nelle schede, modalità allenamento a tutto schermo */
(window.FitPlugins = window.FitPlugins || []).push(function (A) {
  const { store, EX, esc, fold } = A;

  /* ---------- stile ---------- */
  if (!document.getElementById('sf-progress')) {
    const st = document.createElement('style');
    st.id = 'sf-progress';
    st.textContent = `
.pg-ld { display: grid; gap: 6px; min-width: 0; }
.pg-in { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.pg-f { display: flex; align-items: center; gap: 6px; margin: 0; }
.pg-f input { width: 86px; min-height: 44px; box-sizing: border-box; padding: 0 8px; border-radius: 10px; border: 1.5px solid var(--steel-line); background: #fff; color: var(--ink); font: 700 18px/1 var(--body); text-align: center; font-variant-numeric: tabular-nums; }
.pg-f input:focus { outline: 2px solid var(--fire); outline-offset: 1px; }
.pg-f span { font-size: 13px; font-weight: 600; color: var(--ink-muted); }
.pg-x { font-weight: 700; color: var(--ink-muted); }
.pg-rec { margin-left: auto; color: var(--fire); font-weight: 800; font-size: 13px; white-space: nowrap; }
.pg-why, .pg-today { margin: 0; font-size: 13px; line-height: 1.35; color: var(--ink-muted); overflow-wrap: anywhere; }
.pg-today b { color: var(--ink); }
.pg-prog { margin-top: 2px; }
.pg-spark { display: block; width: 100%; height: 56px; }
.pg-sl { display: flex; justify-content: space-between; gap: 8px; margin: 4px 0 0; font-size: 13px; color: var(--ink-muted); }
.pg-sl b { color: var(--ink); }
.ex ul.pg-list, ul.pg-list { list-style: none; padding: 0; margin: 8px 0 4px; display: grid; gap: 4px; font-size: 14px; }
.pg-list li { display: flex; gap: 8px; min-width: 0; }
.pg-list li b { flex: none; min-width: 84px; font-weight: 700; }
.pg-list li span { min-width: 0; overflow-wrap: anywhere; }
.pg-go { margin: 0 0 18px; }
.pg-go .pg-start { display: block; width: 100%; min-height: 64px; border-radius: 14px; font-family: var(--display); font-weight: 800; font-size: 24px; text-transform: uppercase; letter-spacing: .02em; }
.pg-go .small { margin: 6px 0 0; }
#diary { scroll-margin-top: 90px; }
html.pg-lock, html.pg-lock body { overflow: hidden; }
html.pg-lock .timer { z-index: 1001; bottom: 0; padding-bottom: env(safe-area-inset-bottom, 0px); }
.pg-ov { position: fixed; inset: 0; z-index: 1000; display: flex; flex-direction: column; background: var(--iron); color: var(--on-iron);
  padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) 0 env(safe-area-inset-left, 0px); overscroll-behavior: contain; touch-action: pan-y; }
.pg-top { flex: none; display: flex; align-items: center; gap: 6px; padding: 8px 12px; }
.pg-top .pg-cnt { flex: 1; min-width: 0; text-align: center; font-family: var(--display); font-weight: 800; text-transform: uppercase; letter-spacing: .06em; font-size: 16px; font-variant-numeric: tabular-nums; }
.pg-ov button { font-family: var(--body); cursor: pointer; -webkit-user-select: none; user-select: none; }
.pg-ov button:active { transform: scale(.97); }
.pg-arr { flex: none; width: 48px; height: 44px; border-radius: 12px; border: 1px solid var(--iron-3); background: var(--iron-2); color: var(--on-iron); font-size: 22px; font-weight: 700; }
.pg-arr:disabled { opacity: .35; }
.pg-close { flex: none; min-height: 44px; padding: 0 16px; border-radius: 999px; border: 1.5px solid var(--on-iron-muted); background: transparent; color: var(--on-iron); font-weight: 700; font-size: 15px; }
.pg-bar { flex: none; height: 6px; background: var(--iron-3); }
.pg-bar i { display: block; height: 100%; background: var(--fire-bright); transition: width .25s; }
.pg-scroll { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 18px 16px calc(28px + env(safe-area-inset-bottom, 0px)); }
body.has-timer .pg-scroll { padding-bottom: calc(190px + env(safe-area-inset-bottom, 0px)); }
.pg-in-ov { max-width: 560px; margin: 0 auto; display: grid; gap: 12px; }
.pg-blk { margin: 0; font-family: var(--display); font-weight: 700; text-transform: uppercase; letter-spacing: .1em; font-size: 14px; color: var(--fire-bright); }
.pg-name { margin: 0; font-family: var(--display); font-weight: 800; text-transform: uppercase; font-size: 40px; line-height: 1; text-wrap: balance; overflow-wrap: anywhere; }
.pg-dose { margin: 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; }
.pg-dose b { font-family: var(--display); font-weight: 800; font-size: 44px; line-height: 1; color: var(--fire-bright); font-variant-numeric: tabular-nums; }
.pg-dose span { font-size: 15px; color: var(--on-iron-muted); }
.pg-dose span strong { color: var(--on-iron); }
.pg-note { margin: 0; font-weight: 600; font-size: 16px; line-height: 1.35; }
.pg-dots { display: flex; align-items: center; gap: 7px; }
.pg-dots i { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--on-iron-muted); }
.pg-dots i.on { background: var(--fire); border-color: var(--fire); }
.pg-dots span { margin-left: 4px; font-weight: 700; font-size: 15px; font-variant-numeric: tabular-nums; }
.pg-done-tag { margin: 0; color: var(--fire-bright); font-weight: 800; font-size: 15px; }
.pg-ld.dk .pg-f input { width: 110px; min-height: 60px; background: var(--iron-2); border-color: var(--iron-3); color: var(--on-iron); font: 800 30px/1 var(--display); }
.pg-ld.dk .pg-f span, .pg-ld.dk .pg-x, .pg-ld.dk .pg-why, .pg-ld.dk .pg-today { color: var(--on-iron-muted); }
.pg-ld.dk .pg-today b { color: var(--on-iron); }
.pg-ld.dk .pg-why, .pg-ld.dk .pg-today { font-size: 14px; }
.pg-ld.dk .pg-rec { color: var(--fire-bright); font-size: 15px; }
.pg-big { display: block; width: 100%; min-height: 76px; border: 0; border-radius: 18px; background: var(--fire); color: #fff; font-family: var(--display) !important; font-weight: 800; font-size: 30px; text-transform: uppercase; letter-spacing: .02em; line-height: 1.05; padding: 10px 16px; }
.pg-big:hover { background: #c42813; }
.pg-hold { display: block; width: 100%; min-height: 60px; border: 1px solid var(--iron-3); border-radius: 16px; background: var(--iron-2); color: var(--on-iron); font-family: var(--display) !important; font-weight: 800; font-size: 24px; text-transform: uppercase; }
.pg-sub { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; }
.pg-undo, .pg-ghost { min-height: 44px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--iron-3); background: transparent; color: var(--on-iron-muted); font-weight: 600; font-size: 14px; }
.pg-next { margin: 0; font-size: 14px; color: var(--on-iron-muted); }
.pg-next b { color: var(--on-iron); }
.pg-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.pg-stats div { background: var(--iron-2); border: 1px solid var(--iron-3); border-radius: 12px; padding: 12px 8px; text-align: center; min-width: 0; }
.pg-stats b { display: block; font-family: var(--display); font-weight: 800; font-size: 34px; line-height: 1; color: var(--fire-bright); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.pg-stats span { display: block; margin-top: 4px; font-size: 13px; color: var(--on-iron-muted); }
.pg-p { margin: 0; font-size: 15px; line-height: 1.4; color: var(--on-iron-muted); }
.pg-p b { color: var(--on-iron); }
@media (prefers-reduced-motion: reduce) { .pg-bar i { transition: none; } .pg-ov button:active { transform: none; } }
`;
    document.head.appendChild(st);
  }

  /* ---------- funzioni pure ---------- */
  const NOLOAD = new Set(['Mobilità', 'Stretching', 'Recupero', 'Riscaldamento', 'Attivazione', 'Velocità', 'Agilità', 'Pliometria']);
  const r2 = n => Math.round(n * 100) / 100;
  const fk = n => r2(n).toLocaleString('it-IT', { maximumFractionDigits: 2 });
  const todayK = () => A.dkey(new Date());

  // "4 × 6–8" → {min:6, max:8}; "3 × 10" → {min:10, max:10}; tempi e metri → null
  function repRange(s) {
    const m = /^\s*\d+(?:\s*[–-]\s*\d+)?\s*×\s*(\d+)(?:\s*[–-]\s*(\d+))?\s*(.*)$/.exec(String(s || ''));
    if (!m) return null;
    const unit = m[3].trim();
    if (/^(″|"|′|'|m\b|min|s\b|sec|km|metri)/i.test(unit)) return null;
    const a = +m[1], b = +(m[2] || m[1]);
    return a > 0 ? { min: Math.min(a, b), max: Math.max(a, b) } : null;
  }
  // Incremento consigliato in kg
  function incFor(exId, progId) {
    const e = EX[exId] || {};
    const t = fold((e.eq || '') + ' ' + (e.name || ''));
    const small = /manubri|kettlebell|goblet/.test(t);
    const heavy = /bilanciere|trap bar|stacco|hip thrust|panca piana/.test(t);
    const mach = /macchina|machine|\bcav[oi]\b|landmine|pulley|leg press|smith/.test(t);
    if (progId === 'glutei') return small ? 1 : (heavy || mach) ? 2.5 : 1;
    return small ? 2 : 2.5;
  }
  // Massimale stimato (Epley); senza ripetizioni (tempi, metri) conta il carico
  const e1rm = s => !s || s.kg == null || !(s.kg > 0) ? null : s.reps > 0 ? s.kg * (1 + s.reps / 30) : s.kg;
  function bestOf(h) {
    let b = null;
    (h && h.sets || []).forEach(s => { const v = e1rm(s); if (v != null && (b == null || v > b)) b = v; });
    return b;
  }
  // "60 kg × 8, 8 · 62,5 kg × 6"
  function describe(sets) {
    const parts = []; let cur = null;
    (sets || []).forEach(s => {
      const k = s && s.kg > 0 ? s.kg : null;
      if (!cur || cur.kg !== k) { cur = { kg: k, r: [] }; parts.push(cur); }
      cur.r.push(s && s.reps > 0 ? s.reps : null);
    });
    return parts.map(p => {
      const reps = p.r.some(x => x != null) ? p.r.map(x => x == null ? '—' : x).join(', ') : '';
      if (p.kg == null) return reps ? reps + ' rip.' : p.r.length + ' serie';
      return fk(p.kg) + ' kg × ' + (reps || p.r.length + ' serie');
    }).join(' · ');
  }
  function cleanHist(arr) {
    return (Array.isArray(arr) ? arr : []).filter(h => h && typeof h.d === 'string' && Array.isArray(h.sets))
      .map(h => ({ d: h.d, u: h.u, sets: h.sets.filter(s => s && typeof s === 'object').map(s => ({ kg: typeof s.kg === 'number' && isFinite(s.kg) ? s.kg : null, reps: typeof s.reps === 'number' && isFinite(s.reps) ? s.reps : null })) }))
      .sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0);
  }
  // Consiglio per oggi a partire dall'ultima seduta prima di oggi
  function suggest(hist, it, exId, today, progId) {
    const past = hist.filter(h => h.d < today && h.sets.length);
    const last = past[past.length - 1];
    if (!last) return null;
    const range = repRange(it && it.s);
    const kgs = last.sets.map(s => s.kg).filter(x => x != null && x > 0);
    const lastKg = kgs.length ? Math.max(...kgs) : null;
    const desc = describe(last.sets);
    if (!range) return { kg: lastKg, up: false, last, why: '' };
    const planned = A.parseSets(it.s) || last.sets.length;
    const allHit = last.sets.length >= planned && last.sets.every(s => s.reps != null && s.reps >= range.max);
    if (lastKg == null) {
      return { kg: null, up: allHit, last, why: `La volta scorsa ${desc} → ` + (allHit ? "prova 1 ripetizione in più o aggiungi un po' di peso" : `punta a ${range.max} in tutte le serie`) };
    }
    if (allHit) { const nk = r2(lastKg + incFor(exId, progId)); return { kg: nk, up: true, last, why: `La volta scorsa ${desc} → prova ${fk(nk)} kg` }; }
    return { kg: lastKg, up: false, last, why: `La volta scorsa ${desc} → resta a ${fk(lastKg)} kg finché non fai ${range.max} in tutte le serie` };
  }
  function isRecordToday(hist, today) {
    const t = hist.find(h => h.d === today); if (!t) return false;
    const tb = bestOf(t); if (tb == null) return false;
    let pb = null; hist.forEach(h => { if (h.d < today) { const b = bestOf(h); if (b != null && (pb == null || b > pb)) pb = b; } });
    return pb != null && tb > pb + 1e-6;
  }
  const parseLoad = v => { const s = String(v == null ? '' : v).replace(',', '.').replace(/[^0-9.]/g, ''); if (!s) return null; const n = parseFloat(s); return isFinite(n) && n > 0 && n <= 600 ? r2(n) : null; };
  const parseReps = v => { const n = parseInt(String(v == null ? '' : v).replace(/\D/g, ''), 10); return isFinite(n) && n > 0 && n <= 300 ? n : null; };

  /* ---------- dati ---------- */
  const progId = () => (A.PROG && A.PROG.id) || 'terzino';
  const loadsOf = exId => { const L = store.get('loads', {}) || {}; return cleanHist(L[exId]); };
  const liveSets = () => A.sets || store.get('sets', {}) || {}; // oggetto vivo di app.js, così non viene sovrascritto
  const setsOf = uid => { const S = liveSets(); return +S[uid] || 0; };
  const draft = {};      // valori scritti nei campi e non ancora registrati, per uid
  const openProg = {};   // "Progressi" aperto, per uid
  function saveHist(exId, arr) {
    const L = store.get('loads', {}) || {};
    let a = arr.filter(h => h.sets.length).sort((x, y) => x.d < y.d ? -1 : x.d > y.d ? 1 : 0);
    if (a.length > 40) a = a.slice(-40);
    if (a.length) L[exId] = a; else delete L[exId];
    store.set('loads', L);
  }
  function recordSet(exId, uid, n, kg, reps) {
    if (!exId || (kg == null && reps == null)) return false;
    const arr = loadsOf(exId), t = todayK();
    let en = arr.find(h => h.d === t);
    if (!en) { en = { d: t, u: uid, sets: [] }; arr.push(en); }
    en.u = uid;
    const i = Math.max(0, Math.min((n || 1) - 1, en.sets.length));
    en.sets[i] = { kg, reps };
    saveHist(exId, arr);
    return true;
  }
  function truncateToday(exId, keep) {
    const arr = loadsOf(exId), en = arr.find(h => h.d === todayK());
    if (!en || en.sets.length <= keep) return;
    en.sets.length = Math.max(0, keep);
    saveHist(exId, arr);
  }
  function shownItem(uid) {
    for (const d of A.days()) {
      const it = (d.items || []).find(x => x.uid === uid);
      if (it) return A.hooks.item.reduce((x, f) => { try { return f(x, d) || x; } catch (e) { return x; } }, it);
    }
    return null;
  }
  const hasRow = (exId, it) => !!(EX[exId] && it && A.parseSets(it.s) > 0 && !NOLOAD.has(EX[exId].cat));
  const cssq = s => window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&');

  /* ---------- riga carichi (scheda e allenamento) ---------- */
  function spark(vals) {
    const W = 280, H = 56, P = 5, n = vals.length;
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (hi - lo < 1) { lo -= 1; hi += 1; }
    const x = i => P + i * (W - 2 * P) / (n - 1), y = v => H - P - (v - lo) / (hi - lo) * (H - 2 * P);
    const pts = vals.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ');
    return `<svg class="pg-spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Massimale stimato delle ultime ${n} sedute, da ${fk(Math.round(vals[0]))} a ${fk(Math.round(vals[n - 1]))} kg">
      <line x1="${P}" x2="${W - P}" y1="${H - P}" y2="${H - P}" stroke="var(--steel-line)" stroke-width="1"/>
      <polyline points="${pts}" fill="none" stroke="var(--fire)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${x(n - 1).toFixed(1)}" cy="${y(vals[n - 1]).toFixed(1)}" r="4" fill="var(--fire)"/></svg>`;
  }
  function progHTML(hist, uid) {
    const sess = hist.filter(h => h.sets.length);
    if (!sess.length) return '';
    const vals = sess.map(bestOf).filter(v => v != null).slice(-12);
    const chart = vals.length >= 2 ? spark(vals) + `<p class="pg-sl"><span>Massimale stimato (Epley)</span><span>da ${fk(Math.round(vals[0]))} a <b>${fk(Math.round(vals[vals.length - 1]))} kg</b></span></p>` : '';
    const list = sess.slice(-5).reverse().map(h => `<li><b>${esc(A.fmt(A.kdate(h.d), { weekday: 'short', day: 'numeric', month: 'short' }))}</b><span>${esc(describe(h.sets))}</span></li>`).join('');
    return `<details class="how pg-prog" data-pgprog="${esc(uid)}"${openProg[uid] ? ' open' : ''}><summary>Progressi <span>${sess.length} ${sess.length === 1 ? 'seduta' : 'sedute'}</span></summary>${chart}<ul class="pg-list">${list}</ul></details>`;
  }
  function rowHTML(exId, it, uid, dark) {
    if (!hasRow(exId, it)) return '';
    const hist = loadsOf(exId), t = todayK();
    const tEn = hist.find(h => h.d === t && h.sets.length);
    const range = repRange(it.s), sug = suggest(hist, it, exId, t, progId());
    const tl = tEn ? tEn.sets[tEn.sets.length - 1] : null, dr = draft[uid] || {};
    const kgV = 'kg' in dr ? dr.kg : tl && tl.kg != null ? fk(tl.kg) : sug && sug.kg != null ? fk(sug.kg) : '';
    const repV = 'reps' in dr ? dr.reps : tl && tl.reps != null ? String(tl.reps) : range ? String(sug && sug.up ? range.min : range.max) : '';
    const rec = isRecordToday(hist, t);
    const sets = A.parseSets(it.s);
    const hint = sug && sug.why ? sug.why : !hist.length && (sets > 1 || dark) ? 'Scrivi chili e ripetizioni, poi tocca «Serie fatta»: la prossima volta ti consiglio il carico. A corpo libero lascia vuoto kg.' : '';
    return `<div class="pg-ld${dark ? ' dk' : ''}" data-uid="${esc(uid)}" data-ex="${esc(exId)}">
      <div class="pg-in"><label class="pg-f"><input type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" data-pg="kg" value="${esc(kgV)}" placeholder="—" aria-label="Chili"><span>kg</span></label>
      ${range ? `<span class="pg-x">×</span><label class="pg-f"><input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" enterkeyhint="done" data-pg="reps" value="${esc(repV)}" placeholder="—" aria-label="Ripetizioni"><span>rip.</span></label>` : ''}
      ${rec ? '<span class="pg-rec">Nuovo record ✓</span>' : ''}</div>
      ${hint ? `<p class="pg-why">${esc(hint)}</p>` : ''}
      ${tEn ? `<p class="pg-today"><b>Oggi:</b> ${esc(describe(tEn.sets))}</p>` : ''}
      ${dark ? '' : progHTML(hist, uid)}
    </div>`;
  }
  function findBox(uid) {
    const q = `.pg-ld[data-uid="${cssq(uid)}"]`;
    return (ovEl && ovEl.querySelector(q)) || document.querySelector('#main ' + q);
  }
  function readBox(box) {
    const k = box.querySelector('[data-pg="kg"]'), r = box.querySelector('[data-pg="reps"]');
    return { kg: k ? parseLoad(k.value) : null, reps: r ? parseReps(r.value) : null };
  }
  function refreshRows(uid) {
    const it = shownItem(uid);
    document.querySelectorAll(`#main .pg-ld[data-uid="${cssq(uid)}"]`).forEach(box => {
      const html = it ? rowHTML(box.dataset.ex, it, uid, false) : '';
      if (html) box.outerHTML = html;
    });
  }

  A.hooks.card.push((exId, it, uid) => rowHTML(exId, it, uid, false));

  // "Serie fatta" nella scheda: registra i valori dei campi
  document.addEventListener('fit:set', e => {
    const d = e.detail || {};
    if (d.src === 'progress' || !d.key) return;
    const exId = d.id || ((A.findItem(d.key) || {}).ex);
    const box = findBox(d.key);
    if (!exId || !box) return;
    const v = readBox(box);
    recordSet(exId, d.key, d.n, v.kg, v.reps);
    refreshRows(d.key);
  });
  // Campi: ricorda quello che scrivi (sopravvive ai ridisegni) e tiene allineate scheda e allenamento
  A.hooks.input.push(e => {
    const t = e.target;
    if (!t || !t.dataset || !t.dataset.pg || !t.closest) return false;
    const box = t.closest('.pg-ld'); if (!box) return false;
    const u = box.dataset.uid, f = t.dataset.pg;
    draft[u] = Object.assign(draft[u] || {}, { [f]: t.value });
    document.querySelectorAll(`.pg-ld[data-uid="${cssq(u)}"] [data-pg="${f}"]`).forEach(x => { if (x !== t) x.value = t.value; });
    return true;
  });
  document.addEventListener('toggle', e => {
    const dt = e.target;
    if (dt && dt.dataset && dt.dataset.pgprog != null) { if (dt.open) openProg[dt.dataset.pgprog] = true; else delete openProg[dt.dataset.pgprog]; }
  }, true);

  /* ---------- modalità allenamento ---------- */
  let OV = null, ovEl = null, wl = null, advT = 0;
  const BLK = d => ({ warm: 'Riscaldamento', main: d.type === 'act' ? 'Attivazione' : 'Lavoro principale', end: 'Finale' });
  function ovItems(d) {
    return (d.items || []).filter(it => it && !it.link && it.ex && EX[it.ex])
      .map(it => A.hooks.item.reduce((x, f) => { try { return f(x, d) || x; } catch (e) { return x; } }, it));
  }
  async function lock() {
    try {
      if (!OV || wl || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
      const s = await navigator.wakeLock.request('screen');
      if (!OV) { s.release().catch(() => {}); return; }
      wl = s; wl.addEventListener('release', () => { if (wl === s) wl = null; });
    } catch (e) { wl = null; }
  }
  function unlock() { const s = wl; wl = null; try { if (s) s.release().catch(() => {}); } catch (e) { /* niente */ } }
  document.addEventListener('visibilitychange', () => { if (OV && document.visibilityState === 'visible') lock(); });

  A.hooks.dayTop.push(d => {
    if (!d || (d.type !== 'gym' && d.type !== 'act')) return '';
    const its = ovItems(d); if (!its.length) return '';
    const nd = its.filter(x => A.done[x.uid]).length;
    return `<div class="pg-go"><button type="button" class="sb-btn pg-start" data-pg-start="${esc(d.id)}">▶ Inizia l'allenamento</button>
      <p class="small">${its.length} esercizi${nd ? ` · ${nd} già fatti` : ''} · uno alla volta, a tutto schermo, con lo schermo sempre acceso</p></div>`;
  });

  function openOv(dayId) {
    const d = A.dayById(dayId); if (!d) return;
    const items = ovItems(d); if (!items.length) return;
    if (ovEl) ovEl.remove();
    A.buzz();
    let i = items.findIndex(x => !A.done[x.uid]); if (i < 0) i = 0;
    OV = { d, items, i, t0: Date.now() };
    ovEl = document.createElement('div');
    ovEl.className = 'pg-ov';
    ovEl.setAttribute('role', 'dialog'); ovEl.setAttribute('aria-modal', 'true'); ovEl.setAttribute('aria-label', "Modalità allenamento");
    let sx = null, sy = 0;
    ovEl.addEventListener('touchstart', e => {
      const t = e.touches && e.touches[0];
      sx = t && !(e.target.closest && e.target.closest('input, textarea')) ? t.clientX : null; sy = t ? t.clientY : 0;
    }, { passive: true });
    ovEl.addEventListener('touchend', e => {
      const t = e.changedTouches && e.changedTouches[0];
      if (sx == null || !t) return;
      const dx = t.clientX - sx, dy = t.clientY - sy; sx = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
    }, { passive: true });
    document.body.appendChild(ovEl);
    document.documentElement.classList.add('pg-lock');
    renderOv();
    lock();
  }
  function closeOv(opts) {
    if (!OV) return;
    clearTimeout(advT);
    OV = null; unlock();
    if (ovEl) ovEl.remove(); ovEl = null;
    document.documentElement.classList.remove('pg-lock');
    if (opts && opts.noRoute) return;
    A.route(true);
    if (opts && opts.diary) {
      requestAnimationFrame(() => {
        const el = document.getElementById('diary');
        if (el) el.scrollIntoView({ block: 'start', behavior: A.reduced ? 'auto' : 'smooth' });
      });
    }
  }
  function go(step) {
    if (!OV) return;
    clearTimeout(advT);
    const ni = Math.max(0, Math.min(OV.items.length, OV.i + step));
    if (ni === OV.i) return;
    OV.i = ni; A.buzz(8); renderOv(true);
  }
  function markDone(uid) { const D = A.done; if (D && !D[uid]) { D[uid] = true; store.set('done', D); } }
  const curIt = () => OV && OV.items[OV.i];
  const cardBtn = (uid, act) => document.querySelector(`#main .setbar[data-key="${cssq(uid)}"] button[data-act="${act}"]`);

  function renderOv(top) {
    if (!OV || !ovEl) return;
    const N = OV.items.length, i = OV.i;
    const head = `<div class="pg-top"><button type="button" class="pg-arr" data-pgo="prev" aria-label="Esercizio precedente"${i <= 0 ? ' disabled' : ''}>←</button>
      <span class="pg-cnt" aria-live="polite">${i >= N ? 'Fine' : `Esercizio ${i + 1} di ${N}`}</span>
      <button type="button" class="pg-arr" data-pgo="next" aria-label="Esercizio successivo"${i >= N ? ' disabled' : ''}>→</button>
      <button type="button" class="pg-close" data-pgo="close">Chiudi</button></div>
      <div class="pg-bar" aria-hidden="true"><i style="width:${Math.round(Math.min(i, N) / N * 100)}%"></i></div>`;
    const prevScroll = ovEl.querySelector('.pg-scroll');
    const keepY = !top && prevScroll ? prevScroll.scrollTop : 0;
    ovEl.innerHTML = head + `<div class="pg-scroll"><div class="pg-in-ov">${i >= N ? finishHTML() : exHTML(OV.items[i])}</div></div>`;
    const sc = ovEl.querySelector('.pg-scroll'); if (sc) sc.scrollTop = keepY;
  }
  function exHTML(it) {
    const e = EX[it.ex], uid = it.uid, sets = A.parseSets(it.s), n = Math.min(setsOf(uid), sets);
    const hold = +it.hold || 0, isDone = !!A.done[uid];
    const blk = BLK(OV.d)[it.b] || '';
    const dots = sets > 1 ? `<div class="pg-dots" aria-label="${n} serie su ${sets}">${Array.from({ length: sets }, (_, k) => `<i${k < n ? ' class="on"' : ''}></i>`).join('')}<span>${n}/${sets}</span></div>` : '';
    let btns = '';
    if (hold) btns += `<button type="button" class="pg-hold" data-pgo="hold">▶ ${hold >= 120 ? 'Avvia ' + A.fmtSec(hold) : 'Tieni ' + A.fmtSec(hold)}</button>`;
    if (sets > 0) btns += n >= sets ? `<button type="button" class="pg-big" data-pgo="next">Serie finite ✓ · avanti</button>` : `<button type="button" class="pg-big" data-pgo="set">Serie fatta (${n + 1}/${sets})</button>`;
    else btns += `<button type="button" class="pg-big" data-pgo="fatto">${isDone ? 'Fatto ✓ · avanti' : 'Fatto · avanti'}</button>`;
    const undo = sets > 0 && n > 0 ? `<button type="button" class="pg-undo" data-pgo="undo">↺ Togli una serie</button>` : '';
    const nx = OV.items[OV.i + 1];
    const restTxt = it.r ? (it.r === '—' ? 'Nessun recupero' : `Recupero <strong>${esc(it.r)}</strong>`) : '';
    return `${blk ? `<p class="pg-blk">${esc(blk)}</p>` : ''}
      <h2 class="pg-name">${esc(e.name)}</h2>
      <p class="pg-dose"><b>${esc(it.s || '')}</b>${it.per ? `<span>${esc(it.per)}</span>` : ''}${restTxt ? `<span>${restTxt}</span>` : ''}</p>
      ${it.note ? `<p class="pg-note">${esc(it.note)}</p>` : ''}
      ${isDone ? '<p class="pg-done-tag">Fatto ✓</p>' : ''}
      ${dots}
      ${rowHTML(it.ex, it, uid, true)}
      ${btns}
      <div class="pg-sub">${undo}<p class="pg-next">${nx ? `Dopo: <b>${esc(EX[nx.ex].name)}</b>` : 'Ultimo esercizio'}</p></div>`;
  }
  function finishHTML() {
    const t = todayK(), seen = new Set(), recs = [];
    let nSets = 0, vol = 0;
    OV.items.forEach(it => {
      const s = A.parseSets(it.s);
      if (s > 0) nSets += Math.min(setsOf(it.uid), s);
      if (seen.has(it.ex)) return; seen.add(it.ex);
      const h = loadsOf(it.ex), te = h.find(x => x.d === t);
      if (te) te.sets.forEach(x => { if (x.kg > 0 && x.reps > 0) vol += x.kg * x.reps; });
      if (isRecordToday(h, t)) recs.push(EX[it.ex].name);
    });
    const doneN = OV.items.filter(it => A.done[it.uid]).length, N = OV.items.length;
    const min = Math.round((Date.now() - OV.t0) / 60000);
    return `<p class="pg-blk">${esc(OV.d.d)} · ${esc(OV.d.title || '')}</p>
      <h2 class="pg-name">Allenamento finito</h2>
      <div class="pg-stats"><div><b>${nSets}</b><span>serie</span></div><div><b>${A.n0(vol)}</b><span>kg di volume</span></div><div><b>${recs.length}</b><span>record battuti</span></div></div>
      ${recs.length ? `<p class="pg-p">Nuovi record: <b>${recs.map(esc).join(', ')}</b> ✓</p>` : ''}
      <p class="pg-p">${doneN} esercizi su ${N} segnati come fatti${min >= 2 ? ` · ${min} minuti in questa schermata` : ''}. Il volume somma chili × ripetizioni delle serie registrate oggi.</p>
      <button type="button" class="pg-big" data-pgo="diary">Scrivi com'è andata</button>
      <div class="pg-sub"><button type="button" class="pg-ghost" data-pgo="prev">← Torna agli esercizi</button><button type="button" class="pg-ghost" data-pgo="close">Chiudi</button></div>`;
  }

  function doSet() {
    const it = curIt(); if (!it) return;
    const uid = it.uid, sets = A.parseSets(it.s), n0 = setsOf(uid);
    if (sets <= 0 || n0 >= sets) return;
    const btn = sets > 1 ? cardBtn(uid, 'set') : null;
    if (btn) {
      // Passa dal pulsante della scheda: così l'app aggiorna contatore, "Fatto" e recupero,
      // e l'evento fit:set registra il carico leggendo i campi dell'allenamento.
      btn.click();
    } else {
      A.buzz();
      const n = n0 + 1, box = ovEl && ovEl.querySelector('.pg-ld');
      if (box) { const v = readBox(box); recordSet(it.ex, uid, n, v.kg, v.reps); }
      const S = liveSets(); S[uid] = n; store.set('sets', S);
      document.dispatchEvent(new CustomEvent('fit:set', { detail: { key: uid, id: it.ex, n, sets, src: 'progress' } }));
      const rest = A.parseRest(it.r);
      if (rest && window.FitTimer) window.FitTimer.countdown(rest, `${EX[it.ex].name} · ${n}/${sets} ${n === sets ? '· poi passa al prossimo esercizio' : 'serie fatte'}`, 'rest');
    }
    if (setsOf(uid) >= sets) {
      markDone(uid);
      renderOv();
      clearTimeout(advT);
      advT = setTimeout(() => { if (OV && curIt() === it) { OV.i++; renderOv(true); } }, 900);
    } else renderOv();
  }
  function doUndo() {
    const it = curIt(); if (!it) return;
    const uid = it.uid, sets = A.parseSets(it.s), n0 = setsOf(uid);
    if (n0 <= 0) return;
    clearTimeout(advT);
    const btn = sets > 1 ? cardBtn(uid, 'undo') : null;
    if (btn) btn.click(); // il gancio click qui sotto accorcia anche i carichi di oggi
    else {
      A.buzz();
      const S = liveSets(); S[uid] = Math.max(0, n0 - 1); store.set('sets', S);
      truncateToday(it.ex, n0 - 1);
    }
    renderOv();
  }
  function onOv(act) {
    const it = curIt();
    if (act === 'close') return closeOv();
    if (act === 'diary') return closeOv({ diary: true });
    if (act === 'prev') return go(-1);
    if (act === 'next') return go(1);
    if (act === 'set') return doSet();
    if (act === 'undo') return doUndo();
    if (act === 'hold' && it) { A.buzz(); if (window.FitTimer) window.FitTimer.countdown(+it.hold, EX[it.ex].name, 'hold'); return; }
    if (act === 'fatto' && it) { A.buzz(); markDone(it.uid); OV.i++; renderOv(true); }
  }

  A.hooks.click.push(e => {
    const t = e.target; if (!t || !t.closest) return false;
    const st = t.closest('[data-pg-start]');
    if (st) { openOv(st.dataset.pgStart); return true; }
    const ob = t.closest('[data-pgo]');
    if (ob && OV && ovEl && ovEl.contains(ob)) { onOv(ob.dataset.pgo); return true; }
    if (ovEl && ovEl.contains(t)) return true; // clic dentro l'allenamento: non riguarda la pagina
    // "↺" nella scheda: togli anche l'ultima serie registrata oggi
    const un = t.closest('.setbar [data-act="undo"]');
    if (un) {
      const sb = un.closest('.setbar'), key = sb && sb.dataset.key;
      const item = key && A.findItem(key);
      if (item && item.ex) { truncateToday(item.ex, Math.max(0, setsOf(key) - 1)); setTimeout(() => refreshRows(key), 0); }
    }
    return false;
  });
  document.addEventListener('keydown', e => {
    const t = e.target;
    if (t && t.dataset && t.dataset.pg && e.key === 'Enter') { e.preventDefault(); t.blur(); return; }
    if (!OV) return;
    if (t && t.matches && t.matches('input, textarea, select')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'Escape') { e.preventDefault(); closeOv(); }
  });
  window.addEventListener('hashchange', () => { if (OV) closeOv({ noRoute: true }); });

  // Piccola interfaccia per altri moduli (sola lettura)
  window.FitProgress = { repRange, incFor, e1rm, bestOf, describe, suggest, isRecordToday, loadsOf, parseLoad, parseReps };
});
