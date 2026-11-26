/* starfit+ — interfaccia (parte dopo l'accesso all'account) */
window.FitAccount.whenReady(function () {
  const { ANIM, evaluate, prepare, mid } = window.FitAnim;
  const { EX, PROGRAMS } = window.FitData;
  /* Libreria grande (library.js): si aggiunge agli esercizi di base senza sovrascriverli */
  if (window.FitLib) Object.keys(window.FitLib).forEach(id => { if (!EX[id]) EX[id] = window.FitLib[id]; });
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- dati salvati nell'account (vedi account.js) ---------- */
  const store = window.FitAccount.store;

  /* Moduli aggiuntivi (progress.js, body.js, daily.js, foodplus.js, season.js): si registrano in window.FitPlugins
     e ricevono FitApp. Ogni gancio restituisce HTML (o true se ha gestito un evento). */
  const HK = { home: [], watch: [], dayTop: [], card: [], item: [], food: [], meal: [], plan: [], views: {}, click: [], change: [], input: [], after: [], macros: [] };
  const runH = (name, ...a) => HK[name].map(f => { try { return f(...a) || ''; } catch (e) { console.error('starfit+ modulo', name, e); return ''; } }).join('');
  const someH = (name, e) => HK[name].some(f => { try { return f(e) === true; } catch (x) { console.error('starfit+ modulo', name, x); return false; } });

  /* Programma dell'account: lo sceglie chi crea l'account (admin.mjs crea <nome> --programma <id>) */
  const PROG0 = PROGRAMS[store.get('program', 'terzino')] || PROGRAMS.terzino;
  /* Giorno della partita (solo per i programmi che lo prevedono): cambia tutta la settimana */
  const MATCHDAY = PROG0.layouts ? (PROG0.layouts[store.get('matchday', 'dom')] ? store.get('matchday', 'dom') : 'dom') : null;
  const PROG = Object.assign({}, PROG0, MATCHDAY ? PROG0.layouts[MATCHDAY] : {});
  const MOB = PROG.mob, DAYS_SRC = PROG.days;
  const foot = document.querySelector('footer .wrap'); if (foot) foot.textContent = PROG.footer;

  /* Scheda: quella di base, con le modifiche fatte dall'utente per ogni giorno.
     Ogni esercizio ha un uid stabile: serve per ricordare serie e "Fatto". */
  const BASE_DAYS = DAYS_SRC.map(d => { const pk = d.pk || d.id; return Object.assign({}, d, { pk, items: (d.items || []).map((it, i) => Object.assign({ uid: pk + ':' + i }, it)) }); });
  function days() {
    const plan = store.get('plan', {});
    return BASE_DAYS.map(d => plan[d.pk] ? Object.assign({}, d, { items: plan[d.pk], custom: true }) : d);
  }
  const dayById = id => days().find(d => d.id === id);
  function findItem(uid) { for (const d of days()) for (const it of d.items) if (it.uid === uid) return it; return null; }
  let done = store.get('done', {});
  let speed = store.get('speed', 1);

  /* ---------- disegno SVG ---------- */
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  const P = p => p[0].toFixed(1) + ',' + p[1].toFixed(1);
  const resolve = (s, J) => {
    if (typeof s === 'string') return s === 'hands' ? mid(J.haN, J.haF) : J[s];
    if (typeof s[0] === 'string') { const a = J[s[0]], b = J[s[1]]; return [a[0] + (b[0] - a[0]) * s[2], a[1] + (b[1] - a[1]) * s[2]]; }
    return s;
  };

  function drawStatic(g, p) {
    const solid = { fill: 'var(--prop)' }, soft = { fill: 'var(--prop-soft)', stroke: 'var(--prop)', 'stroke-width': 1.2 };
    switch (p.k) {
      case 'bench':
        el('line', { x1: p.x + 8, y1: p.y + 6, x2: p.x + 8, y2: 200, stroke: 'var(--prop)', 'stroke-width': 3 }, g);
        el('line', { x1: p.x + p.w - 8, y1: p.y + 6, x2: p.x + p.w - 8, y2: 200, stroke: 'var(--prop)', 'stroke-width': 3 }, g);
        el('rect', Object.assign({ x: p.x, y: p.y, width: p.w, height: 7, rx: 2 }, solid), g); break;
      case 'box': case 'step':
        el('rect', Object.assign({ x: p.x, y: p.y, width: p.w, height: 200 - p.y, rx: 2 }, soft), g); break;
      case 'wall':
        if (p.x > 120) el('rect', Object.assign({ x: p.x, y: 0, width: 240 - p.x, height: 200 }, soft), g);
        else el('rect', Object.assign({ x: 0, y: 0, width: p.x + 6, height: 200 }, soft), g);
        break;
      case 'post':
        el('rect', Object.assign({ x: p.x, y: 24, width: 6, height: 176, rx: 2 }, solid), g); break;
      case 'bar':
        el('line', { x1: p.x1, y1: p.y, x2: p.x1, y2: 0, stroke: 'var(--prop)', 'stroke-width': 3 }, g);
        el('line', { x1: p.x2, y1: p.y, x2: p.x2, y2: 0, stroke: 'var(--prop)', 'stroke-width': 3 }, g);
        el('line', { x1: p.x1 - 4, y1: p.y, x2: p.x2 + 4, y2: p.y, stroke: 'var(--prop)', 'stroke-width': 5, 'stroke-linecap': 'round' }, g); break;
      case 'couch':
        el('rect', Object.assign({ x: p.x, y: p.y - 36, width: 14, height: 236 - p.y, rx: 4 }, soft), g);
        el('rect', Object.assign({ x: p.x, y: p.y, width: p.w, height: 200 - p.y, rx: 4 }, soft), g); break;
      case 'line':
        el('line', { x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2, stroke: 'var(--prop)', 'stroke-width': p.w || 4, 'stroke-linecap': 'round' }, g); break;
      case 'roller':
        el('circle', Object.assign({ cx: p.x, cy: p.y, r: p.r }, soft), g); break;
      case 'bike': {
        const s = { stroke: 'var(--prop)', 'stroke-width': 4, 'stroke-linecap': 'round', fill: 'none' };
        el('line', Object.assign({ x1: 84, y1: 198, x2: 212, y2: 198 }, s), g);
        el('circle', Object.assign({ cx: 186, cy: 170, r: 19 }, soft), g);
        el('path', Object.assign({ d: 'M108 117 L128 172 L170 152 L172 100 M164 98 L180 94 M128 172 L110 198 M170 152 L196 198' }, s), g);
        el('rect', Object.assign({ x: 94, y: 110, width: 26, height: 6, rx: 3 }, solid), g);
        break;
      }
    }
  }

  function makeDynamic(g, p) {
    const o = { p, nodes: [] };
    const add = n => (o.nodes.push(n), n);
    switch (p.k) {
      case 'plate': add(el('circle', { r: p.r, fill: 'var(--prop)' }, g)); add(el('circle', { r: 3, fill: 'var(--iron)' }, g)); break;
      case 'db': add(el('circle', { r: 7, fill: 'var(--prop)', opacity: p.far ? 0.55 : 1 }, g)); break;
      case 'trap': add(el('line', { stroke: 'var(--prop)', 'stroke-width': 3 }, g)); add(el('circle', { r: p.r, fill: 'var(--prop-soft)', stroke: 'var(--prop)', 'stroke-width': 2 }, g)); break;
      case 'band': add(el('line', { stroke: 'var(--fire-bright)', 'stroke-width': p.w || 2.5, 'stroke-linecap': 'round' }, g)); break;
      case 'cable': add(el('line', { stroke: 'var(--prop)', 'stroke-width': 2, 'stroke-dasharray': '2 3' }, g)); break;
      case 'ball': add(el('circle', { r: p.r, fill: 'var(--fire)', stroke: 'var(--fire-bright)', 'stroke-width': 1.5 }, g)); break;
      case 'landmine': add(el('line', { stroke: 'var(--prop)', 'stroke-width': 4, 'stroke-linecap': 'round' }, g)); add(el('circle', { r: 12, fill: 'var(--prop-soft)', stroke: 'var(--prop)', 'stroke-width': 2 }, g)); add(el('rect', { width: 10, height: 6, fill: 'var(--prop)' }, g)); break;
      case 'sled': add(el('line', { stroke: 'var(--prop)', 'stroke-width': 4, 'stroke-linecap': 'round' }, g)); add(el('rect', { width: 40, height: 12, rx: 2, fill: 'var(--prop)' }, g)); add(el('circle', { r: 9, fill: 'var(--prop-soft)', stroke: 'var(--prop)', 'stroke-width': 2 }, g)); break;
      case 'pad': add(el('circle', { r: 6, fill: 'var(--prop-soft)', stroke: 'var(--prop)', 'stroke-width': 2 }, g)); break;
      case 'crank': add(el('line', { stroke: 'var(--prop)', 'stroke-width': 3 }, g)); add(el('circle', { r: 3.5, fill: 'var(--prop)' }, g)); break;
    }
    return o;
  }
  function updateDynamic(o, J, ball) {
    const p = o.p, n = o.nodes;
    const setC = (c, x, y) => { c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); };
    const setL = (l, a, b) => { l.setAttribute('x1', a[0].toFixed(1)); l.setAttribute('y1', a[1].toFixed(1)); l.setAttribute('x2', b[0].toFixed(1)); l.setAttribute('y2', b[1].toFixed(1)); };
    switch (p.k) {
      case 'plate': { const j = J[p.at]; const x = j[0] + (p.dx || 0), y = j[1] + (p.dy || 0); setC(n[0], x, y); setC(n[1], x, y); break; }
      case 'db': setC(n[0], J[p.at][0], J[p.at][1]); break;
      case 'trap': { const h = J[p.at]; setL(n[0], h, [h[0], h[1] + p.dy]); setC(n[1], h[0], h[1] + p.dy); break; }
      case 'band': case 'cable': setL(n[0], resolve(p.a, J), resolve(p.b, J)); break;
      case 'ball': { const b = ball || mid(J.haN, J.haF); setC(n[0], b[0], b[1]); break; }
      case 'landmine': {
        const h = J[p.at], t = p.to; setL(n[0], t, h);
        const dx = t[0] - h[0], dy = t[1] - h[1], d = Math.hypot(dx, dy) || 1;
        setC(n[1], h[0] + dx / d * 16, h[1] + dy / d * 16);
        n[2].setAttribute('x', t[0] - 5); n[2].setAttribute('y', t[1] - 3); break;
      }
      case 'sled': { const h = J[p.at]; setL(n[0], h, [h[0] + 2, 186]); n[1].setAttribute('x', (h[0] - 6).toFixed(1)); n[1].setAttribute('y', 186); setC(n[2], h[0] + 18, 177); break; }
      case 'pad': { const j = J[p.at]; setC(n[0], j[0] + (p.dx || 0), j[1] + (p.dy == null ? -8 : p.dy)); break; }
      case 'crank': { if (J.pN) { setL(n[0], J.pN, J.pF); setC(n[1], 128, 172); } break; }
    }
  }

  const STATIC_PROPS = ['bench', 'box', 'step', 'wall', 'post', 'bar', 'couch', 'roller', 'bike', 'line'];
  function buildFigure(svg, id, opts) {
    const A = prepare(ANIM[id]);
    svg.setAttribute('viewBox', '0 0 240 220');
    svg.setAttribute('role', 'img');
    if (!A.noGround) {
      el('rect', { x: -600, y: 200, width: 1440, height: 60, fill: 'var(--floor)' }, svg);
      el('line', { x1: -600, y1: 200, x2: 840, y2: 200, stroke: 'var(--iron-3)', 'stroke-width': 2 }, svg);
    }
    const props = A.props || [];
    const gs = el('g', {}, svg);
    props.forEach(p => { if (STATIC_PROPS.includes(p.k)) drawStatic(gs, p); });
    const gBehind = el('g', {}, svg);
    const dyn = [];
    props.filter(p => p.behind).forEach(p => dyn.push(makeDynamic(gBehind, p)));
    const limb = (cls, w) => el('polyline', { fill: 'none', stroke: cls === 'far' ? 'var(--fig-far)' : 'var(--fig)', 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    const parts = {
      legF: limb('far', 7), armF: limb('far', 6), torso: limb('near', 9), gird: A.front ? limb('near', 6) : null,
      legN: limb('near', 7), head: el('circle', { r: 10.5, fill: 'var(--fig)' }, svg), armN: limb('near', 6)
    };
    const gFront = el('g', {}, svg);
    props.filter(p => !p.behind && !STATIC_PROPS.includes(p.k)).forEach(p => dyn.push(makeDynamic(gFront, p)));
    function draw(time) {
      const { J, ball } = evaluate(A, time);
      parts.legF.setAttribute('points', [J.hpF, J.knF, J.anF, J.toF].map(P).join(' '));
      parts.armF.setAttribute('points', [J.shF, J.elF, J.haF].map(P).join(' '));
      parts.torso.setAttribute('points', (J.mid ? [J.hip, J.mid, J.neck] : [J.hip, J.neck]).map(P).join(' '));
      if (parts.gird) parts.gird.setAttribute('points', [J.shF, J.shN, J.neck, J.hip, J.hpF, J.hpN].map(P).join(' '));
      parts.legN.setAttribute('points', [J.hpN, J.knN, J.anN, J.toN].map(P).join(' '));
      parts.armN.setAttribute('points', [J.shN, J.elN, J.haN].map(P).join(' '));
      parts.head.setAttribute('cx', J.head[0].toFixed(1)); parts.head.setAttribute('cy', J.head[1].toFixed(1));
      dyn.forEach(o => updateDynamic(o, J, ball));
    }
    const fig = { svg, draw, A, t: (opts && opts.offset) || 0, playing: !reduced, visible: false };
    draw(reduced ? A.total * 0.45 : fig.t);
    if (reduced) fig.t = A.total * 0.45;
    return fig;
  }

  /* ---------- ciclo animazioni ---------- */
  let figs = [];
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { const f = figs.find(x => x.svg === e.target); if (f) f.visible = e.isIntersecting; }), { rootMargin: '80px' }) : null;
  function mountFigures(root) {
    root.querySelectorAll('svg[data-anim]').forEach((svg, i) => {
      const f = buildFigure(svg, svg.dataset.anim, { offset: (i % 5) * 0.37 });
      figs.push(f);
      if (io) io.observe(svg); else f.visible = true;
      const btn = svg.parentElement.querySelector('.pp');
      if (btn) {
        const sync = () => { btn.innerHTML = f.playing ? ICON_PAUSE : ICON_PLAY; btn.setAttribute('aria-label', f.playing ? 'Metti in pausa' : 'Riproduci'); };
        sync();
        btn.addEventListener('click', () => { f.playing = !f.playing; sync(); });
      }
    });
  }
  function unmount(root) {
    const keep = [];
    figs.forEach(f => { if (root.contains(f.svg)) { if (io) io.unobserve(f.svg); } else keep.push(f); });
    figs = keep;
  }
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    for (const f of figs) if (f.playing && f.visible) { f.t += dt * speed; f.draw(f.t); }
    requestAnimationFrame(loop);
  }
  const ICON_PAUSE = '<svg viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="1" width="3.5" height="12" fill="currentColor"/><rect x="8.5" y="1" width="3.5" height="12" fill="currentColor"/></svg>';
  const ICON_PLAY = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1 L13 7 L3 13 Z" fill="currentColor"/></svg>';

  /* ---------- componenti ---------- */
  const TYPE_CHIP = { gym: 'gym', field: 'field', act: 'act', match: 'match', rest: 'rest' };
  const VIDEOS = window.FitVideos || {};
  let mediaMode = store.get('media', 'video');
  const ytUrl = q => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);

  function usage(id) {
    const out = [];
    days().forEach(d => (d.items || []).forEach(it => { if (it.ex === id) out.push(`<b>${d.d.slice(0, 3)}</b> ${esc(it.s)}`); }));
    const m = MOB.find(x => x.ex === id);
    if (m) out.push(`<b>Ogni giorno</b> ${esc(m.s)}`);
    return out.join(' · ');
  }

  const isPhone = () => window.matchMedia('(max-width: 760px)').matches;
  const TODAY_ID = () => ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'][new Date().getDay()];
  const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms || 12); } catch (e) { /* niente */ } };

  /* ---------- serie e recuperi ---------- */
  let setsDone = store.get('sets', {});
  const parseRest = r => {
    if (!r || r === '—') return 0;
    const m = /(\d+)(?:\s*[–-]\s*\d+)?\s*([′″'"]|min|s)?(?:\s*(\d+)\s*[″"s]?)?/.exec(String(r));
    if (!m) return 0;
    const n = +m[1], u = m[2];
    if (u === '′' || u === "'" || u === 'min') return n * 60 + (m[3] ? +m[3] : 0);
    if (u === '″' || u === '"' || u === 's') return n;
    return n < 10 ? n * 60 : n;
  };
  const parseSets = s => { const m = /^(\d+)(?:–(\d+))?\s*×/.exec(s || ''); return m ? +(m[2] || m[1]) : 0; };
  const fmtSec = s => s >= 60 ? (s % 60 ? `${Math.floor(s / 60)}′${String(s % 60).padStart(2, '0')}″` : `${s / 60}′`) : `${s}″`;
  function setBar(id, it, key) {
    const rest = parseRest(it.r), sets = parseSets(it.s), hold = it.hold || 0;
    if (!rest && !hold && !sets) return '';
    const n = key ? Math.min(setsDone[key] || 0, sets) : 0;
    const dots = key && sets > 1 ? `<span class="dots" aria-label="${n} serie su ${sets}">${Array.from({ length: sets }, (_, i) => `<i${i < n ? ' class="on"' : ''}></i>`).join('')}<span class="dots-l">${n}/${sets}</span></span>` : '';
    const holdBtn = hold ? `<button type="button" class="sb-btn sb-hold" data-act="hold" data-sec="${hold}">▶ ${hold >= 120 ? 'Avvia ' + fmtSec(hold) : 'Tieni ' + fmtSec(hold)}</button>` : '';
    let main = '';
    if (key && sets > 1) main = `<button type="button" class="sb-btn sb-set" data-act="set">${n >= sets ? 'Serie finite ✓' : 'Serie fatta' + (rest ? ' · recupero ' + fmtSec(rest) : '')}</button>`;
    else if (rest) main = `<button type="button" class="sb-btn sb-set" data-act="rest">▶ Recupero ${fmtSec(rest)}</button>`;
    const undo = key && sets > 1 && n > 0 ? `<button type="button" class="sb-undo" data-act="undo" aria-label="Togli una serie">↺</button>` : '';
    return `<div class="setbar" data-key="${key || ''}" data-sets="${sets}" data-rest="${rest}" data-name="${esc(EX[id].name)}">${dots}<span class="sb-acts">${holdBtn}${main}${undo}</span></div>`;
  }
  // Giorni in cui hai segnato esercizi come fatti: { 'YYYY-MM-DD': [pk della seduta] } (riepilogo e sfida)
  function markTrained(uid) {
    const d = days().find(x => (x.items || []).some(i => i.uid === uid)); if (!d) return;
    const t = store.get('trained', {}), k = dkey(new Date()), list = t[k] || [];
    if (list.includes(d.pk)) return;
    t[k] = list.concat(d.pk);
    const lim = dkey(new Date(Date.now() - 120 * DAY)); Object.keys(t).forEach(x => { if (x < lim) delete t[x]; });
    store.set('trained', t);
  }
  const itemView = uid => { const d = days().find(x => (x.items || []).some(i => i.uid === uid)), it = findItem(uid); return it && d ? HK.item.reduce((x, f) => { try { return f(x, d) || x; } catch (e) { return x; } }, it) : it; };
  function refreshSetBar(sb) {
    const card = sb.closest('.ex'), key = sb.dataset.key;
    const it = itemView(key);
    if (!it) return;
    sb.outerHTML = setBar(it.ex, it, key);
    if (setsDone[key] >= parseSets(it.s)) {
      done[key] = true; store.set('done', done); markTrained(key);
      const cb = card.querySelector('.done input'); if (cb) cb.checked = true;
      card.classList.add('is-done');
    }
  }
  function onSetBar(btn) {
    const sb = btn.closest('.setbar'), act = btn.dataset.act, key = sb.dataset.key;
    const sets = +sb.dataset.sets, rest = +sb.dataset.rest, name = sb.dataset.name;
    const T = window.FitTimer;
    buzz();
    if (act === 'hold') return T.countdown(+btn.dataset.sec, name, 'hold');
    if (act === 'rest') return T.countdown(rest, name, 'rest');
    if (act === 'undo') { setsDone[key] = Math.max(0, (setsDone[key] || 0) - 1); store.set('sets', setsDone); return refreshSetBar(sb); }
    if (act === 'set') {
      const n = setsDone[key] || 0;
      if (n >= sets) return;
      setsDone[key] = n + 1; store.set('sets', setsDone);
      refreshSetBar(sb);
      document.dispatchEvent(new CustomEvent('fit:set', { detail: { key, id: (findItem(key) || {}).ex, n: n + 1, sets } }));
      if (rest) T.countdown(rest, `${name} · ${n + 1}/${sets} ${n + 1 === sets ? '· poi passa al prossimo esercizio' : 'serie fatte'}`, 'rest');
    }
  }

  function card(id, it, key) {
    const e = EX[id];
    const isDone = key && done[key];
    const restTxt = it && it.r ? (it.r === '—' ? '<span class="rest">Nessun recupero</span>' : `<span class="rest">Recupero <b>${esc(it.r)}</b></span>`) : '';
    const dose = it ? `<div class="dose"><span class="sets">${esc(it.s)}</span>${it.per ? `<span class="per">${esc(it.per)}</span>` : ''}${restTxt}</div>${setBar(id, it, key)}${key ? runH('card', id, it, key) : ''}${key ? (swapFor === key ? altHTML(id, key) : `<button type="button" class="swap-btn" data-swap="${esc(key)}">⇄ Cambia esercizio</button>`) : ''}` : (usage(id) ? `<p class="where">Nella scheda: ${usage(id)}</p>` : '');
    const v = VIDEOS[id];
    const ak = ANIM[id] ? id : (e.anim && ANIM[e.anim] ? e.anim : null);
    const view = ((ak && EX[ak]) || e).view === 'frontale' ? 'Vista frontale' : 'Vista laterale';
    if (!ak) return cardNoAnim(id, e, it, key, v, dose, isDone);
    const mode = v && mediaMode === 'video' ? 'video' : 'anim';
    const media = v ? `<div class="media-sw" role="group" aria-label="Cosa mostrare">
        <button type="button" data-mode="video" aria-pressed="${mode === 'video'}">Video</button><button type="button" data-mode="anim" aria-pressed="${mode === 'anim'}">Animazione</button></div>
      <div class="vid" data-vid="${v.id}" data-title="${esc(e.name)}"${mode === 'video' ? '' : ' hidden'}>
        <button type="button" class="vid-play" aria-label="Riproduci il video: ${esc(e.name)}">
          <img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="" loading="lazy">
          <span class="vid-btn"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1 L13 7 L3 13 Z" fill="currentColor"/></svg></span>
          <span class="vid-cap">Video di ${esc(v.ch)}${v.it ? ' · in italiano' : ' · in inglese'}</span>
        </button></div>` : '';
    return `<article class="ex${isDone ? ' is-done' : ''}" data-cat="${esc(e.cat)}" data-name="${esc((e.name + ' ' + e.mus.join(' ')).toLowerCase())}">
      <div class="anim">${media}<div class="fig-wrap"${mode === 'video' ? ' hidden' : ''}><span class="view-tag">${view}${ak !== id ? ' · simile' : ''}</span><svg data-anim="${ak}" aria-label="Animazione: ${esc(e.name)}"></svg><button class="pp" type="button"></button></div></div>
      <div class="ex-body">
        <div class="ex-top"><div><p class="cat">${esc(exMeta(e))}</p><h3>${esc(e.name)}</h3></div>
          ${key ? `<label class="done"><input type="checkbox" id="done-${key.replace(':', '-')}" data-key="${key}"${isDone ? ' checked' : ''}> Fatto</label>` : ''}</div>
        ${dose}
        ${it && it.note ? `<p class="note-l">${esc(it.note)}</p>` : ''}
        <details class="how"${isPhone() ? '' : ' open'}><summary>Come si fa <span>${e.steps.length} passi</span></summary><ol>${e.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></details>
        <details class="how"${isPhone() ? '' : ' open'}><summary>Errori da evitare <span>${e.err.length}</span></summary><ul class="err">${e.err.map(s => `<li>${esc(s)}</li>`).join('')}</ul></details>
        <div class="ex-foot"><div class="mus">${e.mus.map(m => `<span>${esc(m)}</span>`).join('')}</div>
          <a class="yt" href="${v ? 'https://www.youtube.com/watch?v=' + v.id : ytUrl(e.yt)}" target="_blank" rel="noopener">Apri su YouTube ↗</a></div>
      </div></article>`;
  }

  const LVL = ['', 'Principiante', 'Intermedio', 'Avanzato'];
  const exMeta = e => [e.cat, e.eq, LVL[e.lvl] || ''].filter(Boolean).join(' · ');
  function cardBody(id, e, it, key, v, dose, isDone) {
    return `<div class="ex-body">
        <div class="ex-top"><div><p class="cat">${esc(exMeta(e))}</p><h3>${esc(e.name)}</h3></div>
          ${key ? `<label class="done"><input type="checkbox" id="done-${key.replace(':', '-')}" data-key="${key}"${isDone ? ' checked' : ''}> Fatto</label>` : ''}</div>
        ${dose}
        ${it && it.note ? `<p class="note-l">${esc(it.note)}</p>` : ''}
        <details class="how"${isPhone() ? '' : ' open'}><summary>Come si fa <span>${e.steps.length} passi</span></summary><ol>${e.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol></details>
        <details class="how"${isPhone() ? '' : ' open'}><summary>Errori da evitare <span>${e.err.length}</span></summary><ul class="err">${e.err.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>
        <div class="ex-foot"><div class="mus">${e.mus.map(m => `<span>${esc(m)}</span>`).join('')}</div>
          <a class="yt" href="${v ? 'https://www.youtube.com/watch?v=' + v.id : ytUrl(e.yt)}" target="_blank" rel="noopener">Apri su YouTube ↗</a></div>
      </div>`;
  }
  // Esercizio senza animazione: grande pulsante che apre i video su YouTube
  function cardNoAnim(id, e, it, key, v, dose, isDone) {
    const media = v ? `<div class="vid" data-vid="${v.id}" data-title="${esc(e.name)}"><button type="button" class="vid-play" aria-label="Riproduci il video: ${esc(e.name)}">
          <img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="" loading="lazy"><span class="vid-btn"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1 L13 7 L3 13 Z" fill="currentColor"/></svg></span>
          <span class="vid-cap">Video di ${esc(v.ch)}</span></button></div>`
      : `<a class="vid-none" href="${ytUrl(e.yt)}" target="_blank" rel="noopener"><span class="vid-btn"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1 L13 7 L3 13 Z" fill="currentColor"/></svg></span><b>Guarda come si fa</b><span>Video su YouTube ↗</span></a>`;
    return `<article class="ex no-anim${isDone ? ' is-done' : ''}" data-cat="${esc(e.cat)}"><div class="anim">${media}</div>${cardBody(id, e, it, key, v, dose, isDone)}</article>`;
  }

  /* ---------- alternative: esercizi diversi che allenano la stessa cosa ---------- */
  let swapFor = null;
  const FAMILY = { Gambe: ['Glutei', 'Femorali'], Glutei: ['Gambe', 'Femorali'], Femorali: ['Glutei', 'Gambe', 'Prevenzione'], Velocità: ['Agilità', 'Pliometria'], Agilità: ['Velocità', 'Pliometria'], Pliometria: ['Potenza', 'Velocità'], Potenza: ['Pliometria', 'Contrasti'], Core: ['Contrasti'], Contrasti: ['Core', 'Potenza'], Mobilità: ['Stretching'], Stretching: ['Mobilità', 'Recupero'], Attivazione: ['Riscaldamento'], Riscaldamento: ['Attivazione'], Recupero: ['Stretching', 'Mobilità'], Schiena: [], 'Petto e spalle': ['Braccia'], Braccia: ['Petto e spalle'], Prevenzione: ['Femorali', 'Gambe', 'Glutei', 'Core'], Cardio: [] };
  const musKey = m => fold(m).slice(0, 5); // glutei/gluteo medio, femorali/femorale...
  function alternatives(id, n, exclude) {
    const e = EX[id]; if (!e) return [];
    const mus = [...new Set(e.mus.map(musKey))], fam = FAMILY[e.cat] || [], skip = new Set(exclude || []);
    return Object.keys(EX).filter(x => x !== id && !skip.has(x) && forMe(EX[x])).map(x => {
      const o = EX[x], om = [...new Set(o.mus.map(musKey))];
      let ms = 0; om.forEach((m, i) => { const j = mus.indexOf(m); if (j >= 0) ms += (i === 0 && j === 0 ? 6 : j === 0 || i === 0 ? 3 : 1.5); });
      if (ms < 3) return null; // deve allenare davvero gli stessi muscoli
      let sc = ms + (o.cat === e.cat ? 4 : fam.includes(o.cat) ? 2 : 0);
      if (o.lvl && e.lvl) sc -= Math.abs(o.lvl - e.lvl); else if (o.lvl === 3) sc -= 1;
      if (o.eq && e.eq && o.eq === e.eq) sc -= 0.5; // meglio proporre un attrezzo diverso
      return [x, sc];
    }).filter(x => x && x[1] >= 7).sort((a, b) => b[1] - a[1] || EX[a[0]].name.localeCompare(EX[b[0]].name, 'it')).slice(0, n).map(x => x[0]);
  }
  function altHTML(id, key) {
    const inDay = days().flatMap(d => d.items || []).map(i => i.ex);
    const alts = alternatives(id, 5, inDay);
    return `<div class="alts"><p class="alts-h">Al posto di <b>${esc(EX[id].name)}</b>, allena la stessa cosa:</p>
      ${alts.length ? `<ul>${alts.map(a => `<li><span><b>${esc(EX[a].name)}</b><small>${esc(exMeta(EX[a]))} · ${esc(EX[a].mus.slice(0, 3).join(', '))}</small></span><button type="button" class="sb-btn" data-swapto="${esc(key)}|${a}">Usa questo</button></li>`).join('')}</ul>` : '<p class="small">Nessuna alternativa trovata.</p>'}
      <button type="button" class="btn-ghost" data-swap="">Lascia com'è</button></div>`;
  }
  // Sostituisce l'esercizio nella scheda del giorno mantenendo serie, recupero e parte
  function swapExercise(uid, newId) {
    for (const d of days()) {
      const i = (d.items || []).findIndex(x => x.uid === uid);
      if (i < 0) continue;
      const items = JSON.parse(JSON.stringify(d.items));
      const old = items[i].ex; items[i].ex = newId; delete items[i].note; delete items[i].hold;
      items[i].note = 'Al posto di ' + EX[old].name;
      saveItems(d.pk, items); return d;
    }
    return null;
  }

  /* ---------- diario dell'allenamento (facoltativo) ---------- */
  const WEEKDAYS = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
  function dateOfDay(dayId) { const t = today0(), wd = (t.getDay() + 6) % 7; return dkey(new Date(t.getTime() + (WEEKDAYS.indexOf(dayId) - wd) * DAY + 12 * 3600000)); }
  const logs = () => store.get('logs', {});
  const NEG = /(non mi (e |è )?piac|non mi (e |è )?piaciut|odio|noios|fastidi|dolor|mi fa male|male (al|alla|alle|ai|agli|all)|scomod|non riesc|non lo sopport|evitere|non mi convinc|non mi trovo|troppo difficil)/;
  function dislikedIn(text, d) {
    const sent = fold(text).split(/[.!?\n;]+/).filter(x => NEG.test(x));
    if (!sent.length) return [];
    const stop = new Set(['con', 'per', 'una', 'sul', 'sulla', 'alla', 'della', 'dei', 'delle', 'lato', 'gamba', 'braccio', 'esercizio', 'veloce', 'lento']);
    return (d.items || []).filter(it => it.ex && EX[it.ex]).filter(it => {
      const nm = fold(EX[it.ex].name.replace(/\(.*?\)/g, ''));
      const words = nm.split(/\s+/).filter(x => x.length > 3 && !stop.has(x));
      return sent.some(st => st.includes(nm) || (words.length && words.slice(0, 2).every(x => st.includes(x))) || st.includes(it.ex.replace(/-/g, ' ')));
    });
  }
  function diaryHTML(d) {
    const k = dateOfDay(d.id), L = logs(), cur = L[k] && L[k].d === d.id ? L[k] : null;
    const past = Object.entries(L).filter(([dk, v]) => v.pk === d.pk && dk !== k && v.t).sort((a, b) => a[0] < b[0] ? 1 : -1).slice(0, 3);
    const bad = cur && cur.t ? dislikedIn(cur.t, d) : [];
    const R = [['facile', 'Facile'], ['giusto', 'Giusto'], ['duro', 'Duro']];
    return `<section class="panel diary" id="diary"><div class="f-mh"><h3>Diario dell'allenamento</h3><span>facoltativo</span></div>
      <p class="small">Com'è andata ${d.d.toLowerCase()} ${fmt(kdate(k), { day: 'numeric', month: 'short' })}? Carichi usati, sensazioni, cosa ti è piaciuto e cosa no. Se scrivi che un esercizio non ti piace ti propongo un'alternativa.</p>
      ${watchActLine(k)}
      <div class="d-rate" role="group" aria-label="Com'è stato">${R.map(r => `<button type="button" data-rate="${r[0]}" aria-pressed="${!!cur && cur.r === r[0]}">${r[1]}</button>`).join('')}</div>
      <textarea id="d-text" rows="4" maxlength="1200" placeholder="Es. hip thrust 60 kg 4×10 facile, la prossima volta 62,5. Il box jump non mi piace.">${cur ? esc(cur.t || '') : ''}</textarea>
      <div class="f-act"><button type="button" class="sb-btn" id="d-save">${cur ? 'Aggiorna le note' : 'Salva le note'}</button>${cur ? '<span class="d-ok">Salvato ✓</span>' : ''}</div>
      ${bad.length ? `<div class="d-bad">${bad.map(it => `<p class="alts-h">Hai scritto che <b>${esc(EX[it.ex].name)}</b> non ti va. Vuoi cambiarlo?</p>${(() => { const a = alternatives(it.ex, 3, (d.items || []).map(i => i.ex)); return a.length ? `<ul>${a.map(x => `<li><span><b>${esc(EX[x].name)}</b><small>${esc(exMeta(EX[x]))}</small></span><button type="button" class="sb-btn" data-swapto="${esc(it.uid)}|${x}">Usa questo</button></li>`).join('')}</ul>` : ''; })()}`).join('')}</div>` : ''}
      ${past.length ? `<details class="how d-past"${past.length ? ' open' : ''}><summary>Le volte prima <span>${past.length}</span></summary><ul>${past.map(([dk, v]) => `<li><b>${fmt(kdate(dk), { weekday: 'short', day: 'numeric', month: 'short' })}</b>${v.r ? ` <i class="d-r ${v.r}">${esc(R.find(r => r[0] === v.r)[1])}</i>` : ''}<p>${esc(v.t)}</p></li>`).join('')}</ul></details>` : ''}
    </section>`;
  }
  function saveDiary(d, patch) {
    const k = dateOfDay(d.id), L = Object.assign({}, logs()), cur = L[k] && L[k].d === d.id ? L[k] : { d: d.id };
    L[k] = Object.assign({}, cur, { pk: d.pk, at: Date.now() }, patch);
    if (!L[k].t && !L[k].r) delete L[k];
    const ks = Object.keys(L).sort(); while (ks.length > 300) delete L[ks.shift()]; // tiene circa 10 mesi
    store.set('logs', L);
  }
  const curDay = () => { const id = (location.hash || '#').slice(1); return dayById(id === 'oggi' || !id ? TODAY_ID() : id); };

  function dayProgress(d) {
    const its = (d.items || []).filter(i => i.ex);
    const n = its.reduce((s, it) => s + (done[it.uid] ? 1 : 0), 0);
    return { n, tot: its.length };
  }

  /* ---------- calendario: 12 settimane, 23 nov 2026 → 14 feb 2027 ---------- */
  const BLOCK = Math.max(1, Math.min(9, +store.get('block', 1) || 1));
  const START = new Date(2026, 10, 23 + (BLOCK - 1) * 84), WEEKS = 12, DAY = 86400000;
  // date sul calendario (non in millisecondi): restano a mezzanotte anche col cambio dell'ora legale
  const addD = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const END = addD(START, WEEKS * 7 - 1);
  const fmt = (d, o) => d.toLocaleDateString('it-IT', o || { day: 'numeric', month: 'short' });
  const weekStart = n => addD(START, (n - 1) * 7);
  const testDate = n => addD(weekStart(n), PROG.testDay || 0); // giorno dei test del programma
  const TEST_WEEKS = [1, 4, 8, 12];
  function today0() { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
  function currentWeek() { const d = Math.floor((today0() - START) / DAY); return d < 0 ? 0 : d >= WEEKS * 7 ? WEEKS + 1 : Math.floor(d / 7) + 1; }
  function calendarHTML() {
    const cw = currentWeek(), t = today0();
    const left = Math.round((END - t) / DAY), toStart = Math.round((START - t) / DAY);
    const status = cw === 0 ? `Si parte <b>lunedì ${fmt(START, { day: 'numeric', month: 'long' })}</b>: ${toStart === 1 ? 'manca 1 giorno' : 'mancano ' + toStart + ' giorni'}.`
      : cw <= WEEKS ? `Sei alla <b>settimana ${cw} di ${WEEKS}</b>: ${left === 0 ? 'oggi è il traguardo' : 'mancano ' + left + ' giorni al traguardo'}.`
        : `<b>Programma completato.</b> Fai i test finali e imposta il prossimo blocco.`;
    const cells = Array.from({ length: WEEKS }, (_, i) => {
      const n = i + 1, a = weekStart(n), b = addD(a, 6);
      const tags = [];
      if (n % 4 === 0) tags.push('Scarico');
      if (TEST_WEEKS.includes(n)) tags.push('Test ' + fmt(testDate(n), { weekday: 'short', day: 'numeric' }));
      if (n >= 5 && n <= 7) tags.push('Feste');
      const st = n < cw ? ' past' : n === cw ? ' now' : '';
      return `<div class="wk${st}${n % 4 === 0 ? ' deload' : ''}"><span class="wk-n">S${n}</span><span class="wk-d">${fmt(a, { day: 'numeric' })}${a.getMonth() !== b.getMonth() ? ' ' + fmt(a, { month: 'short' }) : ''}–${fmt(b)}</span>${tags.map(x => `<span class="wk-t">${x}</span>`).join('')}</div>`;
    }).join('');
    return `<section class="sec"><div class="sec-h"><div><h2>Il calendario</h2><p class="kicker">${fmt(START, { day: 'numeric', month: 'long', year: 'numeric' })} → ${fmt(END, { day: 'numeric', month: 'long', year: 'numeric' })} · 3 blocchi da 4 settimane</p></div></div>
      <p class="cal-status">${status}</p>
      <div class="cal">${cells}</div>
      <p class="small">${esc(PROG.calNote)}</p></section>`;
  }

  /* ---------- diario del peso: un valore per giorno, salvato nell'account ---------- */
  const pad2 = n => String(n).padStart(2, '0');
  const dkey = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  const kdate = k => { const [y, m, g] = k.split('-').map(Number); return new Date(y, m - 1, g); };
  const kg = n => n.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const parseKg = v => { const n = parseFloat(String(v || '').replace(',', '.').replace(/[^0-9.]/g, '')); return isFinite(n) && n >= 25 && n <= 250 ? Math.round(n * 10) / 10 : null; };
  const weights = () => store.get('weights', {});
  const wList = () => Object.entries(weights()).filter(x => typeof x[1] === 'number' && isFinite(x[1])).sort((a, b) => a[0] < b[0] ? -1 : 1);
  const lastWeight = () => { const l = wList(); return l[l.length - 1] || null; };
  function setWeight(k, v) { const w = Object.assign({}, weights()); if (v == null) delete w[k]; else w[k] = v; store.set('weights', w); }
  const sign = n => (n > 0.04 ? '+' : n < -0.04 ? '−' : '±') + kg(Math.abs(n)) + ' kg';
  function wDiffs() {
    const l = wList(); if (!l.length) return [];
    const last = l[l.length - 1], out = [];
    const lim = dkey(new Date(kdate(last[0]).getTime() - 7 * DAY));
    const wk = l.filter(x => x[0] <= lim).pop();
    if (wk) out.push([sign(last[1] - wk[1]), 'in 7 giorni']);
    if (l.length > 1 && l[0] !== wk) out.push([sign(last[1] - l[0][1]), 'dal ' + fmt(kdate(l[0][0]))]);
    return out;
  }
  function wChart(l) {
    if (l.length < 2) return '';
    const W = 320, H = 90, P = 8, vs = l.map(x => x[1]), lo = Math.min(...vs), hi = Math.max(...vs), r = Math.max(hi - lo, 0.6), top = (hi + lo) / 2 + r / 2;
    const t0 = kdate(l[0][0]).getTime(), t1 = kdate(l[l.length - 1][0]).getTime(), span = Math.max(t1 - t0, DAY);
    const pts = l.map(x => [P + (kdate(x[0]).getTime() - t0) / span * (W - 2 * P), P + (top - x[1]) / r * (H - 2 * P)]);
    return `<svg class="w-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Andamento del peso: da ${kg(l[0][1])} a ${kg(l[l.length - 1][1])} kg">
      <polyline points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="none" stroke="var(--fire-bright)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i === pts.length - 1 ? 4.5 : 2.5}" fill="${i === pts.length - 1 ? 'var(--fire-bright)' : 'var(--on-iron)'}"/>`).join('')}
    </svg><div class="w-ax"><span>${fmt(kdate(l[0][0]))}</span><span>min ${kg(lo)} · max ${kg(hi)}</span><span>${fmt(kdate(l[l.length - 1][0]))}</span></div>`;
  }
  function weightHTML(compact) {
    const today = dkey(new Date()), cur = weights()[today], l = wList(), last = l[l.length - 1];
    const diffs = wDiffs().map(x => `<span><b>${x[0]}</b> ${x[1]}</span>`).join('');
    return `<section class="panel dark w-card${compact ? ' compact' : ''}${compact === 'home' ? ' w-home' : ''}" id="w-card"><div class="w-top"><h3>Peso di oggi</h3><span class="w-day">${fmt(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
      <div class="w-form"><label class="w-in"><input id="w-in" inputmode="decimal" enterkeyhint="done" autocomplete="off" aria-label="Peso di oggi in kg" placeholder="${last ? kg(last[1]) : '00,0'}" value="${cur != null ? kg(cur) : ''}"><span>kg</span></label>
        <button type="button" class="sb-btn" id="w-save">${cur != null ? 'Aggiorna' : 'Salva'}</button></div>
      <p class="w-msg" id="w-msg">${cur != null ? 'Segnato oggi: <b>' + kg(cur) + ' kg</b>' : last ? 'Ultimo: ' + kg(last[1]) + ' kg, ' + fmt(kdate(last[0]), { weekday: 'short', day: 'numeric', month: 'short' }) : 'Pesati al mattino, dopo il bagno e prima di mangiare.'}</p>
      ${diffs ? `<div class="w-diff">${diffs}</div>` : ''}
      ${compact === 'home' ? `<a class="w-all" href="#piano">Storico <b>→</b></a>` : compact ? '' : wChart(l.slice(-30)) + `<a class="w-all" href="#piano">Tutto lo storico <b>→</b></a>`}
    </section>`;
  }
  function weightLogHTML() {
    const l = wList().reverse();
    const lc = wList().slice(-30);
    return `<section class="sec panel" id="w-log"><h3>Diario del peso</h3>
      ${lc.length >= 2 ? `<div class="w-chart-box">${wChart(lc)}</div>` : ''}
      <p class="small">Hai dimenticato un giorno? Scegli la data e scrivi il peso.</p>
      <div class="w-form"><label class="w-date">Giorno<input type="date" id="w-date" value="${dkey(new Date())}" max="${dkey(new Date())}"></label>
        <label class="w-in"><input id="w-in2" inputmode="decimal" autocomplete="off" aria-label="Peso in kg" placeholder="00,0"><span>kg</span></label>
        <button type="button" class="sb-btn" id="w-save2">Salva</button></div>
      ${l.length ? `<ol class="w-list">${l.map((x, i) => { const prev = l[i + 1], d = prev ? x[1] - prev[1] : null;
        return `<li><span class="w-d">${fmt(kdate(x[0]), { weekday: 'short', day: 'numeric', month: 'short' })}</span><b>${kg(x[1])} kg</b><span class="w-c">${d == null ? '' : sign(d)}</span><button type="button" class="btn-ghost w-del" data-wdel="${x[0]}" aria-label="Rimuovi il peso del ${fmt(kdate(x[0]))}">Rimuovi</button></li>`; }).join('')}</ol>` : '<p class="small">Ancora nessun peso segnato.</p>'}
    </section>`;
  }
  function saveWeightFrom(inputId, key) {
    const inp = document.getElementById(inputId), v = parseKg(inp && inp.value);
    if (v == null) { if (inp) { inp.focus(); inp.classList.add('bad'); } const m = document.getElementById('w-msg'); if (m && inputId === 'w-in') m.textContent = 'Scrivi un peso valido, per esempio 84,6.'; return; }
    setWeight(key, v); buzz(); route(true);
    const c = document.getElementById(inputId === 'w-in' ? 'w-card' : 'w-log'); if (c) { c.classList.remove('saved'); void c.offsetWidth; c.classList.add('saved'); }
  }

  /* ---------- diario del cibo: cosa hai mangiato e stima dei macro ---------- */
  const MEALS = [['col', 'Colazione'], ['pra', 'Pranzo'], ['spu', 'Spuntini'], ['cen', 'Cena']];
  const MAC0 = PROG.macros || { kcal: [2000, 2200], p: [100, 120], c: [230, 280], f: [60, 75] };
  let MAC = MAC0;
  const macrosFor = dk => HK.macros.reduce((m, f) => { try { return f(dk, m) || m; } catch (e) { return m; } }, JSON.parse(JSON.stringify(MAC0)));
  const n0 = v => Math.round(v).toLocaleString('it-IT');
  const n1 = v => (Math.round(v * 10) / 10).toLocaleString('it-IT');
  const fold = t => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let foodDay = null, foodAdd = null, foodPick = null, foodQ = '', foodNew = false;
  const customFoods = () => store.get('food-custom', []);
  const allFoods = () => customFoods().concat(window.FitFood.FOODS);
  const foodById = id => allFoods().find(f => f.id === id);
  const foodLog = () => store.get('food', {});
  const dayFood = k => (foodLog()[k] || []);
  function setDayFood(k, list) {
    const all = Object.assign({}, foodLog()); if (list.length) all[k] = list; else delete all[k];
    const lim = dkey(new Date(Date.now() - 120 * DAY)); Object.keys(all).forEach(x => { if (x < lim) delete all[x]; }); // tiene 4 mesi
    store.set('food', all);
  }
  function sumFood(list) { return list.reduce((a, e) => ({ k: a.k + e.k, p: a.p + e.p, c: a.c + e.c, f: a.f + e.f }), { k: 0, p: 0, c: 0, f: 0 }); }
  const forGrams = (fd, g) => ({ k: Math.round(fd.k * g / 100), p: Math.round(fd.p * g) / 100, c: Math.round(fd.c * g) / 100, f: Math.round(fd.f * g) / 100 });
  function macroBar(lbl, v, rg, unit) {
    const pct = Math.min(100, v / rg[1] * 100), st = v < rg[0] ? '' : v <= rg[1] ? ' ok' : ' over';
    return `<div class="mb${st}"><div class="mb-h"><b>${lbl}</b><span><em>${n0(v)}</em> / ${n0(rg[0])}–${n0(rg[1])} ${unit}</span></div><div class="mb-t"><i style="width:${pct.toFixed(1)}%"></i><s style="left:${(rg[0] / rg[1] * 100).toFixed(1)}%"></s></div></div>`;
  }
  function foodTotalsHTML(t) {
    const left = MAC.kcal[0] - t.k, leftP = MAC.p[0] - t.p;
    const msg = t.k === 0 ? 'Aggiungi quello che mangi: qui vedi calorie e macro della giornata.' :
      left > 0 ? `Mancano circa <b>${n0(left)} kcal</b>${leftP > 0 ? ` e <b>${n0(leftP)} g di proteine</b>` : ' · proteine a posto'}.` :
      t.k <= MAC.kcal[1] ? `Calorie centrate${leftP > 0 ? `: mancano ancora <b>${n0(leftP)} g di proteine</b>` : ', proteine comprese'}.` : `Sei <b>${n0(t.k - MAC.kcal[1])} kcal</b> sopra l'obiettivo di oggi.`;
    return `<section class="panel dark f-tot" id="f-tot"><div class="f-k"><b>${n0(t.k)}</b><span>kcal su ${n0(MAC.kcal[0])}–${n0(MAC.kcal[1])}</span></div>
      ${macroBar('Calorie', t.k, MAC.kcal, 'kcal').replace('class="mb', 'class="mb kcal')}
      ${macroBar('Proteine', t.p, MAC.p, 'g')}${macroBar('Carboidrati', t.c, MAC.c, 'g')}${macroBar('Grassi', t.f, MAC.f, 'g')}
      <p class="f-msg">${msg}</p>${watchActLine(foodDay || dkey(new Date())).replace('wt-act', 'wt-act on-dark')}</section>`;
  }
  /* Consigli: cosa mangiare per avvicinarsi agli obiettivi, in base al pasto dell'ora */
  const SUG = {
    col: { p: ['Yogurt greco 0%', 'Skyr', 'Proteine in polvere (whey)', 'Fiocchi di latte', 'Albume'], c: ["Fiocchi d'avena", 'Pane integrale', 'Banana', 'Fette biscottate'], f: ["Burro d'arachidi", 'Mandorle', 'Noci'] },
    pra: { p: ['Petto di pollo (cotto)', 'Tonno al naturale (sgocciolato)', 'Merluzzo o nasello', 'Uovo', 'Lenticchie (cotte)', 'Bresaola'], c: ['Riso (crudo)', 'Pasta (cruda)', 'Patate (lesse o al forno senza olio)', 'Pane comune', 'Quinoa (cotta)'], f: ["Olio extravergine d'oliva", 'Avocado', 'Parmigiano o grana'] },
    spu: { p: ['Yogurt greco 0%', 'Skyr', 'Bresaola', 'Fiocchi di latte', 'Barretta proteica'], c: ['Banana', 'Gallette di riso', 'Mela', 'Pane comune'], f: ['Mandorle', 'Noci', 'Cioccolato fondente 70%'] },
    cen: { p: ['Petto di pollo (cotto)', 'Merluzzo o nasello', 'Petto di tacchino (crudo)', 'Uovo', 'Tonno al naturale (sgocciolato)', 'Salmone fresco'], c: ['Riso (crudo)', 'Patate (lesse o al forno senza olio)', 'Pasta (cruda)', 'Pane comune', 'Farro (cotto)'], f: ["Olio extravergine d'oliva", 'Avocado', 'Noci'] }
  };
  const CAP = { p: { col: 30, spu: 25, pra: 40, cen: 40 }, c: { col: 60, spu: 35, pra: 90, cen: 80 }, f: { col: 15, spu: 15, pra: 15, cen: 15 } };
  const UNIT = /^1 (uovo|albume|barretta|banana|mela|misurino|galletta|fetta|vasetto)/;
  let sugShift = 0;
  const mealNow = () => { const hr = new Date().getHours() + new Date().getMinutes() / 60; return hr < 10.5 ? 'col' : hr < 15 ? 'pra' : hr < 18.5 ? 'spu' : 'cen'; };
  const byName = n => window.FitFood.FOODS.find(f => f.n === n);
  function sizeFor(fd, need, key, rk) {
    let g = need / fd[key] * 100;
    if (rk != null && fd.k * g / 100 > rk + 60) g = Math.max(0, (rk + 60) / fd.k * 100); // non sforare troppo le calorie
    g = Math.min(g, fd.g * 2.5);
    if (UNIT.test(fd.u)) { const n = Math.min(4, Math.round(g / fd.g)); return n >= 1 ? { g: n * fd.g, lbl: n + ' × ' + fd.u.slice(2) } : null; }
    if (g < fd.g * 0.5) return null;
    g = g >= 100 ? Math.round(g / 10) * 10 : Math.round(g / 5) * 5;
    return { g, lbl: g + ' g' };
  }
  function foodSuggest(t) {
    const meal = mealNow(), pool = SUG[meal], eaten = new Set(dayFood(dkey(new Date())).map(e => e.n));
    const r = { k: MAC.kcal[0] - t.k, p: MAC.p[0] - t.p, c: MAC.c[0] - t.c, f: MAC.f[0] - t.f };
    const out = [];
    const pick = (key, min) => {
      if (r[key] < min || r.k < 80) return;
      const list = pool[key], n = list.length;
      for (let i = 0; i < n; i++) {
        const fd = byName(list[(i + sugShift) % n]);
        if (!fd || eaten.has(fd.n) || out.some(o => o.fd === fd)) continue;
        const sz = sizeFor(fd, Math.min(r[key], CAP[key][meal]), key, r.k);
        if (!sz) continue;
        const v = forGrams(fd, sz.g); out.push({ fd, sz, v, key });
        r.k -= v.k; r.p -= v.p; r.c -= v.c; r.f -= v.f; return;
      }
    };
    pick('p', 12); pick('c', 20); pick('f', 8);
    if (!out.length) pick('p', 6);
    return { meal, out, r };
  }
  function foodSuggestHTML(t) {
    const gap = { k: MAC.kcal[0] - t.k, p: MAC.p[0] - t.p, c: MAC.c[0] - t.c, f: MAC.f[0] - t.f };
    const mealLbl = MEALS.find(m => m[0] === mealNow())[1].toLowerCase();
    if (t.k > MAC.kcal[1]) return `<section class="panel f-sug"><h3>Consigli</h3><p class="small">Per oggi le calorie bastano. Se hai ancora fame scegli verdura, insalata o un caffè; domani riparti dagli obiettivi.${gap.p > 10 ? ' Le proteine mancanti le recuperi domani: non serve forzare.' : ''}</p></section>`;
    if (gap.p <= 5 && gap.c <= 10 && gap.f <= 5) return `<section class="panel f-sug"><h3>Consigli</h3><p class="small">Obiettivi di oggi raggiunti: proteine, carboidrati e grassi sono a posto. 💪</p></section>`;
    const { out } = foodSuggest(t);
    const need = [gap.p > 5 ? `<b>${n0(gap.p)} g</b> di proteine` : '', gap.c > 10 ? `<b>${n0(gap.c)} g</b> di carboidrati` : '', gap.f > 5 ? `<b>${n0(gap.f)} g</b> di grassi` : ''].filter(Boolean);
    const why = { p: 'Proteine', c: 'Carboidrati', f: 'Grassi' };
    return `<section class="panel f-sug" id="f-sug"><div class="f-mh"><h3>Cosa mangiare adesso</h3><span>idee per ${mealLbl}</span></div>
      <p class="small">Ti mancano ${need.join(', ').replace(/, ([^,]*)$/, ' e $1')} (circa ${n0(Math.max(0, gap.k))} kcal).</p>
      ${out.length ? `<ul class="f-sl">${out.map(o => `<li><span class="f-n"><b>${esc(o.fd.n)}</b><small><i class="f-tag ${o.key}">${why[o.key]}</i> ${esc(o.sz.lbl)} · ${n0(o.v.k)} kcal · P ${n1(o.v.p)} · C ${n1(o.v.c)} · G ${n1(o.v.f)}</small></span>
        <button type="button" class="sb-btn" data-fsug="${esc(o.fd.id)}|${o.sz.g}" aria-label="Aggiungi ${esc(o.fd.n)} a ${mealLbl}">+ Aggiungi</button></li>`).join('')}</ul>` : '<p class="small">Ti manca poco: uno spuntino leggero basta.</p>'}
      ${nextMealHint(foodSuggest(t).r)}
      <div class="f-act"><button type="button" class="btn-ghost" data-fx="more">Altre idee</button></div>
    </section>`;
  }
  // Se dopo i consigli manca ancora tanto, un'idea per il pasto successivo
  function nextMealHint(r) {
    const next = { col: 'il pranzo', pra: 'la cena', spu: 'la cena', cen: '' }[mealNow()];
    if (!next || r.k < 450) return '';
    const P = byName(mealNow() === 'col' ? 'Petto di pollo (cotto)' : 'Merluzzo o nasello'), C = byName(mealNow() === 'col' ? 'Pasta (cruda)' : 'Riso (crudo)'), O = byName("Olio extravergine d'oliva");
    const gp = Math.min(250, Math.max(100, Math.round(Math.min(r.p, 45) / P.p * 10) * 10)), gc = Math.min(130, Math.max(60, Math.round(Math.min(r.c, 100) / C.c * 10) * 10));
    return `<p class="small f-next">Per ${next} punta su qualcosa come <b>${gp} g di ${P.n.toLowerCase().replace(/ \(.*\)/, '')}</b>, <b>${gc} g di ${C.n.toLowerCase().replace(/ \(.*\)/, '')}</b>, verdura e 1 cucchiaio d'olio: circa ${n0(forGrams(P, gp).k + forGrams(C, gc).k + O.k * 0.1)} kcal.</p>`;
  }
  function foodResults() {
    const q = fold(foodQ.trim()), rec = store.get('food-recent', []);
    let list;
    if (!q) list = rec.map(foodById).filter(Boolean);
    else { const words = q.split(/\s+/); list = allFoods().filter(f => { const n = fold(f.n); return words.every(x => n.includes(x)); }).sort((a, b) => fold(a.n).indexOf(q) - fold(b.n).indexOf(q)).slice(0, 40); }
    const head = !q ? (list.length ? '<p class="f-rh">Usati di recente</p>' : '<p class="f-rh">Scrivi per cercare tra ' + allFoods().length + ' alimenti: pasta, pollo, yogurt…</p>') : (list.length ? '' : '<p class="f-rh">Nessun risultato. Crealo dall\'etichetta qui sotto.</p>');
    return head + list.map(f => `<button type="button" class="f-res" data-fpick="${esc(f.id)}"><span><b>${esc(f.n)}</b><small>${esc(f.cat)}</small></span><em>${n0(f.k)} kcal<small>per 100 g</small></em></button>`).join('');
  }
  function foodPickerHTML(meal) {
    const fd = foodPick && foodById(foodPick);
    if (foodNew) return `<div class="f-pick" id="f-pick"><h4>Nuovo alimento</h4><p class="small">Copia i valori per 100 g dall'etichetta. Lo ritrovi nella ricerca.</p>
      <div class="ed-f f-newf"><label class="wide">Nome<input id="fn-n" autocomplete="off" placeholder="Es. Yogurt proteico al cocco" maxlength="60"></label>
        <label>Kcal<input id="fn-k" inputmode="decimal" autocomplete="off" placeholder="100 g"></label><label>Proteine (g)<input id="fn-p" inputmode="decimal" autocomplete="off"></label>
        <label>Carboidrati (g)<input id="fn-c" inputmode="decimal" autocomplete="off"></label><label>Grassi (g)<input id="fn-f" inputmode="decimal" autocomplete="off"></label>
        <label>Porzione (g)<input id="fn-g" inputmode="decimal" autocomplete="off" placeholder="100"></label></div>
      <p class="f-err" id="fn-err" hidden></p>
      <div class="f-act"><button type="button" class="sb-btn" id="fn-save">Salva e usa</button><button type="button" class="btn-ghost" data-fx="back">Indietro</button></div></div>`;
    if (fd) {
      const g = fd.g || 100, pv = forGrams(fd, g);
      return `<div class="f-pick" id="f-pick"><h4>${esc(fd.n)}</h4><p class="small">Per 100 g: ${n0(fd.k)} kcal · P ${n1(fd.p)} · C ${n1(fd.c)} · G ${n1(fd.f)}</p>
        <div class="f-portions">${[[0.5, 'Mezza'], [1, fd.u], [2, 'Doppia']].map(x => `<button type="button" data-fg="${Math.round(g * x[0])}">${esc(x[1])} <small>${Math.round(g * x[0])} g</small></button>`).join('')}</div>
        <label class="w-in f-gin"><input id="f-g" inputmode="decimal" autocomplete="off" aria-label="Quantità in grammi" value="${g}"><span>g</span></label>
        <p class="f-prev" id="f-prev">${n0(pv.k)} kcal · P ${n1(pv.p)} g · C ${n1(pv.c)} g · G ${n1(pv.f)} g</p>
        <div class="f-act"><button type="button" class="sb-btn" id="f-ok">Aggiungi a ${esc(MEALS.find(m => m[0] === meal)[1])}</button><button type="button" class="btn-ghost" data-fx="back">Cambia alimento</button></div></div>`;
    }
    return `<div class="f-pick" id="f-pick"><label class="f-q"><input id="f-q" type="search" autocomplete="off" enterkeyhint="search" placeholder="Cerca un alimento" value="${esc(foodQ)}" aria-label="Cerca un alimento"></label>
      <div class="f-results" id="f-res">${foodResults()}</div>
      <div class="f-act"><button type="button" class="btn-ghost" data-fx="new">+ Alimento dall'etichetta</button><button type="button" class="btn-ghost" data-fx="close">Chiudi</button></div></div>`;
  }
  function viewFood() {
    const today = dkey(new Date()); if (!foodDay || foodDay > today) foodDay = today;
    MAC = macrosFor(foodDay);
    const list = dayFood(foodDay), t = sumFood(list), isToday = foodDay === today;
    const dayLbl = (isToday ? 'Oggi · ' : foodDay === dkey(new Date(Date.now() - DAY)) ? 'Ieri · ' : '') + fmt(kdate(foodDay), { weekday: 'long', day: 'numeric', month: 'long' });
    const meals = MEALS.map(([m, lbl]) => {
      const es = list.filter(e => e.m === m), st = sumFood(es);
      return `<section class="panel f-meal" id="meal-${m}"><div class="f-mh"><h3>${lbl}</h3>${es.length ? `<span>${n0(st.k)} kcal · P ${n0(st.p)} g</span>` : ''}</div>
        ${es.length ? `<ul class="f-list">${es.map(e => `<li><span class="f-n"><b>${esc(e.n)}</b><small>${n0(e.g)} g · P ${n1(e.p)} · C ${n1(e.c)} · G ${n1(e.f)}</small></span><em>${n0(e.k)}<small>kcal</small></em><button type="button" class="f-del" data-fdel="${esc(e.id)}" aria-label="Rimuovi ${esc(e.n)}">×</button></li>`).join('')}</ul>` : ''}
        ${runH('meal', m, foodDay, es)}
        ${foodAdd === m ? foodPickerHTML(m) : `<button type="button" class="f-add" data-fadd="${m}">+ Aggiungi a ${lbl.toLowerCase()}</button>`}
      </section>`;
    }).join('');
    return `<div class="dayhead"><div><div class="meta"><span class="chip gym">Alimentazione</span></div>
        <p class="big">Cibo</p><p class="sub">Cosa hai mangiato e i macro della giornata</p></div></div>
      <nav class="f-days" aria-label="Giorno"><button type="button" data-fday="-1" aria-label="Giorno prima">←</button><b>${dayLbl}</b><button type="button" data-fday="1" aria-label="Giorno dopo"${isToday ? ' disabled' : ''}>→</button></nav>
      ${foodTotalsHTML(t)}
      ${runH('food', foodDay, t)}
      ${isToday ? foodSuggestHTML(t) : ''}
      <div class="f-meals">${meals}</div>
      <p class="small f-note">Le calorie e i macro sono stime fatte con valori medi per 100 g. Per un prodotto confezionato è più preciso crearlo dall'etichetta. Obiettivi della tua scheda: ${n0(MAC.kcal[0])}–${n0(MAC.kcal[1])} kcal e ${n0(MAC.p[0])}–${n0(MAC.p[1])} g di proteine al giorno.</p>`;
  }
  function foodGrams() { const v = parseFloat(String((document.getElementById('f-g') || {}).value || '').replace(',', '.')); return isFinite(v) && v > 0 && v <= 3000 ? Math.round(v) : null; }
  function onFoodClick(e) {
    const t = e.target;
    const add = t.closest('[data-fadd]'); if (add) { foodAdd = add.dataset.fadd; foodPick = null; foodQ = ''; foodNew = false; route(true); const q = document.getElementById('f-q'); if (q) q.focus({ preventScroll: true }); document.getElementById('meal-' + foodAdd).scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); return true; }
    const sg = t.closest('[data-fsug]');
    if (sg) {
      const [id, g] = sg.dataset.fsug.split('|'), fd = foodById(id), meal = mealNow(), today = dkey(new Date());
      if (fd && +g > 0) {
        const list = dayFood(today).slice();
        list.push(Object.assign({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), m: meal, n: fd.n, g: +g }, forGrams(fd, +g)));
        setDayFood(today, list); buzz(); route(true);
        const box = document.getElementById('meal-' + meal); if (box) { box.classList.remove('saved'); void box.offsetWidth; box.classList.add('saved'); }
      }
      return true;
    }
    const pk = t.closest('[data-fpick]'); if (pk) { foodPick = pk.dataset.fpick; route(true); return true; }
    const fx = t.closest('[data-fx]');
    if (fx) { const a = fx.dataset.fx; if (a === 'close') { foodAdd = null; foodPick = null; foodNew = false; } if (a === 'back') { foodPick = null; foodNew = false; } if (a === 'new') foodNew = true; if (a === 'more') { sugShift++; buzz(); } route(true); return true; }
    const fg = t.closest('[data-fg]'); if (fg) { const i = document.getElementById('f-g'); i.value = fg.dataset.fg; updateFoodPrev(); buzz(); return true; }
    if (t.closest('#f-ok')) {
      const fd = foodById(foodPick), g = foodGrams();
      if (!fd || !g) { const i = document.getElementById('f-g'); if (i) { i.classList.add('bad'); i.focus(); } return true; }
      const list = dayFood(foodDay).slice(), v = forGrams(fd, g);
      list.push(Object.assign({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), m: foodAdd, n: fd.n, g }, v));
      setDayFood(foodDay, list);
      store.set('food-recent', [fd.id].concat(store.get('food-recent', []).filter(x => x !== fd.id)).slice(0, 12));
      const m = foodAdd; foodAdd = null; foodPick = null; buzz(); route(true);
      const box = document.getElementById('meal-' + m); if (box) { box.classList.remove('saved'); void box.offsetWidth; box.classList.add('saved'); }
      return true;
    }
    if (t.closest('#fn-save')) {
      const num = id => { const v = parseFloat(String(document.getElementById(id).value || '').replace(',', '.')); return isFinite(v) && v >= 0 ? v : null; };
      const n = document.getElementById('fn-n').value.trim(), k = num('fn-k'), p = num('fn-p'), c = num('fn-c'), f = num('fn-f'), g = num('fn-g');
      const err = document.getElementById('fn-err');
      if (!n || k == null || k > 950 || p == null || c == null || f == null || p + c + f > 100) { err.hidden = false; err.textContent = !n ? 'Scrivi il nome.' : 'Controlla i valori: kcal, proteine, carboidrati e grassi per 100 g.'; return true; }
      const fd = { id: 'c-' + Date.now().toString(36), n, k, p, c, f, g: g > 0 && g <= 2000 ? Math.round(g) : 100, u: g > 0 ? 'porzione' : '100 g', cat: 'I miei alimenti' };
      store.set('food-custom', [fd].concat(customFoods()).slice(0, 200));
      foodNew = false; foodPick = fd.id; buzz(); route(true); return true;
    }
    const del = t.closest('[data-fdel]');
    if (del) {
      if (del.dataset.confirm !== '1') { del.dataset.confirm = '1'; del.textContent = 'Togli'; del.classList.add('arm'); setTimeout(() => { if (del.isConnected) { del.dataset.confirm = ''; del.textContent = '×'; del.classList.remove('arm'); } }, 3500); return true; }
      setDayFood(foodDay, dayFood(foodDay).filter(x => x.id !== del.dataset.fdel)); buzz(); route(true); return true;
    }
    const fday = t.closest('[data-fday]');
    if (fday) { const d = new Date(kdate(foodDay).getTime() + (+fday.dataset.fday) * DAY + 12 * 3600000); foodDay = dkey(d); foodAdd = null; foodPick = null; route(true); return true; }
    return false;
  }
  function updateFoodPrev() {
    const fd = foodById(foodPick), g = foodGrams(), p = document.getElementById('f-prev');
    if (!p || !fd) return;
    if (!g) { p.textContent = 'Scrivi i grammi'; return; }
    const v = forGrams(fd, g); p.textContent = n0(v.k) + ' kcal · P ' + n1(v.p) + ' g · C ' + n1(v.c) + ' g · G ' + n1(v.f) + ' g';
  }

  /* ---------- Apple Watch: copia della scheda per i comandi rapidi, il calendario e i promemoria ---------- */
  function syncWatch() {
    const week = {};
    days().forEach(d => {
      week[d.id] = { label: d.label, title: d.title, type: d.type, dur: d.dur || '', md: d.md || '',
        items: (d.items || []).filter(it => it.link || (it.ex && EX[it.ex])).map(it => ({ u: it.uid, n: it.link ? 'Mobilità quotidiana' : EX[it.ex].name, s: it.s || '', per: it.per || '', r: it.r || '', note: it.note || '' })) };
    });
    const snap = { v: 1, prog: PROG.id, start: dkey(START), end: dkey(END), deload: Array.from({ length: WEEKS }, (x, i) => i + 1).filter(n => n % 4 === 0),
      tests: TEST_WEEKS.map(n => dkey(testDate(n))), matchday: MATCHDAY, week };
    if (JSON.stringify(store.get('watch', null)) !== JSON.stringify(snap)) store.set('watch', snap);
  }

  const LSW = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* niente */ } } };
  const codeKey = () => 'sf-wcode:' + (window.FitAccount.user() || '');
  let wInfo = null, wLoading = false, pushState = null, pushMsg = '', wMsg = '';
  const pushOK = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext;
  const API = (m, p, b) => window.FitAccount.api(m, p, b);
  async function loadWatchInfo() {
    if (wLoading) return; wLoading = true;
    try { wInfo = await API('GET', '/watch/code'); } catch (e) { wInfo = { error: e.message }; }
    try { pushState = await API('GET', '/push/state'); } catch (e) { pushState = { error: e.message }; }
    wLoading = false;
    if ((location.hash || '').slice(1) === 'watch') route(true);
  }
  const wUrl = (what, extra) => location.origin + '/api/w/' + what + '?k=' + (LSW.get(codeKey()) || 'IL-TUO-CODICE') + (extra || '');
  const urlBox = (lbl, u) => `<div class="wt-url"><span>${esc(lbl)}</span><code>${esc(u)}</code><button type="button" class="btn-ghost wt-copy" data-copy="${esc(u)}">Copia</button></div>`;
  const PUSH_LBL = { peso: ['Pesati', 'se non hai ancora segnato il peso'], allenamento: ['Allenamento di oggi', 'nei giorni di palestra, campo e partita'], vigilia: ['Vigilia della partita', 'la sera prima: niente fatica, carboidrati, sonno'], mobilita: ['Mobilità', 'i 10′ di ogni giorno'], cibo: ['Cosa hai mangiato', 'se oggi hai segnato meno di 3 alimenti'], riepilogo: ['Riepilogo della settimana', 'la domenica sera'] };
  function rings() {
    if (PROG.id === 'glutei') return [['Movimento', '350–450 kcal', 'calorie attive al giorno: abbastanza per stare bene, senza consumare il muscolo che stai costruendo'], ['Esercizio', '30 min', 'le 3 palestre lo superano da sole; negli altri giorni basta una camminata veloce'], ['In piedi', '10–12 ore', 'alzati e muoviti 1′ ogni ora: aiuta anche schiena e postura'], ['Passi', '7.000–9.000', 'nei giorni di riposo: camminata di 20–40′'], ['Battito', 'zona 2', 'nelle camminate e nel cardio leggero: respiri bene e riesci a parlare']];
    return [['Movimento', '700–850 kcal', 'calorie attive al giorno: con il deficit della dieta ti fa perdere grasso senza perdere esplosività'], ['Esercizio', '45–60 min', 'palestra e campo lo superano; nei giorni più leggeri basta la mobilità più 20′ di cyclette'], ['In piedi', '12 ore', 'il minimo per non stare fermo troppe ore'], ['Battito negli sprint', 'zona 4–5', 'nelle ripetute e nelle partenze; tra una e l\'altra recupera finché il battito scende in zona 2'], ['Recupero', 'FC a riposo', 'se al mattino è 5–7 battiti più alta del solito, oggi fai la seduta più leggera']];
  }
  function viewWatch() {
    if (!wInfo && !wLoading) loadWatchInfo();
    const code = LSW.get(codeKey()), host = location.host;
    const codeHTML = code ? `<div class="wt-code"><code id="wt-code">${esc(code)}</code><button type="button" class="sb-btn" data-copy="${esc(code)}">Copia</button></div>
        <p class="small">È la chiave dei tuoi comandi: chi ce l'ha può leggere la scheda e segnare esercizi e peso (non la password). Non condividerla.</p>
        <button type="button" class="btn-ghost" id="wt-new">Crea un codice nuovo</button>`
      : wInfo && wInfo.has ? `<p class="small">Hai già creato un codice il ${fmt(new Date(wInfo.created), { day: 'numeric', month: 'long' })}, ma non è su questo telefono. Puoi crearne uno nuovo: quello vecchio smette di funzionare e va cambiato nei comandi.</p><button type="button" class="sb-btn" id="wt-new">Crea un codice nuovo</button>`
      : `<p class="small">Serve una volta sola: lo incolli nei comandi rapidi e da lì l'orologio parla con starfit+.</p><button type="button" class="sb-btn" id="wt-make">Crea il codice</button>`;
    const ps = pushState || {}, prefs = ps.prefs || {};
    const subHere = LSW.get('sf-push:' + (window.FitAccount.user() || ''));
    const pushTop = !pushOK() ? '<p class="small wt-warn">Le notifiche funzionano solo dall\'app installata: apri starfit+ dall\'icona sulla schermata Home (iPhone con iOS 16.4 o successivo).</p>'
      : ps.ready === false ? '<p class="small wt-warn">Le notifiche non sono ancora attive sul server.</p>'
      : subHere ? '<p class="small wt-ok">Notifiche attive su questo telefono. Sull\'Apple Watch arrivano da sole quando l\'iPhone è bloccato.</p>'
      : '<p class="small">Tocca «Attiva» e consenti le notifiche. Sull\'Apple Watch arrivano da sole quando l\'iPhone è bloccato.</p>';
    const prefRows = Object.keys(PUSH_LBL).filter(k => k !== 'vigilia' || PROG.id === 'terzino').map(k => { const p = prefs[k] || {}; return `<label class="wt-pref"><input type="checkbox" data-pref="${k}"${p.on !== false ? ' checked' : ''}><span><b>${PUSH_LBL[k][0]}</b><small>${PUSH_LBL[k][1]}</small></span><input type="time" data-pref-at="${k}" min="06:30" max="23:00" step="900" value="${esc(p.at || '')}" aria-label="Orario: ${PUSH_LBL[k][0]}"></label>`; }).join('');
    const step = a => `<ol class="wt-steps">${a.map(x => `<li>${x}</li>`).join('')}</ol>`;
    const watchOn = 'Tocca <b>ⓘ</b> in basso e attiva <b>Mostra su Apple Watch</b>.';
    const newSc = 'Apri <b>Comandi</b> sull\'iPhone e tocca <b>+</b> per un nuovo comando.';
    return `<div class="dayhead"><div><div class="meta"><span class="chip act">Collegamenti</span></div>
        <p class="big">Apple Watch</p><p class="sub">Comandi rapidi, calendario e promemoria</p>
        <p class="goal">starfit+ non può stare dentro l'orologio, ma con <b>Comandi rapidi</b> (gratis, già sull'iPhone) lo usi dal polso: vedi la scheda, segni gli esercizi, fai partire il recupero e porti qui i dati del Watch.</p></div></div>
      ${wMsg ? `<p class="wt-msg">${esc(wMsg)}</p>` : ''}
      <section class="panel wt-sec"><h3>1 · Il tuo codice personale</h3>${wLoading && !wInfo ? '<p class="small">Carico…</p>' : codeHTML}</section>

      <section class="panel wt-sec"><h3>2 · I comandi per l'orologio</h3>
        <p class="small">Crea questi comandi una volta sola. Gli indirizzi qui sotto hanno già il tuo codice: tocca <b>Copia</b> e incollali.${code ? '' : ' <b>Prima crea il codice al punto 1.</b>'}</p>
        <details class="how"><summary>Scheda di oggi <span>sul polso</span></summary>
          <p class="small">Mostra l'allenamento del giorno con serie, recuperi e cosa hai già fatto.</p>
          ${urlBox('Indirizzo', wUrl('oggi'))}
          ${step([newSc, 'Aggiungi l\'azione <b>Ottieni contenuti dell\'URL</b> e incolla l\'indirizzo.', 'Aggiungi l\'azione <b>Mostra risultato</b>.', 'Tocca il nome in alto e chiamalo <b>Scheda di oggi</b>.', watchOn])}</details>
        <details class="how"><summary>Prossimo esercizio <span>con Fatto e recupero</span></summary>
          <p class="small">Ti dice l'esercizio da fare. Con <b>Fatto ✓</b> lo segni anche in starfit+, con <b>Recupero</b> parte il timer giusto sull'orologio.</p>
          ${urlBox('Prossimo', wUrl('prossimo'))}${urlBox('Fatto', wUrl('fatto'))}${urlBox('Recupero', wUrl('recupero'))}
          ${step([newSc, '<b>Ottieni contenuti dell\'URL</b> con l\'indirizzo <b>Prossimo</b>.', '<b>Scegli dal menu</b>: nella domanda inserisci la variabile <b>Contenuti dell\'URL</b>. Opzioni: <b>Fatto ✓</b>, <b>Recupero</b>, <b>Chiudi</b>.', 'Sotto <b>Fatto ✓</b>: <b>Ottieni contenuti dell\'URL</b> con l\'indirizzo <b>Fatto</b>, poi <b>Mostra risultato</b>.', 'Sotto <b>Recupero</b>: <b>Ottieni contenuti dell\'URL</b> con l\'indirizzo <b>Recupero</b>, poi <b>Avvia timer</b> e come durata inserisci <b>Contenuti dell\'URL</b> in <b>secondi</b>.', 'Chiamalo <b>Prossimo esercizio</b>. ' + watchOn])}
          <p class="small">Poi basta dire: <b>«Ehi Siri, prossimo esercizio»</b>.</p></details>
        <details class="how"><summary>Recupero veloce <span>senza codice</span></summary>
          ${step([newSc, '<b>Scegli dal menu</b> con le opzioni <b>60″</b>, <b>90″</b>, <b>2′</b>, <b>3′</b>.', 'Sotto ogni opzione aggiungi <b>Avvia timer</b> con 60, 90, 120 o 180 secondi.', 'Chiamalo <b>Recupero</b>. ' + watchOn])}
          <p class="small">Senza creare niente: <b>«Ehi Siri, timer 90 secondi»</b> dall'orologio.</p></details>
        <details class="how"><summary>Segna il peso <span>dal polso</span></summary>
          ${urlBox('Indirizzo', wUrl('peso', '&kg='))}
          ${step([newSc, '<b>Richiedi input</b>: tipo <b>Numero</b>, domanda «Peso di oggi (kg)».', '<b>Ottieni contenuti dell\'URL</b>: incolla l\'indirizzo e subito dopo <b>kg=</b> inserisci la variabile <b>Input fornito</b>.', '<b>Mostra risultato</b>.', 'Chiamalo <b>Segna peso</b>. ' + watchOn])}
          <p class="small">Il peso compare nel diario del peso, con la differenza rispetto a 7 giorni fa.</p></details>
        <details class="how"><summary>Dati del Watch in starfit+ <span>automatico ogni sera</span></summary>
          <p class="small">Ogni sera porta qui calorie attive, minuti di esercizio, passi e battito a riposo della giornata: li trovi nel diario dell'allenamento e nella pagina Cibo.</p>
          ${urlBox('Indirizzo', wUrl('attivita', '&kcal=A&min=B&passi=C&fcr=D'))}
          ${step(['In <b>Comandi</b> apri <b>Automazione</b> → <b>+</b> → <b>Ora del giorno</b>: 22:00, ogni giorno, <b>Esegui immediatamente</b>.', '<b>Trova campioni di Salute</b>: <b>Energia attiva</b>, data di inizio <b>oggi</b> → <b>Calcola statistiche</b>: <b>Somma</b>. È il valore A.', 'Ancora <b>Trova campioni di Salute</b>: <b>Minuti di esercizio</b>, oggi → <b>Somma</b>. È B.', 'Ancora: <b>Passi</b>, oggi → <b>Somma</b>. È C.', 'Ancora: <b>Frequenza cardiaca a riposo</b>, ordina per data dalla più recente, limite 1. È D.', '<b>Ottieni contenuti dell\'URL</b> con l\'indirizzo: al posto di A, B, C e D inserisci i quattro risultati.', 'La prima volta l\'iPhone chiede di leggere la Salute: consenti.'])}
          <p class="small">Se tra le automazioni trovi <b>Allenamento Apple Watch</b>, puoi usare anche «quando termino un allenamento».</p></details>
      </section>

      <section class="panel wt-sec"><h3>3 · Sul quadrante</h3>
        ${step(['Sull\'Apple Watch tieni premuto il quadrante e tocca <b>Modifica</b>.', 'Scorri fino alle complicazioni e tocca quella che vuoi cambiare.', 'Scegli <b>Comandi rapidi</b> → <b>Prossimo esercizio</b> (o <b>Recupero</b>).'])}
        <p class="small">Così ti basta un tocco sul quadrante per aprire l'esercizio o far partire il recupero.</p></section>

      <section class="panel wt-sec"><h3>4 · Calendario degli allenamenti</h3>
        <p class="small">Le sedute fino al ${fmt(END, { day: 'numeric', month: 'long' })} nel Calendario dell'iPhone, con test e settimane di scarico. L'Apple Watch ti avvisa 1 ora prima. L'orario è quello del promemoria «Allenamento di oggi» qui sotto; se sposti la partita al sabato si aggiorna da solo.</p>
        ${code ? `<a class="sb-btn wt-cal" href="webcal://${esc(host)}/api/w/calendario.ics?k=${esc(code)}">Iscriviti al calendario</a>${urlBox('Oppure copia', wUrl('calendario.ics'))}` : '<p class="small"><b>Prima crea il codice al punto 1.</b></p>'}
        <p class="small">Se l'avviso non arriva: Impostazioni → Calendario → Account → Calendari sottoscritti → starfit+ → disattiva <b>Rimuovi avvisi</b>.</p></section>

      <section class="panel wt-sec"><h3>5 · Promemoria</h3>
        ${pushTop}${pushMsg ? `<p class="wt-msg">${esc(pushMsg)}</p>` : ''}
        <div class="wt-prefs">${prefRows}</div>
        <p class="small">Orari tra le 6:30 e le 23:00: di notte i promemoria sono in pausa.</p>
        <div class="f-act">${pushOK() ? (subHere ? '<button type="button" class="sb-btn" id="push-test">Manda una prova</button><button type="button" class="btn-ghost" id="push-off">Disattiva su questo telefono</button>' : '<button type="button" class="sb-btn" id="push-on">Attiva le notifiche</button>') : ''}</div></section>

      ${runH('watch')}
      <section class="panel wt-sec"><h3>6 · Con Siri</h3>
        <ul class="list"><li>«Ehi Siri, <b>prossimo esercizio</b>» · «Ehi Siri, <b>scheda di oggi</b>»</li><li>«Ehi Siri, <b>segna peso</b>»</li><li>«Ehi Siri, <b>timer 90 secondi</b>»: funziona subito, senza comandi</li><li>«Ehi Siri, <b>avvia allenamento forza</b>»: il Watch registra battito e calorie della seduta</li></ul></section>

      <section class="panel wt-sec"><h3>7 · Anelli e battito per la tua scheda</h3>
        <div class="wt-rings">${rings().map(r => `<div class="wt-ring"><b>${esc(r[1])}</b><span>${esc(r[0])}</span><p>${esc(r[2])}</p></div>`).join('')}</div>
        <p class="small">Gli obiettivi degli anelli si cambiano dall'app Fitness sull'iPhone: tocca il tuo profilo e poi <b>Cambia obiettivi</b>.</p></section>`;
  }
  function watchActLine(dk) {
    const a = (store.get('watchAct', {}) || {})[dk];
    if (!a) return '';
    const parts = [a.kcal != null ? n0(a.kcal) + ' kcal attive' : '', a.min != null ? a.min + ' min di esercizio' : '', a.passi != null ? n0(a.passi) + ' passi' : '', a.fcr != null ? 'FC a riposo ' + a.fcr : '', a.sonno != null ? 'sonno ' + String(Math.round(a.sonno * 10) / 10).replace('.', ',') + ' h' : ''].filter(Boolean);
    return parts.length ? `<p class="wt-act">⌚ <b>Apple Watch</b> · ${parts.join(' · ')}</p>` : '';
  }
  async function copyText(t, btn) {
    try { await navigator.clipboard.writeText(t); } catch (e) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (x) { /* niente */ } ta.remove(); }
    if (btn) { const o = btn.textContent; btn.textContent = 'Copiato ✓'; setTimeout(() => { if (btn.isConnected) btn.textContent = o; }, 1600); }
  }
  const b64u = s => { const p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };
  function prefsFromPage() {
    const o = {};
    document.querySelectorAll('[data-pref]').forEach(c => { o[c.dataset.pref] = { on: c.checked, at: (document.querySelector('[data-pref-at="' + c.dataset.pref + '"]') || {}).value || '' }; });
    if (PROG.id !== 'terzino') o.vigilia = { on: false, at: '20:30' };
    return o;
  }
  let prefTimer = 0;
  async function onWatchClick(e) {
    const t = e.target;
    const cp = t.closest('[data-copy]'); if (cp) { copyText(cp.dataset.copy, cp); return true; }
    if (t.closest('#wt-make') || t.closest('#wt-new')) {
      const b = t.closest('#wt-make, #wt-new');
      if (b.id === 'wt-new' && b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Sicuro? Il vecchio codice smette di funzionare'; setTimeout(() => { if (b.isConnected) { b.dataset.confirm = ''; b.textContent = 'Crea un codice nuovo'; } }, 4000); return true; }
      b.disabled = true;
      try { const r = await API('POST', '/watch/code'); LSW.set(codeKey(), r.code); wInfo = { has: true, created: Date.now() }; wMsg = 'Codice creato. Ora crea i comandi qui sotto.'; buzz(); }
      catch (x) { wMsg = 'Non riesco a creare il codice: ' + x.message; }
      route(true); return true;
    }
    if (t.closest('#push-on')) {
      pushMsg = '';
      try {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') { pushMsg = 'Notifiche non consentite. Puoi attivarle in Impostazioni → Notifiche → starfit+.'; route(true); return true; }
        const reg = await navigator.serviceWorker.ready, { key } = await API('GET', '/push/key');
        let sub = await reg.pushManager.getSubscription();
        if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(key) });
        await API('POST', '/push/sub', { sub: sub.toJSON(), prefs: prefsFromPage() });
        LSW.set('sf-push:' + window.FitAccount.user(), sub.endpoint); pushMsg = 'Fatto: le notifiche sono attive.'; buzz();
        pushState = await API('GET', '/push/state');
      } catch (x) { pushMsg = 'Non riesco ad attivarle: ' + (x.message || x); }
      route(true); return true;
    }
    if (t.closest('#push-test')) { try { await API('POST', '/push/test'); pushMsg = 'Inviata: tra qualche secondo arriva la notifica.'; } catch (x) { pushMsg = x.message; } route(true); return true; }
    if (t.closest('#push-off')) {
      try { const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription(); if (sub) { await API('POST', '/push/off', { endpoint: sub.endpoint }); await sub.unsubscribe(); } } catch (x) { /* niente */ }
      LSW.set('sf-push:' + window.FitAccount.user(), null); pushMsg = 'Notifiche disattivate su questo telefono.'; route(true); return true;
    }
    return false;
  }
  function onPrefChange() {
    clearTimeout(prefTimer);
    prefTimer = setTimeout(async () => { try { const r = await API('POST', '/push/prefs', { prefs: prefsFromPage() }); pushState = Object.assign({}, pushState, { prefs: r.prefs }); } catch (x) { /* riprova alla prossima modifica */ } }, 500);
  }

  /* ---------- viste ---------- */
  /* Dati in alto nella home: quelli della scheda, oppure quelli cambiati da te (store "profile") */
  function heroStats() {
    const p = store.get('profile', {}) || {}, st = PROG.stats;
    const lw = lastWeight();
    return [
      { v: p.altezza || st[0][0], l: 'Altezza' },
      { v: lw ? kg(lw[1]) + ' kg' : (p.peso || st[1][0]), l: lw ? 'Ultimo peso' : 'Peso' },
      { v: p.obiettivo || st[2][0], l: p.obiettivo ? 'Obiettivo' : st[2][1], hot: true },
      { v: fmt(END, { day: 'numeric', month: 'short', year: 'numeric' }), l: 'Traguardo' }
    ];
  }
  function heroHTML() {
    return `<section class="hero"><div class="wrap">
      <div class="stats">${heroStats().map(x => `<div class="stat${x.hot ? ' hot' : ''}"><b>${esc(x.v)}</b><span>${esc(x.l)}</span></div>`).join('')}</div>
    </div></section>`;
  }
  // Pagina Profilo (menu dell'account): i dati che si vedono in alto nella home
  function viewProfile() {
    const p = store.get('profile', {}) || {}, st = PROG.stats, lw = lastWeight();
    return `<div class="dayhead"><div><div class="meta"><span class="chip act">Account</span></div>
        <p class="big">Profilo</p><p class="sub">${esc(window.FitAccount.user() || '')} · ${esc(PROG.name)}</p>
        <p class="goal">Questi dati compaiono in alto nella home. Cambiali quando vuoi.</p></div></div>
      <form class="panel dark hero-ed" id="hero-ed" autocomplete="off">
        <label>Altezza<input id="he-alt" value="${esc(p.altezza || st[0][0])}" placeholder="${esc(st[0][0])}" maxlength="12"></label>
        <label>Peso di oggi (kg)<input id="he-peso" inputmode="decimal" value="${lw ? esc(kg(lw[1])) : ''}" placeholder="${esc(st[1][0])}"></label>
        <label class="wide">Il tuo obiettivo<input id="he-ob" value="${esc(p.obiettivo || '')}" placeholder="${esc(PROG.id === 'terzino' ? 'Es. 80 kg' : 'Es. glutei più forti')}" maxlength="24"></label>
        <p class="hero-ed-n">Li vedi in alto nella pagina Io. Il peso va anche nel diario del peso. Il traguardo (${fmt(END, { day: 'numeric', month: 'long', year: 'numeric' })}) segue il calendario delle 12 settimane.</p>
        <div class="hero-ed-a"><button type="submit" class="sb-btn">Salva</button><button type="button" class="btn-ghost" id="he-reset">Ripristina i dati della scheda</button></div>
        ${profMsg ? `<p class="hero-ed-ok">${esc(profMsg)}</p>` : ''}
      </form>`;
  }
  let profMsg = '';
  function onHeroClick(e) {
    if (e.target.closest('#he-reset')) { store.set('profile', {}); profMsg = 'Ripristinati i dati della scheda.'; buzz(); route(true); return true; }
    return false;
  }
  function onHeroSubmit(e) {
    if (!e.target || e.target.id !== 'hero-ed') return false;
    e.preventDefault();
    const val = id => (document.getElementById(id).value || '').trim().slice(0, 20);
    const p = { altezza: val('he-alt'), obiettivo: val('he-ob') };
    Object.keys(p).forEach(k => { if (!p[k]) delete p[k]; });
    store.set('profile', p);
    const w = parseKg(val('he-peso')); if (w != null) setWeight(dkey(new Date()), w);
    profMsg = 'Salvato ✓ Lo vedi in alto nella pagina Io.'; buzz(); route(true);
    return true;
  }

  /* Avviso per installare l'app sull'iPhone (solo in Safari, non nell'app già installata) */
  const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = () => navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  function installHTML() {
    if (!isIOS() || isStandalone() || store.get('install-ok', false)) return '';
    const share = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Condividi"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
    return `<section class="sec install" id="install"><b>Installa l'app sull'iPhone</b>
      <ol><li>Tocca ${share} <span>Condividi</span> nella barra di Safari</li><li>Scegli <span>Aggiungi alla schermata Home</span></li><li>Apri starfit+ dall'icona: si avvia a tutto schermo su Oggi</li></ol>
      <button type="button" class="btn-ghost" id="install-ok">Ho capito</button></section>`;
  }

  function todayHTML() {
    const d = dayById(TODAY_ID()), pr = dayProgress(d), cw = currentWeek();
    const when = cw === 0 ? `Si parte lunedì ${fmt(START, { day: 'numeric', month: 'long' })} · intanto prova la scheda` : cw <= WEEKS ? `Settimana ${cw} di ${WEEKS}${cw % 4 === 0 ? ' · scarico' : ''}` : 'Programma completato';
    const cta = d.type === 'gym' || d.type === 'act' ? 'Inizia l\'allenamento' : d.type === 'rest' ? 'Vedi la giornata' : 'Vedi i consigli';
    return `<a class="today-card" href="#${d.id}">
      <span class="tc-top"><span class="tc-k">Oggi · ${d.d}</span><span class="md">${d.md}</span></span>
      <span class="tc-t">${esc(d.title)}</span>
      <span class="tc-m"><span class="chip ${TYPE_CHIP[d.type]}">${esc(d.label)}</span>${d.dur ? `<span>${d.dur}</span>` : ''}${pr.tot ? `<span>${pr.n}/${pr.tot} esercizi fatti</span>` : ''}</span>
      <span class="tc-w">${when}</span>
      <span class="tc-cta">${cta} <b>→</b></span>
    </a>`;
  }

  function matchPickHTML() {
    if (!MATCHDAY) return '';
    return `<div class="mday"><span class="mday-k">Partita</span><div class="mday-sw" role="group" aria-label="Giorno della partita">${Object.keys(PROG0.layouts).map(k =>
      `<button type="button" data-matchday="${k}" aria-pressed="${k === MATCHDAY}">${esc(PROG0.layouts[k].matchLabel)}</button>`).join('')}</div>
      <span class="mday-h">${MATCHDAY === 'dom' ? 'Giochi di sabato? Tocca Sabato: la settimana si riorganizza da sola.' : 'Settimana riorganizzata per la partita di sabato.'}</span></div>`;
  }
  const homeSlot = f => { if (f.slot) return f.slot; const t = String(f); return /readyHTML/.test(t) ? 'top' : /waterHTML/.test(t) ? 'duo' : /homeBlockHTML/.test(t) ? 'mid' : 'more'; };
  const homeRank = f => { if (f.rank != null) return f.rank; const t = String(f); return /weekHTML/.test(t) ? 0 : /sfHTML/.test(t) ? 1 : 2; };
  const homeH = slot => HK.home.filter(f => homeSlot(f) === slot).sort((a, b) => homeRank(a) - homeRank(b)).map(f => { try { return f() || ''; } catch (e) { console.error('starfit+ home', e); return ''; } }).join('');
  // OGGI: solo la giornata
  function viewToday() {
    const u = window.FitAccount.user() || '', name = u.charAt(0).toUpperCase() + u.slice(1), cw = currentWeek();
    const t = sumFood(dayFood(dkey(new Date()))), mac = macrosFor(dkey(new Date()));
    const foodCard = `<a class="sec panel oggi-food" href="#cibo"><div><b>Cibo di oggi</b><span>${t.k ? n0(t.k) + ' kcal su ' + n0(mac.kcal[0]) + ' · proteine ' + n0(t.p) + ' / ' + n0(mac.p[0]) + ' g' : 'Ancora niente segnato · obiettivo ' + n0(mac.kcal[0]) + ' kcal'}</span></div><em>Apri →</em></a>`;
    return installHTML() + `<header class="oggi-h"><p class="oggi-k">${esc(fmt(new Date(), { weekday: 'long', day: 'numeric', month: 'long' }))}${cw >= 1 && cw <= WEEKS ? ' · settimana ' + cw + ' di ' + WEEKS : ''}</p><h1 class="oggi-t">Ciao ${esc(name)}</h1></header>
      <section class="sec">${todayHTML()}</section>${homeH('top')}<div class="sec home-duo">${weightHTML('home')}${homeH('duo')}</div>${foodCard}${homeH('mid')}`;
  }
  // IO: i tuoi progressi e le impostazioni
  function viewIo() {
    const more = homeH('more');
    const row = (href, t, d) => `<a class="mob-link" href="${href}"><div><b>${t}</b><br><span>${d}</span></div><em>Apri →</em></a>`;
    return `<div class="dayhead"><div><div class="meta"><span class="chip act">Io</span></div><p class="big">I tuoi progressi</p><p class="sub">Costanza, riepilogo, sfida e impostazioni</p></div></div>
      ${more}
      <h2 class="home-h">La tua scheda</h2>
      ${row('#piano', 'Piano e dieta', 'Diario del peso, test, calorie e regole')}
      <h2 class="home-h">Impostazioni</h2>
      ${row('#profilo', 'Profilo', 'Altezza, peso e obiettivo in alto')}${row('#watch', 'Apple Watch e promemoria', 'Scheda sul polso, calendario, notifiche')}`;
  }
  // ALLENAMENTO: la settimana, il calendario, gli esercizi
  function viewHome() {
    const todayId = TODAY_ID();
    const tiles = days().map(d => {
      const pr = dayProgress(d);
      return `<a class="day-tile${d.id === todayId ? ' today' : ''}" href="#${d.id}">
        ${d.id === todayId ? '<span class="today-tag">Oggi</span>' : ''}
        <span class="md">${d.md}</span><span class="dn">${d.d}</span>
        <span class="chip ${TYPE_CHIP[d.type]}">${esc(d.label)}</span>
        <span class="tt">${esc(d.title)}</span>
        ${pr.tot ? `<span class="prog"><i style="width:${Math.round(pr.n / pr.tot * 100)}%"></i></span><span class="prog-l">${pr.n}/${pr.tot} fatti</span>` : '<span class="prog-l">Mobilità 10′</span>'}
      </a>`;
    }).join('');
    return `<div class="dayhead"><div><div class="meta"><span class="chip gym">Allenamento</span></div><p class="big">La settimana</p><p class="sub">${esc(PROG.name)}</p></div></div>` + `<section class="sec"><div class="sec-h"><h2>Giorni</h2><button class="btn-ghost" type="button" id="reset">Azzera la settimana</button></div>
      ${matchPickHTML()}<div class="week">${tiles}</div></section>
      <section class="sec quick">
        <a href="#esercizi"><b>Tutti gli esercizi</b><span>${n0(Object.keys(EX).length)} con video</span></a>
        <a href="#mobilita"><b>Mobilità</b><span>10′ ogni giorno</span></a>
      </section>` + calendarHTML() + `
      <section class="sec"><div class="pillars">${PROG.pillars.map(p => `<div class="pillar"><h3>${esc(p[0])} <span>${esc(p[1])}</span></h3><p>${esc(p[2])}</p></div>`).join('')}</div></section>
      <p class="note">${PROG.note}</p>`;
  }

  function dayStrip(cur) {
    const t = TODAY_ID();
    return `<nav class="daystrip" aria-label="Giorni">${days().map(d => `<a href="#${d.id}" class="ds-${d.type}${d.id === t ? ' is-today' : ''}"${d.id === cur ? ' aria-current="page"' : ''}><b>${d.d.slice(0, 3)}</b><i></i></a>`).join('')}</nav>`;
  }
  function dayPager(d) {
    const all = days(), i = all.findIndex(x => x.id === d.id), p = all[(i + 6) % 7], n = all[(i + 1) % 7];
    return `<nav class="pager" aria-label="Giorno precedente e successivo"><a href="#${p.id}"><span>← ${p.d}</span><b>${esc(p.label)}</b></a><a href="#${n.id}" class="nx"><span>${n.d} →</span><b>${esc(n.label)}</b></a></nav>`;
  }
  function viewDay(d) {
    if (editing === d.id) return dayStrip(d.id) + viewEdit(d);
    return dayStrip(d.id) + viewDayBody(d) + diaryHTML(d) + dayPager(d);
  }
  function viewDayBody(d) {
    const pr = dayProgress(d);
    let html = `<div class="dayhead"><div>
        <div class="meta"><span class="chip ${TYPE_CHIP[d.type]}">${esc(d.label)}</span><span class="md">${d.md}</span></div>
        <p class="big">${d.d}</p><p class="sub">${esc(d.title)}</p>${d.goal ? `<p class="goal">${esc(d.goal)}</p>` : ''}</div>
        ${d.dur ? `<div class="dur"><b>${d.dur}</b><span>Durata</span></div>` : ''}</div>`;
    if (d.type !== 'act') html += `<a class="mob-link" href="#mobilita"><div><b>Mobilità quotidiana · 10′</b><br><span>${MOB.length} esercizi di mobilità, anche a casa</span></div><em>Apri →</em></a>`;
    html += runH('dayTop', d);
    if (d.id === TODAY_ID()) html += weightHTML(true);
    const hasSets = (d.items || []).some(it => it.ex && (parseRest(it.r) || parseSets(it.s)));
    html += `<div class="edit-bar">${hasSets ? '<button type="button" class="ed-open timer-open">⏱ Recupero</button>' : ''}<button type="button" class="ed-open" id="ed-open">✎ Modifica esercizi</button>${d.custom ? '<span class="ed-flag">Scheda personalizzata</span>' : ''}</div>`;
    const tips = PROG.tips && PROG.tips[d.type];
    if (tips) {
      html += `<div class="tips">${tips.map(t => `<div class="tip"><b>${esc(t[0])}</b><p>${esc(t[1])}</p></div>`).join('')}</div>`;
      if (!d.items.length) return html;
    }
    const blocks = [['warm', 'Riscaldamento'], ['main', d.type === 'act' ? 'Attivazione' : 'Lavoro principale'], ['end', 'Finale']];
    blocks.forEach(([b, lbl]) => {
      const its = (d.items || []).map((it, i) => ({ it, i })).filter(x => x.it.b === b);
      if (!its.length) return;
      html += `<h3 class="block-h">${lbl}</h3><div class="grid">`;
      its.forEach(({ it, i }) => {
        if (it.link) html += `<a class="mob-link" href="#mobilita" style="margin:0"><div><b>Mobilità quotidiana · ${esc(it.s)}</b><br><span>La stessa routine di ogni giorno</span></div><em>Apri →</em></a>`;
        else if (EX[it.ex]) html += card(it.ex, HK.item.reduce((x, f) => { try { return f(x, d) || x; } catch (e) { return x; } }, it), it.uid);
      });
      html += `</div>`;
    });
    return html;
  }

  function viewMob() {
    return `<div class="dayhead"><div><div class="meta"><span class="chip act">Ogni giorno</span></div>
      <p class="big">Mobilità</p><p class="sub">Anche e schiena più libere, meno rigidità</p>
      <p class="goal">Dieci minuti, anche a casa, anche la sera davanti alla TV. Fai gli esercizi in quest'ordine.</p></div>
      <div class="dur"><b>10′</b><span>Ogni giorno</span></div></div>
      <div class="grid">${MOB.map(m => card(m.ex, { s: m.s, hold: m.hold })).join('')}</div>`;
  }

  let libFilter = 'Per te', libQuery = '', libShown = 24;
  const CAT_ORDER = {
    terzino: ['Velocità', 'Agilità', 'Pliometria', 'Potenza', 'Gambe', 'Femorali', 'Glutei', 'Contrasti', 'Petto e spalle', 'Schiena', 'Braccia', 'Core', 'Prevenzione', 'Attivazione', 'Riscaldamento', 'Mobilità', 'Stretching', 'Cardio', 'Recupero'],
    glutei: ['Glutei', 'Gambe', 'Femorali', 'Core', 'Schiena', 'Petto e spalle', 'Braccia', 'Mobilità', 'Stretching', 'Cardio', 'Riscaldamento', 'Attivazione', 'Prevenzione', 'Recupero', 'Velocità', 'Agilità', 'Pliometria', 'Potenza', 'Contrasti']
  };
  const catRank = c => { const o = CAT_ORDER[PROG.id] || CAT_ORDER.terzino, i = o.indexOf(c); return i < 0 ? 99 : i; };
  const forMe = e => !e.per || e.per.includes(PROG.id);
  const exText = (id, e) => fold([e.name, e.cat, e.eq || '', e.mus.join(' '), id.replace(/-/g, ' ')].join(' '));
  const nameHits = (id, words) => { const n = fold(EX[id].name + " " + EX[id].cat); return words.reduce((t, x) => t + (n.includes(x) ? 1 : 0), 0); };
  function libMatches() {
    const used = new Set(); days().forEach(d => (d.items || []).forEach(it => it.ex && used.add(it.ex))); MOB.forEach(m => used.add(m.ex));
    const words = fold(libQuery).split(/\s+/).filter(Boolean);
    return Object.keys(EX).filter(id => {
      const e = EX[id];
      if (libFilter === 'Per te' && !forMe(e)) return false;
      if (libFilter !== 'Per te' && libFilter !== 'Tutti' && e.cat !== libFilter) return false;
      if (words.length) { const t = exText(id, e); if (!words.every(x => t.includes(x))) return false; }
      return true;
    }).sort((a, b) => (words.length ? nameHits(b, words) - nameHits(a, words) : 0) || (used.has(b) - used.has(a)) || (catRank(EX[a].cat) - catRank(EX[b].cat)) || ((EX[a].lvl || 1) - (EX[b].lvl || 1)) || EX[a].name.localeCompare(EX[b].name, 'it'));
  }
  function viewLib() {
    const all = Object.values(EX), mine = all.filter(forMe).length;
    const cats = [...new Set(all.map(e => e.cat))].sort((a, b) => catRank(a) - catRank(b));
    return `<div class="sec-h"><div><h2>Tutti gli esercizi</h2><p class="kicker">${n0(all.length)} esercizi, ${n0(mine)} adatti alla tua scheda. Cerca per nome, muscolo o attrezzo.</p></div></div>
      <div class="filters"><input class="search" id="q" type="search" placeholder="Es. glutei elastico, sprint, femorali" value="${esc(libQuery)}" autocomplete="off">
      <div class="fchips">${['Per te', 'Tutti'].concat(cats).map(c => `<button class="fchip" type="button" data-cat="${esc(c)}" aria-pressed="${c === libFilter}">${esc(c)}</button>`).join('')}</div></div>
      <p class="lib-count" id="lib-count"></p>
      <div class="grid" id="lib"></div>
      <button type="button" class="btn-ghost lib-more" id="lib-more" hidden></button>
      <p class="empty" id="none" hidden>Nessun esercizio trovato. Prova con un'altra parola o scegli «Tutti».</p>`;
  }
  function applyLib() {
    const box = document.getElementById('lib'); if (!box) return;
    const list = libMatches(), show = list.slice(0, libShown);
    unmount(box);
    box.innerHTML = show.map(id => card(id)).join('');
    mountFigures(box);
    const more = document.getElementById('lib-more'), rest = list.length - show.length;
    more.hidden = rest <= 0; more.textContent = 'Mostra altri ' + Math.min(24, rest) + ' (ne restano ' + n0(rest) + ')';
    document.getElementById('lib-count').textContent = list.length ? n0(list.length) + (list.length === 1 ? ' esercizio' : ' esercizi') : '';
    document.getElementById('none').hidden = list.length > 0;
  }

  function viewPlan() {
    const tests = store.get('tests', {});
    const rows = TEST_WEEKS.map((n, i) => (i === 0 ? 'Inizio' : 'Settimana ' + n) + ' · ' + fmt(testDate(n), { weekday: 'short', day: 'numeric', month: 'short' }));
    const PL = PROG.plan, colsT = PL.tests;
    return `<div class="sec-h"><div><h2>Piano e alimentazione</h2><p class="kicker">${esc(PL.intro)}</p></div></div>
    ${runH('plan')}
    <a class="mob-link wt-link" href="#watch"><div><b>⌚ Apple Watch e promemoria</b><br><span>Scheda sul polso, calendario, notifiche</span></div><em>Apri →</em></a>
    <div class="cols sec">
      <div class="panel dark"><h3>Blocchi da 4 settimane</h3>
        <div class="bars">
          <div class="bar"><span>${esc(PL.bars[0])}</span><i style="height:68%"></i></div>
          <div class="bar"><span>${esc(PL.bars[1])}</span><i style="height:78%"></i></div>
          <div class="bar peak"><span>${esc(PL.bars[2])}</span><i style="height:88%"></i></div>
          <div class="bar low"><span>Scarico</span><i style="height:40%"></i></div>
        </div>
        <div class="bar-l"><span>Sett. 1</span><span>Sett. 2</span><span>Sett. 3</span><span>Sett. 4</span></div>
        <p class="small">${esc(PL.progress)}</p>
        <p class="small">Blocco 1: ${fmt(weekStart(1))} – ${fmt(new Date(weekStart(5) - DAY))} · Blocco 2: ${fmt(weekStart(5))} – ${fmt(new Date(weekStart(9) - DAY))} · Blocco 3: ${fmt(weekStart(9))} – ${fmt(END)}</p>
      </div>
      <div class="panel"><h3>Alimentazione</h3>
        <div class="nums">${PL.nums.map(x => `<div class="num${x[2] ? ' hot' : ''}"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div>`).join('')}</div>
        <ul class="list">${PL.list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>
    </div>
    ${weightLogHTML()}
    <section class="sec panel"><h3>Registro test (ogni 4 settimane)</h3>
      <div class="tablebox"><table><thead><tr><th>Quando</th>${colsT.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>
      ${rows.map((r, ri) => `<tr><th scope="row">${r}</th>${colsT.map((c, ci) => `<td><input id="t-${ri}-${ci}" inputmode="decimal" aria-label="${r}: ${c}" value="${esc(tests[ri + '-' + ci] || '')}"></td>`).join('')}</tr>`).join('')}
      </tbody></table></div>
      <p class="small">${esc(PL.testHint)} I valori sono salvati nel tuo account.</p>
    </section>
    <section class="sec panel dark"><h3>Regole d'oro</h3>
      <ol class="rules">${PL.rules.map(x => `<li><span>${x}</span></li>`).join('')}</ol>
    </section>`;
  }

  /* ---------- modifica esercizi ---------- */
  let editing = null;
  const BLOCKS = d => [['warm', 'Riscaldamento'], ['main', d.type === 'act' ? 'Attivazione' : 'Principale'], ['end', 'Finale']];
  function normRest(v) {
    v = String(v || '').trim().replace(/'/g, '′').replace(/"/g, '″');
    if (!v) return '';
    if (/^\d+$/.test(v)) { const n = +v; return n < 10 ? n + '′' : n >= 60 ? Math.floor(n / 60) + '′' + (n % 60 ? String(n % 60).padStart(2, '0') + '″' : '') : n + '″'; }
    return v.replace(/\s*min$/i, '′').replace(/(\d)\s*s(ec)?$/i, '$1″');
  }
  function normSets(v) { return String(v || '').trim().replace(/\s*[xX*]\s*/, ' × '); }
  function editItems(d) { return JSON.parse(JSON.stringify(d.items || [])); }
  function saveItems(dayId, items) { const plan = store.get('plan', {}); plan[dayId] = items; store.set('plan', plan); }
  // Elenco degli esercizi da aggiungere: prima quelli adatti alla scheda, al massimo 250 risultati
  function edOpts(q) {
    const words = fold(q || '').split(/\s+/).filter(Boolean);
    const ids = Object.keys(EX).filter(id => (words.length ? words.every(x => exText(id, EX[id]).includes(x)) : forMe(EX[id])))
      .sort((a, b) => (catRank(EX[a].cat) - catRank(EX[b].cat)) || EX[a].name.localeCompare(EX[b].name, 'it')).slice(0, 250);
    if (!ids.length) return '<option value="" disabled selected>Nessun esercizio trovato</option>';
    const by = {}; ids.forEach(id => (by[EX[id].cat] = by[EX[id].cat] || []).push(id));
    return Object.keys(by).map(c => `<optgroup label="${esc(c)}">${by[c].map(id => `<option value="${id}">${esc(EX[id].name)}</option>`).join('')}</optgroup>`).join('');
  }
  function viewEdit(d) {
    const items = d.items || [], bl = BLOCKS(d);
    const opt = (val, cur) => `<option value="${val[0]}"${val[0] === cur ? ' selected' : ''}>${val[1]}</option>`;
    const rows = items.map((it, i) => {
      const title = it.link ? 'Mobilità quotidiana' : (EX[it.ex] ? EX[it.ex].name : it.ex);
      const u = esc(it.uid);
      return `<li class="ed-row" data-i="${i}">
        <div class="ed-h"><span class="ed-n">${i + 1}</span><b>${esc(title)}</b>
          <span class="ed-mv"><button type="button" data-ed="up" aria-label="Sposta su"${i === 0 ? ' disabled' : ''}>↑</button><button type="button" data-ed="down" aria-label="Sposta giù"${i === items.length - 1 ? ' disabled' : ''}>↓</button><button type="button" data-ed="del" class="ed-del" aria-label="Rimuovi ${esc(title)}">Rimuovi</button></span></div>
        <div class="ed-f">
          <label>Serie × ripetizioni<input id="ed-s-${u}" data-f="s" value="${esc(it.s || '')}" placeholder="3 × 10" autocomplete="off"></label>
          ${it.link ? '' : `<label>Recupero<input id="ed-r-${u}" data-f="r" value="${esc(it.r || '')}" placeholder="90″ o 2′" autocomplete="off"></label>
          <label>Dettaglio<input id="ed-p-${u}" data-f="per" value="${esc(it.per || '')}" placeholder="per lato" autocomplete="off"></label>`}
          <label>Parte<select id="ed-b-${u}" data-f="b">${bl.map(x => opt(x, it.b)).join('')}</select></label>
          ${it.link ? '' : `<label class="wide">Nota<input id="ed-n-${u}" data-f="note" value="${esc(it.note || '')}" placeholder="Facoltativa" autocomplete="off"></label>`}
        </div></li>`;
    }).join('');
    const opts = edOpts('');
    return `<div class="dayhead"><div><div class="meta"><span class="chip ${TYPE_CHIP[d.type]}">${esc(d.label)}</span><span class="md">${d.md}</span></div>
        <p class="big">${d.d}</p><p class="sub">Modifica esercizi</p>
        <p class="goal">Cambia serie, recupero e note, sposta o togli gli esercizi e aggiungine di nuovi. Ogni modifica si salva da sola nel tuo account.</p></div></div>
      <ol class="ed-list" id="ed-list" data-day="${d.id}">${rows || '<li class="ed-empty">Nessun esercizio in questo giorno. Aggiungine uno qui sotto.</li>'}</ol>
      <section class="panel ed-add"><h3>Aggiungi un esercizio</h3>
        <div class="ed-f">
          <label class="wide">Cerca<input id="ed-add-q" type="search" autocomplete="off" placeholder="Nome, muscolo o attrezzo"></label>
          <label class="wide">Esercizio<select id="ed-add-ex">${opts}</select></label>
          <label>Parte<select id="ed-add-b">${bl.map(x => opt(x, 'main')).join('')}</select></label>
          <label>Serie × ripetizioni<input id="ed-add-s" value="3 × 10" autocomplete="off"></label>
          <label>Recupero<input id="ed-add-r" value="60″" autocomplete="off"></label>
        </div>
        <button type="button" class="sb-btn ed-add-go" id="ed-add-go">+ Aggiungi a ${esc(d.d)}</button>
      </section>
      <div class="ed-foot"><button type="button" class="tc-cta ed-done" id="ed-done">Fatto, torna al giorno <b>→</b></button>
        ${d.custom ? '<button type="button" class="btn-ghost" id="ed-reset">Ripristina la scheda originale</button>' : ''}</div>`;
  }
  function onEditChange(t) {
    const row = t.closest('.ed-row'), list = t.closest('#ed-list');
    if (!row || !list) return;
    const d = dayById(list.dataset.day), items = editItems(d), it = items[+row.dataset.i], f = t.dataset.f;
    let v = t.value;
    if (f === 'r') v = normRest(v);
    if (f === 's') v = normSets(v);
    if (v) it[f] = v; else delete it[f];
    if (f === 'r' || f === 's') t.value = v;
    saveItems(d.pk, items);
    flashSaved(row);
  }
  function flashSaved(row) { row.classList.remove('saved'); void row.offsetWidth; row.classList.add('saved'); }
  function onEditClick(e) {
    const b = e.target.closest('[data-ed]');
    if (b) {
      const list = b.closest('#ed-list'), d = dayById(list.dataset.day), items = editItems(d), i = +b.closest('.ed-row').dataset.i;
      if (b.dataset.ed === 'up' && i > 0) [items[i - 1], items[i]] = [items[i], items[i - 1]];
      if (b.dataset.ed === 'down' && i < items.length - 1) [items[i + 1], items[i]] = [items[i], items[i + 1]];
      if (b.dataset.ed === 'del') {
        if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Conferma'; b.classList.add('arm'); setTimeout(() => { if (b.isConnected) { b.dataset.confirm = ''; b.textContent = 'Rimuovi'; b.classList.remove('arm'); } }, 3500); return true; }
        items.splice(i, 1);
      }
      buzz(); saveItems(d.pk, items); route(true); return true;
    }
    if (e.target.closest('#ed-open')) { editing = (location.hash || '#').slice(1) || TODAY_ID(); if (editing === 'oggi') editing = TODAY_ID(); route(); return true; }
    if (e.target.closest('#ed-done')) { editing = null; route(); return true; }
    if (e.target.closest('#ed-add-go')) {
      const d = dayById(editing), items = editItems(d);
      if (!document.getElementById('ed-add-ex').value) return true;
      const it = { uid: d.pk + ':n' + Date.now().toString(36), b: document.getElementById('ed-add-b').value, ex: document.getElementById('ed-add-ex').value,
        s: normSets(document.getElementById('ed-add-s').value) || '3 × 10' };
      const r = normRest(document.getElementById('ed-add-r').value); if (r) it.r = r;
      items.push(it); saveItems(d.pk, items); buzz(); route(true);
      const last = document.querySelector('#ed-list .ed-row:last-child'); if (last) { last.scrollIntoView({ block: 'center' }); flashSaved(last); }
      return true;
    }
    const rs = e.target.closest('#ed-reset');
    if (rs) {
      if (rs.dataset.confirm !== '1') { rs.dataset.confirm = '1'; rs.textContent = 'Tocca di nuovo per ripristinare'; setTimeout(() => { if (rs.isConnected) { rs.dataset.confirm = ''; rs.textContent = 'Ripristina la scheda originale'; } }, 4000); return true; }
      const plan = store.get('plan', {}); delete plan[dayById(editing).pk]; store.set('plan', plan); route(true); return true;
    }
    return false;
  }

  /* ---------- router ---------- */
  const TABS = [['oggi', 'Oggi'], ['settimana', 'Allenamento'], 'sep'].concat(BASE_DAYS.map(d => [d.id, d.d.slice(0, 3)]), ['sep', ['esercizi', 'Esercizi'], ['mobilita', 'Mobilità'], ['cibo', 'Cibo'], ['io', 'Io']]);
  function renderTabs(cur) {
    const tabs = document.getElementById('tabs');
    tabs.innerHTML = TABS.map(t => t === 'sep' ? '<span class="sep"></span>' : `<a href="#${t[0]}"${t[0] === cur ? ' aria-current="page"' : ''}>${t[1]}</a>`).join('');
    const a = tabs.querySelector('a[aria-current]');
    if (a) tabs.scrollLeft = a.offsetLeft - tabs.clientWidth / 2 + a.clientWidth / 2;
    const isDay = BASE_DAYS.some(d => d.id === cur);
    const bkey = cur === 'oggi' ? 'oggi' : isDay || TRAIN_IDS.has(cur) ? 'settimana' : IO_IDS.has(cur) || HK.views[cur] ? 'io' : cur;
    document.querySelectorAll('.bnav a, .bnav [data-k]').forEach(x => { if (x.dataset.k === bkey) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); });
  }
  function centerCalendar() {
    const cal = document.querySelector('.cal'), now = cal && (cal.querySelector('.wk.now') || cal.querySelector('.wk'));
    if (cal && now && cal.scrollWidth > cal.clientWidth) cal.scrollLeft = Math.max(0, now.offsetLeft - cal.offsetLeft - 16);
  }
  function route(keep) {
    syncWatch();
    // testo in fondo: con altezza e peso del profilo
    { const f = document.querySelector('footer .wrap'), hs = heroStats(); if (f) f.textContent = PROG.footer.replace(PROG.stats[0][0], hs[0].v).replace(PROG.stats[1][0], hs[1].v); }
    let id = (location.hash || '').replace('#', '') || 'oggi';
    const day = dayById(id);
    if (!day && !['oggi', 'io', 'settimana', 'mobilita', 'cibo', 'esercizi', 'piano', 'watch', 'profilo'].includes(id) && !HK.views[id]) id = 'oggi';
    renderTabs(id);
    const main = document.getElementById('main'), hero = document.getElementById('hero');
    unmount(main); unmount(hero);
    hero.innerHTML = id === 'io' ? heroHTML() : '';
    main.innerHTML = day ? viewDay(day) : id === 'mobilita' ? viewMob() : id === 'esercizi' ? viewLib() : id === 'piano' ? viewPlan() : id === 'cibo' ? viewFood() : id === 'watch' ? viewWatch() : id === 'profilo' ? viewProfile() : id === 'oggi' ? viewToday() : id === 'io' ? viewIo() : HK.views[id] ? HK.views[id]() : viewHome();
    mountFigures(hero); mountFigures(main);
    if (id === 'esercizi') applyLib();
    if (id === 'settimana') centerCalendar();
    document.body.dataset.page = id;
    const ds = main.querySelector('.daystrip a[aria-current]');
    if (ds) { const strip = ds.parentElement; strip.scrollLeft = ds.offsetLeft - strip.clientWidth / 2 + ds.clientWidth / 2; }
    if (!keep) window.scrollTo(0, 0);
    HK.after.forEach(f => { try { f(id, main, day); } catch (e) { console.error('starfit+ modulo after', e); } });
  }

  /* ---------- menu «Altro» (telefono): tutte le sezioni a due tocchi ---------- */
  // A quale voce del menu in basso appartiene ogni pagina
  const IO_IDS = new Set(['io', 'piano', 'costanza', 'progressi', 'watch', 'profilo']), TRAIN_IDS = new Set(['settimana', 'esercizi', 'mobilita']);
  const MORE_IDS = new Set([...IO_IDS, ...TRAIN_IDS]);
  function moreGroups() {
    return [
      ['Ogni giorno', [['oggi', 'Oggi', 'La tua giornata'], ['cibo', 'Cibo', 'Cosa mangi e i macro']]],
      ['Allenamento', [['settimana', 'La settimana', 'Giorni e calendario'], ['esercizi', 'Tutti gli esercizi', n0(Object.keys(EX).length) + ' con video'], ['mobilita', 'Mobilità', '10′ ogni giorno']]],
      ['I tuoi progressi', [['io', 'Io', 'Riepilogo, costanza, sfida'], ['costanza', 'Costanza', 'Un pallino per ogni giorno'], ['progressi', 'Foto e misure', 'Ogni 4 settimane'], ['piano', 'Piano e dieta', 'Peso, test, calorie, regole']]],
      ['Impostazioni', [['watch', 'Apple Watch e promemoria', 'Scheda sul polso, notifiche'], ['profilo', 'Profilo', 'Altezza, peso, obiettivo']]]
    ];
  }
  function toggleMore(open) {
    let sh = document.getElementById('more-sheet'); const btn = document.querySelector('.bnav-logo');
    if (open === undefined) open = !sh;
    if (!open) { if (sh) sh.remove(); if (btn) btn.setAttribute('aria-expanded', 'false'); return; }
    if (sh) return;
    const cur = (location.hash || '#').slice(1);
    sh = document.createElement('div'); sh.id = 'more-sheet'; sh.className = 'more-sheet';
    const u = window.FitAccount.user() || '', st = document.getElementById('acct-status');
    sh.innerHTML = `<div class="more-in" role="menu" aria-label="Tutte le sezioni">
      <div class="more-top"><span class="more-av">${esc(u.charAt(0).toUpperCase())}</span><span class="more-u"><b>${esc(u)}</b><small>${esc(st ? st.textContent : '')}</small></span>
        <button type="button" class="sb-btn more-timer" data-more="timer">⏱ Recupero</button></div>
      ${moreGroups().map(([g, items]) => `<p class="more-g">${esc(g)}</p><div class="more-list">${items.map(([id, t, d]) => `<a href="#${id}" role="menuitem"${cur === id ? ' aria-current="page"' : ''}><b>${esc(t)}</b><span>${esc(d)}</span></a>`).join('')}</div>`).join('')}
      <div class="more-foot"><button type="button" class="btn-ghost" data-more="slow">${speed < 1 ? 'Animazioni normali' : 'Rallenta le animazioni'}</button><button type="button" class="btn-ghost" data-more="out">Esci</button></div>
    </div>`;
    sh.addEventListener('click', e => {
      const b = e.target.closest('[data-more]');
      if (b) { const a = b.dataset.more; toggleMore(false); if (a === 'timer') window.FitTimer.picker(); if (a === 'slow') { const sl = document.getElementById('slow'); if (sl) sl.click(); } if (a === 'out') { const o = document.getElementById('acct-out'); if (o) o.click(); } return; }
      if (e.target === sh || e.target.closest('a')) toggleMore(false);
    });
    document.body.appendChild(sh); if (btn) btn.setAttribute('aria-expanded', 'true');
  }

  /* ---------- eventi ---------- */
  document.addEventListener('change', e => {
    if (someH('change', e)) return;
    if (e.target.closest && e.target.closest('.wt-prefs')) return onPrefChange();
    if (e.target.closest && e.target.closest('#ed-list') && e.target.dataset.f) return onEditChange(e.target);
    const k = e.target.dataset && e.target.dataset.key;
    if (k) { if (e.target.checked) { done[k] = true; markTrained(k); } else delete done[k]; store.set('done', done); e.target.closest('.ex').classList.toggle('is-done', e.target.checked); }
  });
  document.addEventListener('submit', e => { onHeroSubmit(e); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleMore(false); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    if (e.target.id === 'w-in') { e.preventDefault(); e.target.blur(); saveWeightFrom('w-in', dkey(new Date())); }
    if (e.target.id === 'f-g') { e.preventDefault(); document.getElementById('f-ok').click(); }
    if (e.target.id === 'f-q') { e.preventDefault(); const first = document.querySelector('#f-res [data-fpick]'); if (first) first.click(); }
    if (e.target.id === 'w-in2') { e.preventDefault(); e.target.blur(); document.getElementById('w-save2').click(); }
  });
  let libTimer = 0;
  document.addEventListener('input', e => {
    if (someH('input', e)) return;
    if (e.target.id === 'f-q') { foodQ = e.target.value; document.getElementById('f-res').innerHTML = foodResults(); }
    if (e.target.id === 'f-g') updateFoodPrev();
    if (e.target.classList && e.target.classList.contains('bad')) e.target.classList.remove('bad');
    if (e.target.id === 'q') { libQuery = e.target.value.trim(); libShown = 24; clearTimeout(libTimer); libTimer = setTimeout(applyLib, 180); }
    if (e.target.id === 'ed-add-q') { const sel = document.getElementById('ed-add-ex'); sel.innerHTML = edOpts(e.target.value); }
    const m = /^t-(\d+)-(\d+)$/.exec(e.target.id || '');
    if (m) { const t = store.get('tests', {}); t[m[1] + '-' + m[2]] = e.target.value; store.set('tests', t); }
  });
  document.addEventListener('click', e => {
    if (e.target.closest('.bnav-logo')) { buzz(); toggleMore(); return; }
    if (someH('click', e)) return;
    if (onHeroClick(e)) return;
    if (onEditClick(e)) return;
    if (onFoodClick(e)) return;
    if (e.target.closest('[data-copy], #wt-make, #wt-new, #push-on, #push-test, #push-off')) { onWatchClick(e); return; }
    const swb = e.target.closest('[data-swap]');
    if (swb) { swapFor = swb.dataset.swap || null; buzz(); route(true); const c = swapFor && document.querySelector('[data-swapto^="' + swapFor + '|"]'); if (c) c.closest('.alts').scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' }); return; }
    const st = e.target.closest('[data-swapto]');
    if (st) { const [uid, nid] = st.dataset.swapto.split('|'); swapFor = null; if (EX[nid] && swapExercise(uid, nid)) { buzz(); route(true); } return; }
    const rt = e.target.closest('[data-rate]');
    if (rt) { const d = curDay(); if (d) { const v = rt.getAttribute('aria-pressed') === 'true' ? '' : rt.dataset.rate; const ta = document.getElementById('d-text'); saveDiary(d, { r: v, t: ta ? ta.value.trim() : '' }); buzz(); route(true); } return; }
    if (e.target.closest('#d-save')) { const d = curDay(); if (d) { saveDiary(d, { t: document.getElementById('d-text').value.trim() }); buzz(); route(true); const b = document.querySelector('.d-bad') || document.getElementById('diary'); if (b) b.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' }); } return; }
    if (e.target.closest('#w-save')) return saveWeightFrom('w-in', dkey(new Date()));
    if (e.target.closest('#w-save2')) { const dv = document.getElementById('w-date').value; if (/^\d{4}-\d{2}-\d{2}$/.test(dv) && dv <= dkey(new Date())) saveWeightFrom('w-in2', dv); return; }
    const wd = e.target.closest('[data-wdel]');
    if (wd) {
      if (wd.dataset.confirm !== '1') { wd.dataset.confirm = '1'; wd.textContent = 'Conferma'; wd.classList.add('arm'); setTimeout(() => { if (wd.isConnected) { wd.dataset.confirm = ''; wd.textContent = 'Rimuovi'; wd.classList.remove('arm'); } }, 3500); return; }
      setWeight(wd.dataset.wdel, null); buzz(); route(true); return;
    }
    const mdb = e.target.closest('[data-matchday]');
    if (mdb && mdb.dataset.matchday !== MATCHDAY) {
      buzz(); store.set('matchday', mdb.dataset.matchday);
      document.querySelectorAll('[data-matchday]').forEach(b => b.setAttribute('aria-pressed', b === mdb));
      // salva nell'account (al massimo 1,5 s di attesa, anche senza rete) e ricarica con la settimana nuova
      Promise.race([Promise.resolve().then(() => window.FitAccount.saveNow()), new Promise(r => setTimeout(r, 1500))]).catch(() => {}).then(() => location.reload());
      return;
    }
    const sbb = e.target.closest('.setbar button');
    if (sbb) onSetBar(sbb);
    if (e.target.closest('#sw-open, .bnav-timer, .timer-open')) { buzz(); window.FitTimer.picker(); }
    const sw = e.target.closest('.media-sw button');
    if (sw) {
      const box = sw.closest('.anim'), mode = sw.dataset.mode;
      mediaMode = mode; store.set('media', mode);
      box.querySelectorAll('.media-sw button').forEach(b => b.setAttribute('aria-pressed', b === sw));
      const vid = box.querySelector('.vid');
      vid.hidden = mode !== 'video';
      box.querySelector('.fig-wrap').hidden = mode === 'video';
      if (mode !== 'video' && vid.dataset.html) { vid.innerHTML = vid.dataset.html; delete vid.dataset.html; }
    }
    const play = e.target.closest('.vid-play');
    if (play) {
      const vid = play.closest('.vid');
      vid.dataset.html = vid.innerHTML;
      vid.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${vid.dataset.vid}?autoplay=1&rel=0&playsinline=1" title="Video: ${esc(vid.dataset.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    }
    const f = e.target.closest('.fchip');
    if (f) { libFilter = f.dataset.cat; libShown = 24; document.querySelectorAll('.fchip').forEach(b => b.setAttribute('aria-pressed', b === f)); applyLib(); }
    if (e.target.closest('#lib-more')) { libShown += 24; applyLib(); }
    if (e.target.id === 'install-ok') { store.set('install-ok', true); const box = document.getElementById('install'); if (box) box.remove(); }
    if (e.target.id === 'reset') { done = {}; setsDone = {}; store.set('done', done); store.set('sets', setsDone); store.set('doneResetAt', Date.now()); route(); }
  });
  const slow = document.getElementById('slow');
  const syncSlow = () => slow.setAttribute('aria-pressed', speed < 1);
  syncSlow();
  slow.addEventListener('click', () => { speed = speed < 1 ? 1 : 0.5; store.set('speed', speed); syncSlow(); });
  /* App sul telefono: lavoro offline (solo su HTTPS) */
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* niente */ }));
  }
  if (isStandalone()) document.documentElement.classList.add('standalone');
  window.addEventListener('hashchange', () => { toggleMore(false); const am = document.getElementById('acct-menu'); if (am) am.hidden = true; profMsg = ''; editing = null; swapFor = null; foodAdd = null; foodPick = null; foodNew = false; route(); });
  // Dati aggiornati da un altro dispositivo
  window.FitAccount.onRemote(() => {
    if ((store.get('program', 'terzino') || 'terzino') !== PROG.id && PROGRAMS[store.get('program', 'terzino')]) return location.reload();
    if (MATCHDAY && PROG0.layouts[store.get('matchday', 'dom')] && store.get('matchday', 'dom') !== MATCHDAY) return location.reload();
    done = store.get('done', {}); setsDone = store.get('sets', {}); speed = store.get('speed', 1); mediaMode = store.get('media', 'video');
    syncSlow();
    const ae = document.activeElement;
    if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && ae.closest('#main')) { if (!ae.dataset.waitRoute) { ae.dataset.waitRoute = '1'; ae.addEventListener('blur', () => { delete ae.dataset.waitRoute; setTimeout(() => route(true), 0); }, { once: true }); } }
    else route(true);
  });
  // Le foto di progresso stanno sul telefono: chiedi a Safari di non cancellarle da solo
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* niente */ }
  window.FitApp = {
    store, EX, ANIM, PROG, PROG0, MATCHDAY, BLOCK, START, END, DAY, WEEKS, TEST_WEEKS, MEALS, MAC0, hooks: HK,
    days, dayById, findItem, saveItems, swapExercise, alternatives, forMe, exMeta, card, mountFigures, unmount,
    TODAY_ID, dkey, kdate, fmt, esc, fold, n0, n1, kg, parseKg, buzz, isPhone, reduced, today0, currentWeek, testDate, weekStart,
    parseSets, parseRest, fmtSec, markTrained, itemView, mealNow, dayFood, setDayFood, sumFood, forGrams, allFoods, foodById, customFoods, macrosFor,
    weights, wList, logs, dateOfDay, isStandalone,
    route, api: (m, p, b) => window.FitAccount.api(m, p, b), user: () => window.FitAccount.user(),
    get done() { return done; }, get sets() { return setsDone; }, get foodDay() { return foodDay; }, set foodDay(v) { foodDay = v; }
  };
  (window.FitPlugins || []).forEach(f => { try { f(window.FitApp); } catch (e) { console.error('starfit+ modulo', e); } });
  route();
  requestAnimationFrame(loop);
});
