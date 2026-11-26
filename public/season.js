/* starfit+ — season: blocco successivo costruito sui test (piano e home) e sfida della settimana tra gli iscritti (home) */
(window.FitPlugins = window.FitPlugins || []).push(function (A) {
  const { store, EX, esc, fmt, fold, BLOCK, DAY } = A;
  const MAXB = 9; // app.js accetta al massimo il blocco 9
  const NEXT = BLOCK + 1;
  const S = { prep: null, busy: false, scrollPrep: false, sf: null, sfLoading: false, sfBusy: false, sfArm: false, sfMsg: '' };

  /* ---------- stile ---------- */
  if (!document.getElementById('sf-season')) {
    const st = document.createElement('style');
    st.id = 'sf-season';
    st.textContent = `
.sea-next h4, .sea-prep h4, .sea-hist h4 { font-family: var(--display); font-weight: 800; font-style: italic; text-transform: uppercase; font-size: 19px; margin: 18px 0 6px; }
.sea-next p, .sea-home p { margin: 0 0 8px; }
.sea-next .sb-btn[disabled], .sea-home .sb-btn[disabled] { opacity: .45; cursor: default; }
.sea-prep { border-top: 1px solid var(--steel-line); margin-top: 16px; padding-top: 4px; }
.sea-prep .btn-ghost { min-height: 46px; padding-inline: 18px; }
.sea-tests { list-style: none; padding: 0; margin: 4px 0 0; }
.sea-tests li { padding: 9px 0; border-bottom: 1px solid var(--steel-line); font-size: 15px; line-height: 1.35; }
.sea-tests li:last-child { border-bottom: 0; }
.sea-tests small { display: block; color: var(--ink-muted); font-size: 13px; }
.sea-tag { display: inline-block; font-weight: 700; font-size: 12px; padding: 1px 8px; border-radius: 999px; margin-left: 6px; white-space: nowrap; vertical-align: 1px; }
.sea-tag.up { background: var(--fire); color: #fff; }
.sea-tag.down { background: var(--iron); color: var(--on-iron); }
.sea-tag.eq { border: 1px solid var(--steel-line); color: var(--ink-muted); }
.sea-sw { display: flex; gap: 12px; align-items: flex-start; min-height: 44px; padding: 10px 0; border-bottom: 1px solid var(--steel-line); cursor: pointer; font-size: 15px; line-height: 1.35; }
.sea-sw input { width: 22px; height: 22px; flex: none; margin: 0; accent-color: var(--fire); }
.sea-sw.off span { color: var(--ink-muted); text-decoration: line-through; }
.sea-hot { border: 2px solid var(--fire); }
.sea-hist ul { list-style: none; padding: 0; margin: 0 0 12px; }
.sea-hist li { font-size: 14px; padding: 6px 0; border-bottom: 1px solid var(--steel-line); }
.sea-hist li:last-child { border-bottom: 0; }
.sea-rank { list-style: none; padding: 0; margin: 10px 0 0; }
.sea-row { display: grid; grid-template-columns: minmax(0, 6.5em) 1fr 2.8em; gap: 10px; align-items: center; padding: 8px 0; }
.sea-n { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.sea-n small { font-weight: 600; color: var(--ink-muted); font-size: 12px; margin-left: 4px; }
.sea-bar { height: 10px; background: var(--steel-line); border-radius: 999px; overflow: hidden; }
.sea-bar i { display: block; height: 100%; background: var(--iron-3); border-radius: inherit; min-width: 4px; }
.sea-row.me .sea-n { font-weight: 800; }
.sea-row.me .sea-bar i { background: var(--fire); }
.sea-p { font-family: var(--display); font-weight: 800; font-size: 24px; text-align: right; font-variant-numeric: tabular-nums; }
.sea-mini { background: none; border: 0; color: var(--ink-muted); text-decoration: underline; font-size: 13px; min-height: 40px; padding: 0; cursor: pointer; }
.sea-mini.arm { color: var(--fire); font-weight: 700; }
`;
    document.head.appendChild(st);
  }

  /* ---------- date del blocco (a mezzanotte, anche con il cambio dell'ora) ---------- */
  const day0 = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addD = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const END0 = day0(A.END);
  const OPEN = addD(END0, -7);   // il pulsante si attiva una settimana prima della fine
  const HOME = addD(END0, -13);  // in home nelle ultime 2 settimane
  const endLong = fmt(END0, { day: 'numeric', month: 'long' });
  const isActive = () => A.today0() >= OPEN;
  const isOver = () => A.today0() > END0;

  /* ---------- test: confronto prima / ultima riga compilata ---------- */
  const ROWS = [0, 1, 2, 3];
  const rowName = r => r === 0 ? 'inizio' : 'sett. ' + (A.TEST_WEEKS[r] || r * 4);
  function parseVal(v) {
    if (v == null) return null;
    const s = String(v).trim().replace(/\s/g, '').replace(',', '.');
    if (!s) return null;
    const n = parseFloat(s);
    return isFinite(n) ? n : null;
  }
  const round2 = n => Math.round(n * 100) / 100;
  const num = n => n.toLocaleString('it-IT', { maximumFractionDigits: 2 });
  function colInfo(col) {
    const m = /\(([^)]*)\)/.exec(col);
    let unit = m ? m[1].replace(/\s*×.*$/, '').trim() : '';
    if (/^second/i.test(unit)) unit = 's';
    return { label: col.replace(/\s*\([^)]*\)\s*/g, ' ').trim(), unit };
  }
  // 'low' = meno è meglio, 'high' = più è meglio, 'stable' = va bene se resta uguale
  function direction(col, progId) {
    const c = fold(col);
    if (/sprint/.test(c) || /\((s|sec)\)/.test(c)) return 'low';
    if (/peso/.test(c)) return progId === 'glutei' ? 'stable' : 'low';
    if (/vita/.test(c)) return 'low';
    if (/fianchi/.test(c)) return 'high';
    return 'high';
  }
  function compareTests(tests, cols, progId) {
    tests = tests && typeof tests === 'object' ? tests : {};
    return (cols || []).map((c, ci) => {
      const vals = ROWS.map(r => ({ r, v: parseVal(tests[r + '-' + ci]) })).filter(x => x.v != null);
      const info = colInfo(c);
      if (vals.length < 2) return Object.assign({ c, n: vals.length, a: vals[0] || null }, info);
      const a = vals[0], b = vals[vals.length - 1], diff = round2(b.v - a.v), dir = direction(c, progId);
      let verdict, hint = '';
      if (dir === 'stable') {
        if (diff >= -1 && diff <= 1.5) verdict = 'stable';
        else { verdict = 'worse'; hint = diff < 0 ? 'Mangia un po\' di più: per costruire serve energia.' : 'Controlla un po\' le porzioni.'; }
      } else if (diff === 0) verdict = 'same';
      else verdict = (dir === 'low' ? diff < 0 : diff > 0) ? 'better' : 'worse';
      return Object.assign({ c, n: vals.length, a, b, diff, dir, verdict, hint }, info);
    });
  }
  const TAG = { better: ['up', 'meglio ✓'], stable: ['up', 'stabile ✓'], worse: ['down', 'peggio'], same: ['eq', 'uguale'] };
  function testLine(t, short) {
    const u = t.unit ? ' ' + esc(t.unit) : '';
    if (!t.n) return short ? '' : `<li><b>${esc(t.label)}</b><small>Non registrato.</small></li>`;
    if (t.n === 1) return short ? '' : `<li><b>${esc(t.label)}</b> ${num(t.a.v)}${u} <small>Solo un valore (${rowName(t.a.r)}): niente confronto.</small></li>`;
    const tg = TAG[t.verdict] || TAG.same;
    const d = (t.diff > 0 ? '+' : t.diff < 0 ? '−' : '') + num(Math.abs(t.diff)) + u;
    if (short) return `${esc(t.label)} ${num(t.a.v)} → ${num(t.b.v)}${u}${t.verdict === 'better' || t.verdict === 'stable' ? ' ✓' : ''}`;
    return `<li><b>${esc(t.label)}</b> ${num(t.a.v)} → ${num(t.b.v)}${u} <span class="sea-tag ${tg[0]}">${tg[1]}</span>
      <small>${rowName(t.a.r)} → ${rowName(t.b.r)} · ${d}${t.hint ? ' · ' + esc(t.hint) : ''}</small></li>`;
  }

  /* ---------- proposta: circa un terzo degli esercizi principali (non i primi due) ---------- */
  // Restano fuori: attivazione del giorno prima, partita e riposo (regole fisse) e gli esercizi di prevenzione (nordic, Copenhagen…)
  const SKIP_TYPES = ['act', 'match', 'rest'];
  const mainsOf = items => items.map((it, i) => ({ it, i })).filter(x => x.it && x.it.b === 'main' && x.it.ex && !x.it.link && EX[x.it.ex]);
  function planSwaps(dayList, block) {
    const out = [], seen = new Set();
    (dayList || []).forEach(d => {
      if (!d || !d.pk || seen.has(d.pk) || SKIP_TYPES.includes(d.type)) return;
      seen.add(d.pk);
      const items = Array.isArray(d.items) ? d.items : [];
      const cand = mainsOf(items).slice(2).filter(x => EX[x.it.ex].cat !== 'Prevenzione'); // i primi due del blocco principale sono i fondamentali: restano
      const count = Math.round(cand.length / 3);
      if (!count) return;
      const used = new Set(items.map(x => x && x.ex).filter(Boolean));
      const picks = [];
      for (let k = 0; k < count; k++) { const p = (Math.floor(k * cand.length / count) + (block - 1)) % cand.length; if (!picks.includes(p)) picks.push(p); }
      picks.sort((a, b) => a - b).forEach(p => {
        const { it, i } = cand[p];
        let to = null;
        try { to = (A.alternatives(it.ex, 1, [...used]) || [])[0]; } catch (e) { to = null; }
        if (!to || !EX[to]) return;
        used.add(to);
        out.push({ pk: d.pk, day: d.d || d.id, i, uid: it.uid, from: it.ex, to, on: true });
      });
    });
    return out;
  }

  /* ---------- storico dei blocchi ---------- */
  function history() { const h = store.get('tests-history', []); return Array.isArray(h) ? h.filter(x => x && typeof x === 'object') : []; }
  function histHTML() {
    const h = history();
    if (!h.length) return '';
    const cols = (A.PROG.plan && A.PROG.plan.tests) || [];
    return `<details class="how sea-hist"><summary>Blocchi precedenti <span>${h.length}</span></summary><ul>
      ${h.slice().reverse().map(x => {
        let when = '';
        try { if (/^\d{4}-\d{2}-\d{2}$/.test(x.at || '')) when = ' · chiuso il ' + fmt(A.kdate(x.at), { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { when = ''; }
        const res = compareTests(x.tests, cols, A.PROG.id).map(t => testLine(t, true)).filter(Boolean);
        return `<li><b>Blocco ${esc(String(x.block || '?'))}</b>${when}<br><span class="small">${res.length ? res.join(' · ') : 'Nessun test da confrontare.'}</span></li>`;
      }).join('')}</ul></details>`;
  }

  /* ---------- piano: riquadro "Dopo il ..." ---------- */
  function prepHTML() {
    const cols = (A.PROG.plan && A.PROG.plan.tests) || [];
    const res = compareTests(store.get('tests', {}), cols, A.PROG.id);
    const cmp = res.filter(t => t.n >= 2), good = cmp.filter(t => t.verdict === 'better' || t.verdict === 'stable').length, bad = cmp.filter(t => t.verdict === 'worse').length;
    const sum = !cmp.length ? 'Non ci sono ancora due test da confrontare: puoi preparare il blocco lo stesso.'
      : good >= bad ? `${good} test su ${cmp.length} vanno bene. Nel blocco ${NEXT} riparti dai carichi di fine blocco, non da quelli iniziali.`
      : `Qualche test è calato. Nella prima settimana del blocco ${NEXT} tieni i carichi di fine blocco e cura sonno e cibo.`;
    const sw = S.prep.swaps;
    return `<div class="sea-prep" id="sea-prep">
      <h4>I tuoi test</h4>
      <ul class="sea-tests">${res.map(t => testLine(t, false)).join('')}</ul>
      <p class="small">${esc(sum)}</p>
      <h4>Le modifiche al programma</h4>
      ${sw.length ? `<p class="small">Serie e recuperi restano uguali. Togli la spunta per tenere un esercizio com'è.</p>
        <div>${sw.map((s, k) => `<label class="sea-sw${s.on ? '' : ' off'}"><input type="checkbox" data-sea-sw="${k}"${s.on ? ' checked' : ''}${S.busy ? ' disabled' : ''}>
          <span><b>${esc(s.day)}</b>: ${esc(EX[s.from] ? EX[s.from].name : s.from)} → <b>${esc(EX[s.to] ? EX[s.to].name : s.to)}</b></span></label>`).join('')}</div>`
        : '<p class="small">Nessuna sostituzione da proporre: il programma resta com\'è.</p>'}
      <div class="f-act"><button type="button" class="sb-btn" data-sea="go"${S.busy ? ' disabled' : ''}>${S.busy ? 'Salvo…' : 'Conferma e inizia il blocco ' + NEXT}</button>
        <button type="button" class="btn-ghost" data-sea="cancel"${S.busy ? ' disabled' : ''}>Annulla</button></div>
      <p class="small">Il registro test e gli esercizi fatti ripartono da zero (i test di adesso restano nello storico). Poi la pagina si ricarica.</p>
    </div>`;
  }
  function planHTML() {
    const canNext = BLOCK < MAXB, act = isActive(), over = isOver();
    const status = over ? `Il blocco ${BLOCK} è finito il ${endLong}: prepara il blocco ${NEXT} quando vuoi.`
      : `Il blocco ${BLOCK} finisce ${fmt(END0, { weekday: 'long', day: 'numeric', month: 'long' })}.`;
    return `<section class="sec panel sea-next" id="sea-next"><h3>Dopo il ${esc(endLong)}</h3>
      <p>${status} Poi si riparte con un nuovo blocco di 12 settimane costruito sui tuoi test.</p>
      <ul class="list">
        <li>I primi due esercizi principali di ogni giorno restano: sono i fondamentali.</li>
        <li>Circa un terzo degli altri cambia, con le stesse serie e gli stessi recuperi: stimolo nuovo, stessi muscoli.</li>
        <li>Il registro test riparte vuoto; i risultati di questo blocco restano nello storico.</li>
      </ul>
      ${!canNext ? '<p class="small">Hai completato tutti i blocchi previsti.</p>'
        : S.prep ? prepHTML()
        : `<div class="f-act"><button type="button" class="sb-btn" data-sea="prep"${act ? '' : ' disabled'}>Prepara il blocco ${NEXT}</button></div>
          ${act ? '' : `<p class="small">Si attiva ${fmt(OPEN, { weekday: 'long', day: 'numeric', month: 'long' })}, una settimana prima della fine.</p>`}`}
      ${histHTML()}
    </section>`;
  }

  /* ---------- home: promemoria nelle ultime 2 settimane, in evidenza dopo la fine ---------- */
  function homeBlockHTML() {
    if (BLOCK >= MAXB) return '';
    const t = A.today0();
    if (t < HOME) return '';
    const over = isOver(), act = isActive(), left = Math.round((END0 - t) / DAY);
    const when = left <= 0 ? 'finisce oggi' : left === 1 ? 'finisce domani' : `finisce il ${endLong} (mancano ${left} giorni)`;
    return `<section class="sec panel sea-home${over ? ' dark sea-hot' : ''}">
      <h3>${over ? 'Blocco ' + BLOCK + ' finito' : 'Il blocco ' + BLOCK + ' ' + when}</h3>
      <p>${over ? `Hai chiuso le 12 settimane. Guarda i test e prepara il blocco ${NEXT}: i fondamentali restano, un terzo degli altri esercizi cambia.`
        : `Poi si riparte con il blocco ${NEXT}, costruito sui tuoi test. Fai i test dell'ultima settimana.`}</p>
      <div class="f-act"><button type="button" class="sb-btn" data-sea="prep-home"${act ? '' : ' disabled'}>Prepara il blocco ${NEXT}</button></div>
      ${act ? '' : `<p class="small">Si attiva ${fmt(OPEN, { weekday: 'long', day: 'numeric', month: 'long' })}.</p>`}
    </section>`;
  }

  /* Terzino: l'altra settimana (partita il sabato / la domenica) ha giorni salvati a parte.
     Gli stessi cambi scelti valgono anche lì, così cambiando giorno della partita il blocco resta coerente. */
  function otherLayouts(byPk, changed) {
    const L = A.PROG0 && A.PROG0.layouts;
    if (!L) return;
    const pairs = {};
    S.prep.swaps.filter(s => s.on && EX[s.to]).forEach(s => { if (!pairs[s.from]) pairs[s.from] = s.to; });
    if (!Object.keys(pairs).length) return;
    const plan = store.get('plan', {}) || {};
    Object.keys(L).forEach(k => {
      // la settimana "dom" non ha giorni suoi: usa quelli di base del programma
      ((L[k] && (L[k].days || A.PROG0.days)) || []).forEach(d => {
        const pk = d && (d.pk || d.id);
        if (!pk || byPk[pk] || changed[pk] || SKIP_TYPES.includes(d.type)) return;
        const items = Array.isArray(plan[pk]) ? JSON.parse(JSON.stringify(plan[pk]))
          : (d.items || []).map((it, i) => Object.assign({ uid: pk + ':' + i }, JSON.parse(JSON.stringify(it))));
        const inDay = new Set(items.map(x => x && x.ex).filter(Boolean));
        let ch = false;
        mainsOf(items).slice(2).forEach(({ it }) => {
          const to = pairs[it.ex];
          if (!to || inDay.has(to) || EX[it.ex].cat === 'Prevenzione') return;
          inDay.add(to); it.ex = to; delete it.hold; it.note = 'Nuovo nel blocco ' + NEXT; ch = true;
        });
        if (ch) changed[pk] = items;
      });
    });
  }

  async function confirmPrep() {
    if (S.busy || !S.prep || BLOCK >= MAXB) return;
    S.busy = true; A.route(true);
    try {
      const byPk = {};
      A.days().forEach(d => { if (d && d.pk && !byPk[d.pk]) byPk[d.pk] = d; });
      const changed = {};
      S.prep.swaps.filter(s => s.on).forEach(s => {
        const d = byPk[s.pk]; if (!d || !EX[s.to]) return;
        const items = changed[s.pk] || (changed[s.pk] = JSON.parse(JSON.stringify(d.items || [])));
        const it = items[s.i];
        if (!it || it.ex !== s.from || it.uid !== s.uid) return; // la scheda è cambiata nel frattempo
        it.ex = s.to; delete it.hold; it.note = 'Nuovo nel blocco ' + NEXT; // serie, recupero e parte restano
      });
      otherLayouts(byPk, changed);
      Object.keys(changed).forEach(pk => A.saveItems(pk, changed[pk]));
      const h = history();
      h.push({ block: BLOCK, tests: store.get('tests', {}), at: A.dkey(new Date()) });
      store.set('tests-history', h);
      store.set('block', NEXT);
      store.set('tests', {});
      store.set('done', {});
      store.set('sets', {});
      store.set('doneResetAt', Date.now()); // come "Azzera la settimana": non riprende i "fatto" vecchi dal Watch
    } catch (e) {
      console.error('starfit+ season', e);
      S.busy = false; A.route(true); return;
    }
    try { await Promise.race([Promise.resolve().then(() => window.FitAccount.saveNow()), new Promise(r => setTimeout(r, 4000))]); } catch (e) { /* offline: parte appena torna la rete */ }
    location.reload();
  }

  /* ---------- sfida della settimana ---------- */
  const onHome = () => { const h = (location.hash || '').replace('#', ''); return !h || h === 'settimana'; };
  const cap = s => { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };
  // Dopo una risposta del server ridisegna solo il riquadro della sfida:
  // ridisegnare tutta la home chiuderebbe la tastiera e cancellerebbe quello che stai scrivendo (es. il peso)
  function sfRefresh() {
    if (!onHome()) return;
    const box = document.querySelector('#main .sea-sf');
    if (box) box.outerHTML = sfHTML(); else A.route(true);
  }
  function sfLoad() {
    if (S.sfLoading) return;
    const old = S.sf && (S.sf.data || S.sf.old) || null;
    if (navigator.onLine === false) { S.sf = { at: Date.now(), err: 'offline', old }; return; }
    S.sfLoading = true;
    Promise.resolve().then(() => A.api('GET', '/sfida'))
      .then(d => { S.sf = { at: Date.now(), data: d && typeof d === 'object' ? d : { on: false, rows: [] } }; })
      .catch(e => { S.sf = { at: Date.now(), err: e && e.status ? 'server' : 'offline', old }; })
      .then(() => { S.sfLoading = false; sfRefresh(); });
  }
  window.addEventListener('online', () => { if (S.sf && S.sf.err) { S.sf.at = 0; sfRefresh(); } });
  function sfHTML() {
    if (!S.sf || Date.now() - S.sf.at > 60000) sfLoad();
    const st = S.sf, data = st && (st.data || st.old);
    const errMsg = st && st.err ? (st.err === 'offline' ? 'Sei offline: la classifica si aggiorna quando torna la rete.' : 'Classifica non disponibile in questo momento.') : '';
    let body;
    if (!data) body = `<p class="small">${errMsg || 'Carico la classifica…'}</p>`;
    else if (!data.on) {
      body = `<p>Sfida della costanza con gli altri di starfit+: 3 punti per ogni giorno di allenamento, 1 per il peso, 1 per i pasti segnati, 1 per l'acqua. Si vedono solo i punti, mai i tuoi dati.</p>
        <div class="f-act"><button type="button" class="sb-btn" data-sfida="on"${S.sfBusy ? ' disabled' : ''}>${S.sfBusy ? 'Un attimo…' : 'Partecipa'}</button></div>
        ${errMsg ? `<p class="small">${errMsg}</p>` : ''}`;
    } else {
      const rows = Array.isArray(data.rows) ? data.rows.filter(r => r && typeof r === 'object') : [];
      const max = Math.max(1, ...rows.map(r => +r.pts || 0));
      const me = rows.find(r => r.me);
      let since = 'da lunedì';
      try { if (/^\d{4}-\d{2}-\d{2}$/.test(data.week || '')) since = 'da lunedì ' + fmt(A.kdate(data.week), { day: 'numeric', month: 'long' }); } catch (e) { /* niente */ }
      body = `<p class="small">Punti ${since} · si riparte ogni lunedì.</p>
        <ol class="sea-rank">${rows.map(r => { const p = Math.max(0, +r.pts || 0); return `<li class="sea-row${r.me ? ' me' : ''}"><span class="sea-n">${esc(cap(r.name))}${r.me ? '<small>tu</small>' : ''}</span>
          <span class="sea-bar" aria-hidden="true"><i style="width:${Math.round(p / max * 100)}%"></i></span><b class="sea-p" aria-label="${p} punti">${p}</b></li>`; }).join('')}</ol>
        ${rows.length < 2 ? '<p>Aspettiamo l\'altro partecipante.</p>' : ''}
        ${me ? `<p class="small">I tuoi punti: ${+me.giorni || 0} allenamenti × 3, peso ${+me.peso || 0}, cibo ${+me.cibo || 0}, acqua ${+me.acqua || 0}. Il cibo conta nei giorni con almeno 3 alimenti segnati, l'acqua nei giorni in cui raggiungi l'obiettivo.</p>` : ''}
        ${errMsg ? `<p class="small">${errMsg}</p>` : ''}
        <button type="button" class="sea-mini${S.sfArm ? ' arm' : ''}" data-sfida="${S.sfArm ? 'off' : 'arm'}"${S.sfBusy ? ' disabled' : ''}>${S.sfArm ? 'Conferma: esci dalla sfida' : 'Esci dalla sfida'}</button>`;
    }
    return `<section class="sec panel sea-sf"><h3>Sfida della settimana</h3>${body}${S.sfMsg ? `<p class="small">${esc(S.sfMsg)}</p>` : ''}</section>`;
  }
  let armTimer = 0;
  function sfSet(on) {
    if (S.sfBusy) return;
    S.sfBusy = true; S.sfArm = false; S.sfMsg = ''; A.route(true);
    Promise.resolve().then(() => A.api('POST', '/sfida', { on }))
      .then(() => { S.sf = null; })
      .catch(e => { S.sfMsg = e && e.status ? 'Non è andata: riprova tra poco.' : 'Non riesco a collegarmi: riprova quando hai la rete.'; })
      .then(() => { S.sfBusy = false; sfRefresh(); });
  }

  /* ---------- ganci ---------- */
  A.hooks.plan.push(planHTML);
  homeBlockHTML.slot = 'mid'; sfHTML.slot = 'more'; sfHTML.rank = 1;
  A.hooks.home.push(homeBlockHTML);
  A.hooks.home.push(sfHTML);

  A.hooks.click.push(e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-sea], [data-sfida]') : null;
    if (!b) return false;
    if (b.disabled) return true;
    const act = b.dataset.sea, sf = b.dataset.sfida;
    if (act === 'prep' || act === 'prep-home') {
      if (!isActive() || BLOCK >= MAXB) return true;
      if (!S.prep) S.prep = { swaps: planSwaps(A.days(), BLOCK) };
      A.buzz(); S.scrollPrep = true;
      if (act === 'prep-home' && location.hash !== '#piano') location.hash = '#piano';
      else A.route(true);
      return true;
    }
    if (act === 'cancel') { if (!S.busy) { S.prep = null; A.route(true); } return true; }
    if (act === 'go') { A.buzz(); confirmPrep(); return true; }
    if (sf === 'on') { A.buzz(); sfSet(true); return true; }
    if (sf === 'arm') {
      S.sfArm = true; A.route(true);
      clearTimeout(armTimer); armTimer = setTimeout(() => { if (S.sfArm) { S.sfArm = false; sfRefresh(); } }, 3500);
      return true;
    }
    if (sf === 'off') { clearTimeout(armTimer); A.buzz(); sfSet(false); return true; }
    return true;
  });

  A.hooks.change.push(e => {
    const t = e.target;
    if (!t || !t.dataset || t.dataset.seaSw == null) return false;
    const s = S.prep && S.prep.swaps[+t.dataset.seaSw];
    if (s) { s.on = !!t.checked; const l = t.closest('.sea-sw'); if (l) l.classList.toggle('off', !s.on); }
    return true;
  });

  A.hooks.after.push(id => {
    if (id !== 'piano' || !S.scrollPrep) return;
    S.scrollPrep = false;
    const el = document.getElementById('sea-prep');
    if (el) el.scrollIntoView({ block: 'start', behavior: A.reduced ? 'auto' : 'smooth' });
  });
});
