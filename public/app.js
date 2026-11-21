/* fit+ — interfaccia */
(function () {
  const { ANIM, evaluate, prepare, mid } = window.FitAnim;
  const { EX, MOB, DAYS, FIELD_TIPS, MATCH_TIPS } = window.FitData;
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- memoria locale (solo su questo dispositivo) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('pm-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('pm-' + k, JSON.stringify(v)); } catch (e) { /* niente */ } }
  };
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
      case 'band': setL(n[0], resolve(p.a, J), resolve(p.b, J)); break;
      case 'ball': { const b = ball || mid(J.haN, J.haF); setC(n[0], b[0], b[1]); break; }
      case 'landmine': {
        const h = J[p.at], t = p.to; setL(n[0], t, h);
        const dx = t[0] - h[0], dy = t[1] - h[1], d = Math.hypot(dx, dy) || 1;
        setC(n[1], h[0] + dx / d * 16, h[1] + dy / d * 16);
        n[2].setAttribute('x', t[0] - 5); n[2].setAttribute('y', t[1] - 3); break;
      }
      case 'sled': { const h = J[p.at]; setL(n[0], h, [h[0] + 2, 186]); n[1].setAttribute('x', (h[0] - 6).toFixed(1)); n[1].setAttribute('y', 186); setC(n[2], h[0] + 18, 177); break; }
      case 'pad': { const j = J[p.at]; setC(n[0], j[0], j[1] - 8); break; }
      case 'crank': { if (J.pN) { setL(n[0], J.pN, J.pF); setC(n[1], 128, 172); } break; }
    }
  }

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
    props.forEach(p => { if (['bench', 'box', 'step', 'wall', 'post', 'bar', 'couch', 'roller', 'bike'].includes(p.k)) drawStatic(gs, p); });
    const gBehind = el('g', {}, svg);
    const dyn = [];
    props.filter(p => p.behind).forEach(p => dyn.push(makeDynamic(gBehind, p)));
    const limb = (cls, w) => el('polyline', { fill: 'none', stroke: cls === 'far' ? 'var(--fig-far)' : 'var(--fig)', 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    const parts = {
      legF: limb('far', 7), armF: limb('far', 6), torso: limb('near', 9), gird: A.front ? limb('near', 6) : null,
      legN: limb('near', 7), head: el('circle', { r: 10.5, fill: 'var(--fig)' }, svg), armN: limb('near', 6)
    };
    const gFront = el('g', {}, svg);
    props.filter(p => !p.behind && !['bench', 'box', 'step', 'wall', 'post', 'bar', 'couch', 'roller', 'bike'].includes(p.k)).forEach(p => dyn.push(makeDynamic(gFront, p)));
    function draw(time) {
      const { J, ball } = evaluate(A, time);
      parts.legF.setAttribute('points', [J.hpF, J.knF, J.anF, J.toF].map(P).join(' '));
      parts.armF.setAttribute('points', [J.shF, J.elF, J.haF].map(P).join(' '));
      parts.torso.setAttribute('points', [J.hip, J.neck].map(P).join(' '));
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
  const TYPE_CHIP = { gym: 'gym', field: 'field', act: 'act', match: 'match' };
  const VIDEOS = window.FitVideos || {};
  let mediaMode = store.get('media', 'video');
  const ytUrl = q => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);

  function usage(id) {
    const out = [];
    DAYS.forEach(d => (d.items || []).forEach(it => { if (it.ex === id) out.push(`<b>${d.d.slice(0, 3)}</b> ${esc(it.s)}`); }));
    const m = MOB.find(x => x.ex === id);
    if (m) out.push(`<b>Ogni giorno</b> ${esc(m.s)}`);
    return out.join(' · ');
  }

  const isPhone = () => window.matchMedia('(max-width: 760px)').matches;
  const TODAY_ID = () => ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'][new Date().getDay()];
  const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms || 12); } catch (e) { /* niente */ } };

  /* ---------- serie e recuperi ---------- */
  let setsDone = store.get('sets', {});
  const parseRest = r => { if (!r || r === '—') return 0; const m = /(\d+)(?:–\d+)?\s*([′″])/.exec(r); return m ? +m[1] * (m[2] === '′' ? 60 : 1) : 0; };
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
  function refreshSetBar(sb) {
    const card = sb.closest('.ex'), key = sb.dataset.key;
    const day = DAYS.find(d => d.id === key.split(':')[0]);
    const it = day.items[+key.split(':')[1]];
    sb.outerHTML = setBar(it.ex, it, key);
    if (setsDone[key] >= parseSets(it.s)) {
      done[key] = true; store.set('done', done);
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
      if (rest) T.countdown(rest, `${name} · ${n + 1}/${sets} ${n + 1 === sets ? '· poi passa al prossimo esercizio' : 'serie fatte'}`, 'rest');
    }
  }

  function card(id, it, key) {
    const e = EX[id];
    const view = e.view === 'frontale' ? 'Vista frontale' : 'Vista laterale';
    const isDone = key && done[key];
    const restTxt = it && it.r ? (it.r === '—' ? '<span class="rest">Nessun recupero</span>' : `<span class="rest">Recupero <b>${esc(it.r)}</b></span>`) : '';
    const dose = it ? `<div class="dose"><span class="sets">${esc(it.s)}</span>${it.per ? `<span class="per">${esc(it.per)}</span>` : ''}${restTxt}</div>${setBar(id, it, key)}` : `<p class="where">Nella scheda: ${usage(id)}</p>`;
    const v = VIDEOS[id];
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
      <div class="anim">${media}<div class="fig-wrap"${mode === 'video' ? ' hidden' : ''}><span class="view-tag">${view}</span><svg data-anim="${id}" aria-label="Animazione: ${esc(e.name)}"></svg><button class="pp" type="button"></button></div></div>
      <div class="ex-body">
        <div class="ex-top"><div><p class="cat">${esc(e.cat)}</p><h3>${esc(e.name)}</h3></div>
          ${key ? `<label class="done"><input type="checkbox" id="done-${key.replace(':', '-')}" data-key="${key}"${isDone ? ' checked' : ''}> Fatto</label>` : ''}</div>
        ${dose}
        ${it && it.note ? `<p class="note-l">${esc(it.note)}</p>` : ''}
        <details class="how"${isPhone() ? '' : ' open'}><summary>Come si fa <span>${e.steps.length} passi</span></summary><ol>${e.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></details>
        <details class="how"${isPhone() ? '' : ' open'}><summary>Errori da evitare <span>${e.err.length}</span></summary><ul class="err">${e.err.map(s => `<li>${esc(s)}</li>`).join('')}</ul></details>
        <div class="ex-foot"><div class="mus">${e.mus.map(m => `<span>${esc(m)}</span>`).join('')}</div>
          <a class="yt" href="${v ? 'https://www.youtube.com/watch?v=' + v.id : ytUrl(e.yt)}" target="_blank" rel="noopener">Apri su YouTube ↗</a></div>
      </div></article>`;
  }

  function dayProgress(d) {
    const its = (d.items || []).filter(i => i.ex);
    const n = its.reduce((s, it, i) => s + (done[d.id + ':' + d.items.indexOf(it)] ? 1 : 0), 0);
    return { n, tot: its.length };
  }

  /* ---------- calendario: 12 settimane, 23 nov 2026 → 14 feb 2027 ---------- */
  const START = new Date(2026, 10, 23), WEEKS = 12, DAY = 86400000;
  const END = new Date(START.getTime() + (WEEKS * 7 - 1) * DAY);
  const fmt = (d, o) => d.toLocaleDateString('it-IT', o || { day: 'numeric', month: 'short' });
  const weekStart = n => new Date(START.getTime() + (n - 1) * 7 * DAY);
  const testDate = n => new Date(weekStart(n).getTime() + 2 * DAY); // mercoledì
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
      const n = i + 1, a = weekStart(n), b = new Date(a.getTime() + 6 * DAY);
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
      <p class="small">Test il mercoledì delle settimane 1, 4, 8 e 12, all'inizio della Palestra B dopo il riscaldamento. Durante le feste (21 dicembre – 10 gennaio) il campionato di solito si ferma: tieni le 3 palestre e sostituisci le sedute con la squadra con 20–30′ di corsa e partenze.</p></section>`;
  }

  /* ---------- viste ---------- */
  function heroHTML() {
    return `<section class="hero"><div class="wrap">
      <div><p class="eyebrow">Scheda settimanale · Terzino</p>
        <h1 class="brandname">fit<span>+</span></h1>
        <p class="lede">Tre sedute in palestra, due in campo con la squadra, attivazione il giorno prima della partita e mobilità ogni giorno. Obiettivo: più veloce, più asciutto, più solido nei contrasti.</p>
        <div class="stats"><div class="stat"><b>1,85 m</b><span>Altezza</span></div><div class="stat"><b>85 kg</b><span>Oggi</span></div><div class="stat hot"><b>80–82 kg</b><span>Obiettivo</span></div><div class="stat"><b>${fmt(END, { day: 'numeric', month: 'short', year: 'numeric' })}</b><span>Traguardo</span></div></div>
      </div>
      <div class="hero-fig"><svg data-anim="accel" aria-label="Animazione: accelerazione"></svg></div>
    </div></section>`;
  }

  /* Avviso per installare l'app sull'iPhone (solo in Safari, non nell'app già installata) */
  const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = () => navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  function installHTML() {
    if (!isIOS() || isStandalone() || store.get('install-ok', false)) return '';
    const share = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Condividi"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
    return `<section class="sec install" id="install"><b>Installa l'app sull'iPhone</b>
      <ol><li>Tocca ${share} <span>Condividi</span> nella barra di Safari</li><li>Scegli <span>Aggiungi alla schermata Home</span></li><li>Apri fit+ dall'icona: si avvia a tutto schermo su Oggi</li></ol>
      <button type="button" class="btn-ghost" id="install-ok">Ho capito</button></section>`;
  }

  function todayHTML() {
    const d = DAYS.find(x => x.id === TODAY_ID()), pr = dayProgress(d), cw = currentWeek();
    const when = cw === 0 ? `Si parte lunedì ${fmt(START, { day: 'numeric', month: 'long' })} · intanto prova la scheda` : cw <= WEEKS ? `Settimana ${cw} di ${WEEKS}${cw % 4 === 0 ? ' · scarico' : ''}` : 'Programma completato';
    const cta = d.type === 'gym' || d.type === 'act' ? 'Inizia l\'allenamento' : 'Vedi i consigli';
    return `<a class="today-card" href="#${d.id}">
      <span class="tc-top"><span class="tc-k">Oggi · ${d.d}</span><span class="md">${d.md}</span></span>
      <span class="tc-t">${esc(d.title)}</span>
      <span class="tc-m"><span class="chip ${TYPE_CHIP[d.type]}">${esc(d.label)}</span>${d.dur ? `<span>${d.dur}</span>` : ''}${pr.tot ? `<span>${pr.n}/${pr.tot} esercizi fatti</span>` : ''}</span>
      <span class="tc-w">${when}</span>
      <span class="tc-cta">${cta} <b>→</b></span>
    </a>`;
  }

  function viewHome() {
    const todayId = TODAY_ID();
    const tiles = DAYS.map(d => {
      const pr = dayProgress(d);
      return `<a class="day-tile${d.id === todayId ? ' today' : ''}" href="#${d.id}">
        ${d.id === todayId ? '<span class="today-tag">Oggi</span>' : ''}
        <span class="md">${d.md}</span><span class="dn">${d.d}</span>
        <span class="chip ${TYPE_CHIP[d.type]}">${esc(d.label)}</span>
        <span class="tt">${esc(d.title)}</span>
        ${pr.tot ? `<span class="prog"><i style="width:${Math.round(pr.n / pr.tot * 100)}%"></i></span><span class="prog-l">${pr.n}/${pr.tot} fatti</span>` : '<span class="prog-l">Mobilità 10′</span>'}
      </a>`;
    }).join('');
    return installHTML() + `<section class="sec">${todayHTML()}</section>` + calendarHTML() + `<section class="sec"><div class="sec-h"><h2>La settimana</h2><button class="btn-ghost" type="button" id="reset">Azzera la settimana</button></div>
      <div class="week">${tiles}</div></section>
      <section class="sec quick">
        <a href="#mobilita"><b>Mobilità</b><span>10′ ogni giorno</span></a>
        <a href="#esercizi"><b>Tutti gli esercizi</b><span>${Object.keys(EX).length} con video</span></a>
        <a href="#piano"><b>Piano e dieta</b><span>Test, calorie, regole</span></a>
      </section>
      <section class="sec"><div class="pillars">
        <div class="pillar"><h3>Più <span>veloce</span></h3><p>Forza pesante il mercoledì, salti e partenze il venerdì: più spinta nei primi 10 metri.</p></div>
        <div class="pillar"><h3>Più <span>asciutto</span></h3><p>Deficit di 400–500 kcal e proteine alte: perdi grasso senza perdere esplosività.</p></div>
        <div class="pillar"><h3>Più <span>solido</span></h3><p>Spinte, trazioni, core anti-rotazione e prevenzione: vinci i contrasti e resti in campo.</p></div>
      </div></section>
      <p class="note"><b>Partita la domenica.</b> Se giochi il sabato sposta tutto indietro di un giorno. Regole fisse: la palestra pesante per le gambe ad almeno 3 giorni dalla partita, il giorno prima solo attivazione.</p>`;
  }

  function dayStrip(cur) {
    const t = TODAY_ID();
    return `<nav class="daystrip" aria-label="Giorni">${DAYS.map(d => `<a href="#${d.id}" class="ds-${d.type}${d.id === t ? ' is-today' : ''}"${d.id === cur ? ' aria-current="page"' : ''}><b>${d.d.slice(0, 3)}</b><i></i></a>`).join('')}</nav>`;
  }
  function dayPager(d) {
    const i = DAYS.indexOf(d), p = DAYS[(i + 6) % 7], n = DAYS[(i + 1) % 7];
    return `<nav class="pager" aria-label="Giorno precedente e successivo"><a href="#${p.id}"><span>← ${p.d}</span><b>${esc(p.label)}</b></a><a href="#${n.id}" class="nx"><span>${n.d} →</span><b>${esc(n.label)}</b></a></nav>`;
  }
  function viewDay(d) {
    return dayStrip(d.id) + viewDayBody(d) + dayPager(d);
  }
  function viewDayBody(d) {
    const pr = dayProgress(d);
    let html = `<div class="dayhead"><div>
        <div class="meta"><span class="chip ${TYPE_CHIP[d.type]}">${esc(d.label)}</span><span class="md">${d.md}</span></div>
        <p class="big">${d.d}</p><p class="sub">${esc(d.title)}</p>${d.goal ? `<p class="goal">${esc(d.goal)}</p>` : ''}</div>
        ${d.dur ? `<div class="dur"><b>${d.dur}</b><span>Durata</span></div>` : ''}</div>`;
    if (d.type !== 'act') html += `<a class="mob-link" href="#mobilita"><div><b>Mobilità quotidiana · 10′</b><br><span>7 esercizi per anche e caviglie, anche a casa</span></div><em>Apri →</em></a>`;
    if (d.type === 'field' || d.type === 'match') {
      const tips = d.type === 'field' ? FIELD_TIPS : MATCH_TIPS;
      html += `<div class="tips">${tips.map(t => `<div class="tip"><b>${esc(t[0])}</b><p>${esc(t[1])}</p></div>`).join('')}</div>`;
      return html;
    }
    const blocks = [['warm', 'Riscaldamento'], ['main', d.type === 'act' ? 'Attivazione' : 'Lavoro principale'], ['end', 'Finale']];
    blocks.forEach(([b, lbl]) => {
      const its = d.items.map((it, i) => ({ it, i })).filter(x => x.it.b === b);
      if (!its.length) return;
      html += `<h3 class="block-h">${lbl}</h3><div class="grid">`;
      its.forEach(({ it, i }) => {
        if (it.link) html += `<a class="mob-link" href="#mobilita" style="margin:0"><div><b>Mobilità quotidiana · ${esc(it.s)}</b><br><span>La stessa routine di ogni giorno</span></div><em>Apri →</em></a>`;
        else html += card(it.ex, it, d.id + ':' + i);
      });
      html += `</div>`;
    });
    return html;
  }

  function viewMob() {
    return `<div class="dayhead"><div><div class="meta"><span class="chip act">Ogni giorno</span></div>
      <p class="big">Mobilità</p><p class="sub">Anche e caviglie libere, meno infortuni</p>
      <p class="goal">Dieci minuti, anche a casa, anche la sera davanti alla TV. Fai gli esercizi in quest'ordine.</p></div>
      <div class="dur"><b>10′</b><span>Ogni giorno</span></div></div>
      <div class="grid">${MOB.map(m => card(m.ex, { s: m.s })).join('')}</div>`;
  }

  let libFilter = 'Tutti', libQuery = '';
  function viewLib() {
    const cats = ['Tutti'].concat([...new Set(Object.values(EX).map(e => e.cat))]);
    return `<div class="sec-h"><div><h2>Tutti gli esercizi</h2><p class="kicker">${Object.keys(EX).length} esercizi con animazione, spiegazione e video.</p></div></div>
      <div class="filters"><input class="search" id="q" type="search" placeholder="Cerca un esercizio o un muscolo" value="${esc(libQuery)}">
      <div class="fchips">${cats.map(c => `<button class="fchip" type="button" data-cat="${esc(c)}" aria-pressed="${c === libFilter}">${esc(c)}</button>`).join('')}</div></div>
      <div class="grid" id="lib">${Object.keys(EX).map(id => card(id)).join('')}</div>
      <p class="empty" id="none" hidden>Nessun esercizio trovato. Prova con un'altra parola.</p>`;
  }
  function applyLib() {
    let shown = 0;
    document.querySelectorAll('#lib .ex').forEach(c => {
      const ok = (libFilter === 'Tutti' || c.dataset.cat === libFilter) && (!libQuery || c.dataset.name.includes(libQuery.toLowerCase()));
      c.hidden = !ok; if (ok) shown++;
    });
    const n = document.getElementById('none'); if (n) n.hidden = shown > 0;
  }

  function viewPlan() {
    const tests = store.get('tests', {});
    const rows = TEST_WEEKS.map((n, i) => (i === 0 ? 'Inizio' : 'Settimana ' + n) + ' · ' + fmt(testDate(n), { weekday: 'short', day: 'numeric', month: 'short' }));
    const colsT = ['Sprint 10 m (s)', 'Sprint 30 m (s)', 'Salto in lungo (cm)', 'Peso (kg)', 'Giro vita (cm)'];
    return `<div class="sec-h"><div><h2>Piano e alimentazione</h2><p class="kicker">Progressione, test e cosa mangiare. Senza la dieta la scheda da sola non basta.</p></div></div>
    <div class="cols sec">
      <div class="panel dark"><h3>Blocchi da 4 settimane</h3>
        <div class="bars">
          <div class="bar"><span>100%</span><i style="height:68%"></i></div>
          <div class="bar"><span>+2,5–5%</span><i style="height:78%"></i></div>
          <div class="bar peak"><span>+2,5–5%</span><i style="height:88%"></i></div>
          <div class="bar low"><span>Scarico</span><i style="height:40%"></i></div>
        </div>
        <div class="bar-l"><span>Sett. 1</span><span>Sett. 2</span><span>Sett. 3</span><span>Sett. 4</span></div>
        <p class="small">Settimane 1–3: aumenta il carico del 2,5–5% sugli esercizi principali quando completi tutte le ripetizioni bene. Settimana 4: stessi esercizi, metà delle serie e carico più leggero.</p>
        <p class="small">Blocco 1: ${fmt(weekStart(1))} – ${fmt(new Date(weekStart(5) - DAY))} · Blocco 2: ${fmt(weekStart(5))} – ${fmt(new Date(weekStart(9) - DAY))} · Blocco 3: ${fmt(weekStart(9))} – ${fmt(END)}</p>
      </div>
      <div class="panel"><h3>Alimentazione</h3>
        <div class="nums">
          <div class="num hot"><b>2.500–2.700</b><span>kcal al giorno (circa −400/500)</span></div>
          <div class="num"><b>160–180 g</b><span>proteine, su 4 pasti</span></div>
          <div class="num"><b>−0,4/0,6 kg</b><span>a settimana, non di più</span></div>
          <div class="num"><b>7–9 ore</b><span>di sonno</span></div>
        </div>
        <ul class="list"><li>Carboidrati concentrati nei giorni di campo, mercoledì, sabato e domenica; un po' meno il lunedì.</li>
          <li>Obiettivo 80–82 kg entro il ${fmt(END, { day: 'numeric', month: 'long' })}, con più muscolo: non devi diventare leggero, devi diventare denso.</li></ul>
      </div>
    </div>
    <section class="sec panel"><h3>Registro test (ogni 4 settimane)</h3>
      <div class="tablebox"><table><thead><tr><th>Quando</th>${colsT.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>
      ${rows.map((r, ri) => `<tr><th scope="row">${r}</th>${colsT.map((c, ci) => `<td><input id="t-${ri}-${ci}" inputmode="decimal" aria-label="${r}: ${c}" value="${esc(tests[ri + '-' + ci] || '')}"></td>`).join('')}</tr>`).join('')}
      </tbody></table></div>
      <p class="small">Cronometra gli sprint sempre sulla stessa superficie. I valori restano salvati solo in questo browser.</p>
    </section>
    <section class="sec panel dark"><h3>Regole d'oro</h3>
      <ol class="rules"><li><span><b>Tecnica prima del carico</b>, soprattutto su stacco e nordic.</span></li>
        <li><span>Se una settimana sei distrutto, salta la Palestra C, non la partita.</span></li>
        <li><span>Un dolore all'inguine o ai femorali che non passa va fatto vedere a un fisioterapista, non allenato sopra.</span></li></ol>
    </section>`;
  }

  /* ---------- router ---------- */
  const TABS = [['settimana', 'Settimana'], 'sep'].concat(DAYS.map(d => [d.id, d.d.slice(0, 3)]), ['sep', ['mobilita', 'Mobilità'], ['esercizi', 'Esercizi'], ['piano', 'Piano']]);
  function renderTabs(cur) {
    const tabs = document.getElementById('tabs');
    tabs.innerHTML = TABS.map(t => t === 'sep' ? '<span class="sep"></span>' : `<a href="#${t[0]}"${t[0] === cur ? ' aria-current="page"' : ''}>${t[1]}</a>`).join('');
    const a = tabs.querySelector('a[aria-current]');
    if (a) tabs.scrollLeft = a.offsetLeft - tabs.clientWidth / 2 + a.clientWidth / 2;
    const isDay = DAYS.some(d => d.id === cur);
    const bkey = cur === TODAY_ID() ? 'oggi' : isDay ? 'settimana' : cur;
    document.querySelectorAll('.bnav a').forEach(x => { if (x.dataset.k === bkey) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); });
  }
  function centerCalendar() {
    const cal = document.querySelector('.cal'), now = cal && (cal.querySelector('.wk.now') || cal.querySelector('.wk'));
    if (cal && now && cal.scrollWidth > cal.clientWidth) cal.scrollLeft = Math.max(0, now.offsetLeft - cal.offsetLeft - 16);
  }
  function route() {
    let id = (location.hash || '').replace('#', '') || 'settimana';
    if (id === 'oggi') id = TODAY_ID();
    const day = DAYS.find(d => d.id === id);
    if (!day && !['settimana', 'mobilita', 'esercizi', 'piano'].includes(id)) id = 'settimana';
    renderTabs(id);
    const main = document.getElementById('main'), hero = document.getElementById('hero');
    unmount(main); unmount(hero);
    hero.innerHTML = id === 'settimana' ? heroHTML() : '';
    main.innerHTML = day ? viewDay(day) : id === 'mobilita' ? viewMob() : id === 'esercizi' ? viewLib() : id === 'piano' ? viewPlan() : viewHome();
    mountFigures(hero); mountFigures(main);
    if (id === 'esercizi') applyLib();
    if (id === 'settimana') centerCalendar();
    const ds = main.querySelector('.daystrip a[aria-current]');
    if (ds) { const strip = ds.parentElement; strip.scrollLeft = ds.offsetLeft - strip.clientWidth / 2 + ds.clientWidth / 2; }
    window.scrollTo(0, 0);
  }

  /* ---------- eventi ---------- */
  document.addEventListener('change', e => {
    const k = e.target.dataset && e.target.dataset.key;
    if (k) { if (e.target.checked) done[k] = true; else delete done[k]; store.set('done', done); e.target.closest('.ex').classList.toggle('is-done', e.target.checked); }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'q') { libQuery = e.target.value.trim(); applyLib(); }
    const m = /^t-(\d+)-(\d+)$/.exec(e.target.id || '');
    if (m) { const t = store.get('tests', {}); t[m[1] + '-' + m[2]] = e.target.value; store.set('tests', t); }
  });
  document.addEventListener('click', e => {
    const sbb = e.target.closest('.setbar button');
    if (sbb) onSetBar(sbb);
    if (e.target.closest('#sw-open, .bnav-timer')) { buzz(); window.FitTimer.picker(); }
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
    if (f) { libFilter = f.dataset.cat; document.querySelectorAll('.fchip').forEach(b => b.setAttribute('aria-pressed', b === f)); applyLib(); }
    if (e.target.id === 'install-ok') { store.set('install-ok', true); const box = document.getElementById('install'); if (box) box.remove(); }
    if (e.target.id === 'reset') { done = {}; setsDone = {}; store.set('done', done); store.set('sets', setsDone); route(); }
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
  window.addEventListener('hashchange', route);
  route();
  requestAnimationFrame(loop);
})();
