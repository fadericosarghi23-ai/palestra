/* starfit+ — Costanza: un pallino per ogni giorno dell'anno (allenamento o riposo), anno per anno,
   con il totale degli allenamenti e le settimane di fila con l'obiettivo raggiunto.
   Un giorno conta come allenamento se: hai segnato esercizi (anche dall'Apple Watch), carichi,
   il diario, oppure il Watch segna almeno 30 minuti di esercizio. */
(window.FitPlugins = window.FitPlugins || []).push(function (A) {
  const css = `
.sk-card { color: var(--on-iron); }
.sk-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.sk-head h3 { margin: 0; }
.sk-fire { display: inline-flex; align-items: baseline; gap: 6px; font: 700 24px/1 var(--display); font-variant-numeric: tabular-nums; color: var(--on-iron); white-space: nowrap; }
.sk-fire svg { width: 18px; height: 18px; color: var(--fire-bright); align-self: center; }
.sk-fire small { font: 500 12px/1 var(--body); color: var(--on-iron-muted); }
.sk-sub { margin: 4px 0 0; font-size: 13px; color: var(--on-iron-muted); }
.sk-leg { display: flex; gap: 14px; font-size: 12px; color: var(--on-iron-muted); margin: 10px 0 4px; }
.sk-leg i { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; vertical-align: -1px; }
.sk-year { margin-top: 14px; }
.sk-year h4 { margin: 0 0 6px; font: 700 18px/1 var(--display); letter-spacing: -0.01em; color: var(--on-iron); }
.sk-year h4 span { font: 500 12px/1 var(--body); color: var(--on-iron-muted); margin-left: 8px; }
.sk-grid { display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, 1fr); gap: 2px; width: 100%; }
.sk-grid i { display: block; aspect-ratio: 1; border-radius: 50%; background: var(--iron-3); }
.sk-grid i.on { background: var(--fire-bright); }
.sk-grid i.fu { background: transparent; box-shadow: inset 0 0 0 1px var(--iron-3); }
.sk-grid i.no { background: transparent; }
.sk-grid i.td { box-shadow: 0 0 0 1.5px var(--on-iron); }
.sk-months { display: grid; grid-auto-flow: column; gap: 2px; font-size: 10px; color: var(--on-iron-muted); margin-bottom: 4px; }
.sk-months span { overflow: visible; white-space: nowrap; }
.sk-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
.sk-stats div { background: var(--iron-2); border-radius: 10px; padding: 10px; }
.sk-stats b { display: block; font: 650 22px/1 var(--display); font-variant-numeric: tabular-nums; }
.sk-stats span { font-size: 11px; color: var(--on-iron-muted); }
.sk-more { display: inline-block; margin-top: 12px; color: var(--fire-bright); font-weight: 600; text-decoration: none; font-size: 14px; }`;
  const st = document.createElement('style'); st.id = 'sf-streak'; st.textContent = css; document.head.appendChild(st);

  const MON = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  const FIRE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c1 3.5-1.5 5-1.5 7.5 0 1.4 1 2.5 2.3 2.5 1.6 0 2.4-1.4 2.2-3.2 2.3 1.7 3.5 4.3 3.5 6.6C18.5 19.3 15.6 22 12 22s-6.5-2.7-6.5-6.6c0-4.7 4-7.6 6.5-13.4z"/></svg>';
  const obj = (k, d) => { const v = A.store.get(k, d); return v && typeof v === 'object' ? v : d; };
  const goal = () => (A.days().filter(d => d.type === 'gym').length || 3); // allenamenti a settimana della scheda

  // Giorni di allenamento, da tutte le fonti
  function trainedDays() {
    const s = new Set(), ok = k => /^\d{4}-\d{2}-\d{2}$/.test(k);
    Object.keys(obj('trained', {})).forEach(k => ok(k) && s.add(k));
    Object.keys(obj('trainedWx', {})).forEach(k => ok(k) && s.add(k));
    Object.keys(obj('logs', {})).forEach(k => ok(k) && s.add(k));
    Object.values(obj('loads', {})).forEach(a => Array.isArray(a) && a.forEach(x => x && ok(x.d) && s.add(x.d)));
    const wa = obj('watchAct', {}); Object.keys(wa).forEach(k => { if (ok(k) && wa[k] && +wa[k].min >= 30) s.add(k); });
    return s;
  }
  const dk = d => A.dkey(d);
  const monday = d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getDay() + 6) % 7);
  const addD = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

  function stats(T) {
    const today = A.today0(), g = goal();
    // settimane di fila con l'obiettivo (la settimana in corso conta solo se già raggiunto)
    let weeks = 0, w = monday(today);
    const inWeek = m => { let n = 0; for (let i = 0; i < 7; i++) if (T.has(dk(addD(m, i)))) n++; return n; };
    if (inWeek(w) >= g) weeks++;
    for (w = addD(w, -7); weeks < 520; w = addD(w, -7)) { if (inWeek(w) >= g) weeks++; else break; }
    // giorni di fila senza saltare più di 2 giorni di riposo
    const year = today.getFullYear(), thisYear = [...T].filter(k => k.startsWith(year + '-')).length;
    const last30 = Array.from({ length: 30 }, (x, i) => dk(addD(today, -i))).filter(k => T.has(k)).length;
    return { total: T.size, weeks, thisYear, last30, g };
  }

  function yearGrid(year, T, compact) {
    const today = A.today0(), tk = dk(today), first = new Date(year, 0, 1), last = new Date(year, 11, 31);
    const start = monday(first), cols = Math.ceil((((last - start) / 864e5) + 1) / 7);
    let cells = '', monthHead = '', n = 0;
    const colOfMonth = MON.map((m, i) => Math.floor((new Date(year, i, 1) - start) / 864e5 / 7));
    for (let c = 0; c < cols; c++) monthHead += `<span>${colOfMonth.includes(c) ? MON[colOfMonth.indexOf(c)] : ''}</span>`;
    for (let c = 0; c < cols; c++) for (let r = 0; r < 7; r++) {
      const d = addD(start, c * 7 + r), k = dk(d);
      if (d < first || d > last) { cells += '<i class="no"></i>'; continue; }
      const on = T.has(k); if (on) n++;
      cells += `<i class="${on ? 'on' : d > today ? 'fu' : ''}${k === tk ? ' td' : ''}" title="${A.fmt(d, { day: 'numeric', month: 'short' })}${on ? ' · allenamento' : ''}"></i>`;
    }
    return `<div class="sk-year">${compact ? '' : `<h4>${year}<span>${n} allenamenti</span></h4>`}
      <div class="sk-months" style="grid-template-columns: repeat(${cols}, minmax(0, 1fr))" aria-hidden="true">${monthHead}</div>
      <div class="sk-grid" style="grid-template-columns: repeat(${cols}, minmax(0, 1fr))" role="img" aria-label="${year}: ${n} giorni di allenamento">${cells}</div></div>`;
  }
  const legend = '<div class="sk-leg"><span><i style="background:var(--iron-3)"></i>Riposo</span><span><i style="background:var(--fire-bright)"></i>Allenamento</span></div>';

  // Riquadro nella home (anno in corso)
  function homeCard() {
    const T = trainedDays(), s = stats(T), y = A.today0().getFullYear();
    return `<section class="sec panel dark sk-card" id="sk-home"><div class="sk-head"><div><h3>Costanza</h3>
        <p class="sk-sub">${s.weeks ? s.weeks + (s.weeks === 1 ? ' settimana' : ' settimane') + ' di fila con ' + s.g + ' allenamenti' : 'Obiettivo: ' + s.g + ' allenamenti a settimana'}</p></div>
        <span class="sk-fire" title="Allenamenti in totale">${FIRE}${A.n0(s.total)}<small>totali</small></span></div>
      ${legend}${yearGrid(y, T, true)}
      <a class="sk-more" href="#costanza">Tutti gli anni →</a></section>`;
  }
  homeCard.slot = 'more'; homeCard.rank = -1;
  A.hooks.home.push(homeCard);

  // Pagina completa: un anno sotto l'altro, dal primo allenamento
  A.hooks.views.costanza = function () {
    const T = trainedDays(), s = stats(T), y = A.today0().getFullYear();
    const firstY = T.size ? Math.min(...[...T].map(k => +k.slice(0, 4))) : y;
    const years = []; for (let k = y; k >= Math.max(firstY, y - 9); k--) years.push(k);
    return `<div class="dayhead"><div><div class="meta"><span class="chip act">Progressi</span></div>
        <p class="big">Costanza</p><p class="sub">Un pallino per ogni giorno</p>
        <p class="goal">Rosso = ti sei allenato. Contano gli esercizi segnati (anche dall'Apple Watch), i carichi, il diario e i giorni in cui il Watch segna almeno 30 minuti di esercizio.</p></div></div>
      <section class="panel dark sk-card"><div class="sk-head"><h3>I tuoi numeri</h3><span class="sk-fire">${FIRE}${A.n0(s.total)}<small>totali</small></span></div>
        <div class="sk-stats"><div><b>${s.weeks}</b><span>settimane di fila con ${s.g}+</span></div><div><b>${s.thisYear}</b><span>allenamenti nel ${y}</span></div><div><b>${s.last30}</b><span>negli ultimi 30 giorni</span></div></div>
        ${legend}${years.map(k => yearGrid(k, T, false)).join('')}</section>`;
  };
  // Link anche nel Piano
  A.hooks.plan.push(() => '<a class="mob-link" href="#costanza"><div><b>Costanza</b><br><span>Il calendario dei tuoi allenamenti, anno per anno</span></div><em>Apri →</em></a>');
});
