/* starfit+ — Foto e misure: foto di progresso (solo sul telefono), confronto e misure in cm */
(window.FitPlugins = window.FitPlugins || []).push(function (A) {
  const POSES = [['fronte', 'Fronte'], ['lato', 'Lato'], ['schiena', 'Schiena']];
  const POSE_NAME = { fronte: 'Fronte', lato: 'Lato', schiena: 'Schiena' };
  const FIELDS = { vita: 'Vita', fianchi: 'Fianchi', cosce: 'Cosce', braccio: 'Braccio', petto: 'Petto' };
  const GAP = 28;
  const esc = A.esc;

  if (!document.getElementById('sf-body')) {
    const st = document.createElement('style');
    st.id = 'sf-body';
    st.textContent = `
.bd-pose { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 12px 0 4px; }
.bd-pose label { display: flex; align-items: center; justify-content: center; text-align: center; min-height: 46px; padding: 8px 6px; border-radius: 999px; background: var(--fire); color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; }
.bd-pose input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.bd-day { margin-top: 18px; }
.bd-day h4 { font-family: var(--display); font-weight: 800; font-size: 18px; text-transform: uppercase; margin: 0 0 8px; }
.bd-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.bd-th { min-width: 0; }
.bd-th img, .bd-th .bd-empty { display: block; width: 100%; aspect-ratio: 3 / 4; object-fit: cover; border-radius: 10px; background: var(--steel); border: 1px solid var(--steel-line); }
.bd-th .bd-empty { display: flex; align-items: center; justify-content: center; color: var(--ink-muted); font-size: 12px; text-align: center; padding: 4px; box-sizing: border-box; }
.bd-th small { display: block; font-size: 12px; color: var(--ink-muted); margin: 4px 0 2px; }
.bd-th button { min-height: 40px; width: 100%; font-size: 13px; }
.bd-th button.arm { background: var(--fire); color: #fff; border-color: var(--fire); }
.bd-sel { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
.bd-sel label, .bd-form label { display: block; font-size: 13px; font-weight: 600; color: var(--ink-muted); }
.bd-sel select, .bd-form input, .bd-form select, .bd-one select { display: block; margin-top: 4px; font: 500 16px var(--body); color: var(--ink); background: var(--steel); border: 1px solid var(--steel-line); border-radius: 10px; padding: 10px 12px; min-height: 46px; width: 100%; min-width: 0; box-sizing: border-box; }
.bd-pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.bd-pair figure, .bd-pair .bd-empty { margin: 0; min-width: 0; }
.bd-pair img { display: block; width: 100%; aspect-ratio: 3 / 4; object-fit: cover; border-radius: 10px; background: var(--steel); }
.bd-pair figcaption { text-align: center; font-size: 13px; color: var(--ink-muted); margin-top: 4px; }
.bd-over { position: relative; width: 100%; aspect-ratio: 3 / 4; border-radius: 10px; overflow: hidden; background: var(--steel); margin-top: 14px; }
.bd-over img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.bd-over .bd-top { clip-path: inset(0 50% 0 0); }
.bd-range { width: 100%; margin: 10px 0 0; min-height: 40px; accent-color: var(--fire); }
.bd-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.bd-form .bd-wide { grid-column: 1 / -1; }
.bd-rows { margin-top: 14px; display: grid; gap: 8px; }
.bd-row { background: var(--steel); border-radius: 10px; padding: 10px 12px; font-size: 14px; }
.bd-row b { font-family: var(--display); text-transform: uppercase; font-size: 16px; }
.bd-row .bd-v { display: flex; flex-wrap: wrap; gap: 2px 14px; margin-top: 4px; }
.bd-row i { font-style: normal; font-weight: 700; }
.bd-row i.dn { color: #1f7a3a; } .bd-row i.up { color: var(--fire); }
.bd-row button { min-height: 40px; margin-top: 6px; }
.bd-row button.arm { background: var(--fire); color: #fff; border-color: var(--fire); }
.bd-chart { width: 100%; height: auto; display: block; margin-top: 12px; }
.bd-warn { background: var(--iron); color: var(--on-iron); border-radius: 12px; padding: 12px 16px; margin-bottom: 14px; font-weight: 700; }
`;
    document.head.appendChild(st);
  }

  /* ---------- date ---------- */
  const todayKey = () => A.dkey(new Date());
  const daysSince = dk => Math.round((A.today0() - A.kdate(dk)) / A.DAY);
  const fdate = dk => { try { return A.fmt(A.kdate(dk), { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return dk; } };

  /* ---------- ultima sessione foto (copia leggera per la home) ---------- */
  const lastKey = () => 'sf-body-last:' + (A.user() || '');
  const getLast = () => { try { return localStorage.getItem(lastKey()) || ''; } catch (e) { return ''; } };
  const setLast = v => { try { if (v) localStorage.setItem(lastKey(), v); else localStorage.removeItem(lastKey()); } catch (e) { /* ok */ } };

  /* ---------- IndexedDB ---------- */
  let dbp = null;
  function openDB() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      try {
        if (!window.indexedDB) return rej(new Error('no idb'));
        const r = indexedDB.open('starfit-photos', 1);
        r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('photos')) r.result.createObjectStore('photos'); };
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error || new Error('idb'));
        r.onblocked = () => rej(new Error('blocked'));
      } catch (e) { rej(e); }
    });
    dbp.catch(() => { dbp = null; });
    return dbp;
  }
  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  async function dbAll() {
    const db = await openDB();
    const rows = await req(db.transaction('photos', 'readonly').objectStore('photos').getAll());
    const u = A.user();
    return (rows || []).filter(r => r && r.user === u && r.blob).sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  }
  async function dbPut(rec) {
    const db = await openDB();
    const tx = db.transaction('photos', 'readwrite');
    tx.objectStore('photos').put(rec, `${rec.user}:${rec.d}:${rec.pose}`);
    return new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
  }
  async function dbDel(key) {
    const db = await openDB();
    const tx = db.transaction('photos', 'readwrite');
    tx.objectStore('photos').delete(key);
    return new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
  }

  /* ---------- ridimensiona ---------- */
  async function toBitmap(file) {
    if (window.createImageBitmap) {
      try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* ripiego */ }
      try { return await createImageBitmap(file); } catch (e) { /* ripiego */ }
    }
    const url = URL.createObjectURL(file);
    try {
      return await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('img')); im.src = url; });
    } finally { setTimeout(() => URL.revokeObjectURL(url), 2000); }
  }
  async function shrink(file) {
    const bm = await toBitmap(file);
    const w0 = bm.width || bm.naturalWidth, h0 = bm.height || bm.naturalHeight;
    const k = Math.min(1, 1000 / Math.max(w0, h0));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w0 * k)); c.height = Math.max(1, Math.round(h0 * k));
    c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height);
    if (bm.close) { try { bm.close(); } catch (e) { /* ok */ } }
    return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('blob'))), 'image/jpeg', 0.8));
  }

  /* ---------- stato ---------- */
  let photos = [];            // record dal database
  let urls = {};              // chiave -> URL oggetto
  let idbOk = null;           // null = sto caricando
  let msg = '';
  const cmp = { a: '', b: '', pose: 'fronte' };
  let mSel = 'vita';

  function revokeAll() { Object.values(urls).forEach(u => { try { URL.revokeObjectURL(u); } catch (e) { /* ok */ } }); urls = {}; }
  const pkey = r => `${r.user}:${r.d}:${r.pose}`;
  function urlOf(r) { const k = pkey(r); if (!urls[k]) urls[k] = URL.createObjectURL(r.blob); return urls[k]; }
  const dates = () => Array.from(new Set(photos.map(r => r.d))).sort();
  const find = (d, pose) => photos.find(r => r.d === d && r.pose === pose);

  function fixCmp() {
    const ds = Array.from(new Set(photos.filter(r => r.pose === cmp.pose).map(r => r.d))).sort();
    if (!ds.includes(cmp.a)) cmp.a = ds[0] || '';
    if (!ds.includes(cmp.b)) cmp.b = ds[ds.length - 1] || '';
    return ds;
  }

  /* ---------- HTML ---------- */
  function photosHTML() {
    if (idbOk === null) return '<p class="small">Carico le foto…</p>';
    if (!idbOk) return '<p class="small">Su questo telefono non riesco a salvare le foto (l’archivio del browser non è disponibile, magari sei in navigazione privata). Le misure qui sotto funzionano lo stesso.</p>';
    const ds = dates().reverse();
    if (!ds.length) return '<p class="small">Ancora nessuna foto. Scatta le tre pose per iniziare.</p>';
    return ds.map(d => `<div class="bd-day"><h4>${esc(fdate(d))}</h4><div class="bd-grid">${POSES.map(([id, nm]) => {
      const r = find(d, id);
      return r
        ? `<div class="bd-th"><img src="${urlOf(r)}" alt="${esc(nm)} del ${esc(fdate(d))}"><small>${nm}</small><button type="button" class="btn-ghost" data-bd-del="${esc(pkey(r))}">Elimina</button></div>`
        : `<div class="bd-th"><div class="bd-empty">${nm}<br>manca</div></div>`;
    }).join('')}</div></div>`).join('');
  }

  function compareHTML() {
    if (!idbOk) return '';
    const ds = fixCmp();
    const poseSel = `<label>Posa<select id="bd-pose">${POSES.map(([id, nm]) => `<option value="${id}"${id === cmp.pose ? ' selected' : ''}>${nm}</option>`).join('')}</select></label>`;
    if (ds.length < 2) {
      return `<h3>Confronto</h3><div class="bd-sel">${poseSel}</div><p class="small">Servono almeno due date con la posa “${esc(POSE_NAME[cmp.pose])}” per confrontare.</p>`;
    }
    const opt = sel => ds.map(d => `<option value="${d}"${d === sel ? ' selected' : ''}>${esc(fdate(d))}</option>`).join('');
    const ra = find(cmp.a, cmp.pose), rb = find(cmp.b, cmp.pose);
    return `<h3>Confronto</h3>
      <div class="bd-sel">${poseSel}<span></span>
        <label>Prima<select id="bd-a">${opt(cmp.a)}</select></label>
        <label>Dopo<select id="bd-b">${opt(cmp.b)}</select></label></div>
      <div class="bd-pair">
        <figure><img src="${ra ? urlOf(ra) : ''}" alt="Prima"><figcaption>${esc(fdate(cmp.a))}</figcaption></figure>
        <figure><img src="${rb ? urlOf(rb) : ''}" alt="Dopo"><figcaption>${esc(fdate(cmp.b))}</figcaption></figure></div>
      <div class="bd-over"><img src="${ra ? urlOf(ra) : ''}" alt=""><img class="bd-top" id="bd-top" src="${rb ? urlOf(rb) : ''}" alt=""></div>
      <input type="range" class="bd-range" id="bd-range" min="0" max="100" value="50" aria-label="Sovrapponi le due foto">
      <p class="small">Muovi il cursore: a sinistra vedi “Dopo”, a destra “Prima”.</p>`;
  }

  function measures() { const m = A.store.get('measures', {}); return m && typeof m === 'object' ? m : {}; }
  function fieldOrder() { return A.PROG && A.PROG.id === 'glutei' ? ['fianchi', 'cosce', 'vita', 'braccio', 'petto'] : ['vita', 'petto', 'fianchi', 'cosce', 'braccio']; }
  const num = v => (typeof v === 'number' && isFinite(v) ? v : null);
  const fmtN = n => (Math.round(n * 10) / 10).toString().replace('.', ',');

  function chartHTML(f) {
    const m = measures();
    const pts = Object.keys(m).sort().map(d => [d, num(m[d] && m[d][f])]).filter(p => p[1] !== null);
    if (pts.length < 2) return '<p class="small">Il grafico compare quando hai almeno due misure.</p>';
    const W = 320, H = 150, L = 34, R = 10, T = 12, B = 24;
    const vs = pts.map(p => p[1]);
    let lo = Math.min(...vs), hi = Math.max(...vs);
    if (hi - lo < 1) { lo -= 0.5; hi += 0.5; }
    const t0 = A.kdate(pts[0][0]).getTime(), t1 = A.kdate(pts[pts.length - 1][0]).getTime();
    const x = d => L + (t1 === t0 ? 0 : (A.kdate(d).getTime() - t0) / (t1 - t0)) * (W - L - R);
    const y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const line = pts.map(p => `${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(' ');
    const dots = pts.map(p => `<circle cx="${x(p[0]).toFixed(1)}" cy="${y(p[1]).toFixed(1)}" r="3.5" fill="var(--fire)"/>`).join('');
    return `<svg class="bd-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Andamento ${esc(FIELDS[f])}">
      <line x1="${L}" y1="${T}" x2="${W - R}" y2="${T}" stroke="var(--steel-line)"/><line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" stroke="var(--steel-line)"/>
      <text x="${L - 4}" y="${T + 4}" font-size="10" text-anchor="end" fill="var(--ink-muted)">${fmtN(hi)}</text>
      <text x="${L - 4}" y="${H - B + 4}" font-size="10" text-anchor="end" fill="var(--ink-muted)">${fmtN(lo)}</text>
      <text x="${L}" y="${H - 6}" font-size="10" fill="var(--ink-muted)">${esc(fdate(pts[0][0]))}</text>
      <text x="${W - R}" y="${H - 6}" font-size="10" text-anchor="end" fill="var(--ink-muted)">${esc(fdate(pts[pts.length - 1][0]))}</text>
      <polyline points="${line}" fill="none" stroke="var(--fire)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${dots}</svg>`;
  }

  function measuresHTML() {
    const m = measures(), order = fieldOrder();
    const ds = Object.keys(m).filter(d => m[d] && typeof m[d] === 'object').sort();
    const first = ds.length ? m[ds[0]] : null;
    const form = `<div class="bd-form"><label class="bd-wide">Data<input type="date" id="bd-md" value="${todayKey()}"></label>
      ${order.map(f => `<label>${FIELDS[f]} (cm)<input type="text" inputmode="decimal" id="bd-m-${f}" autocomplete="off" placeholder="0"></label>`).join('')}
      <div class="bd-wide"><button type="button" class="sb-btn" id="bd-msave" style="min-height:46px;width:100%">Salva le misure</button></div></div>`;
    const rows = ds.slice().reverse().map(d => {
      const r = m[d];
      const vals = order.filter(f => num(r[f]) !== null).map(f => {
        let diff = '';
        if (first && d !== ds[0] && num(first[f]) !== null) {
          const x = Math.round((r[f] - first[f]) * 10) / 10;
          if (x !== 0) diff = ` <i class="${x < 0 ? 'dn' : 'up'}">(${x > 0 ? '+' : '−'}${fmtN(Math.abs(x))})</i>`;
        }
        return `<span>${FIELDS[f]} ${fmtN(r[f])}${diff}</span>`;
      }).join('');
      return `<div class="bd-row"><b>${esc(fdate(d))}</b><div class="bd-v">${vals || '<span>Nessun valore</span>'}</div><button type="button" class="btn-ghost" data-bd-mdel="${esc(d)}">Elimina</button></div>`;
    }).join('');
    return `<h3>Misure</h3>${form}
      ${ds.length ? `<div class="bd-rows">${rows}</div><p class="small">Tra parentesi la differenza rispetto alla prima misura.</p>
      <div class="bd-one" style="margin-top:14px"><label style="font-size:13px;font-weight:600;color:var(--ink-muted)">Grafico<select id="bd-msel">${order.map(f => `<option value="${f}"${f === mSel ? ' selected' : ''}>${FIELDS[f]}</option>`).join('')}</select></label>
      <div id="bd-chart">${chartHTML(mSel)}</div></div>` : '<p class="small">Ancora nessuna misura. Misura sempre nello stesso punto, la mattina a digiuno.</p>'}`;
  }

  A.hooks.views['progressi'] = () => {
    if (!order0()) { /* ok */ }
    const since = lastSince();
    return `<div class="dayhead"><div><div class="meta"><span class="chip act">Progressi</span></div>
      <p class="big">Foto e misure</p><p class="sub">Guarda come cambi</p>
      <p class="goal">Una serie di foto ogni 4 settimane e le misure in cm: il corpo cambia prima di quanto dica la bilancia.</p></div></div>
      ${since !== null && since > GAP ? '<div class="bd-warn">È ora delle foto del mese</div>' : ''}
      <section class="sec panel"><h3>Foto</h3>
        <p class="small" style="margin-top:0"><b>Le foto restano solo su questo iPhone, non vanno online.</b> Se cancelli i dati del sito o cambi telefono, le perdi.</p>
        <div class="bd-pose">${POSES.map(([id, nm]) => `<label>${nm}<input type="file" accept="image/*" data-bd-file="${id}"></label>`).join('')}</div>
        <p class="small" id="bd-msg">${esc(msg)}</p>
        <div id="bd-photos">${photosHTML()}</div></section>
      <section class="sec panel" id="bd-cmp">${compareHTML()}</section>
      <section class="sec panel" id="bd-meas">${measuresHTML()}</section>`;
  };
  function order0() { return true; }

  function lastSince() { const l = getLast(); return l ? daysSince(l) : null; }

  /* ---------- aggiornamenti ---------- */
  function paint() {
    const p = document.getElementById('bd-photos'), c = document.getElementById('bd-cmp');
    if (!p) return;
    revokeAll();
    p.innerHTML = photosHTML();
    if (c) c.innerHTML = compareHTML();
    const mg = document.getElementById('bd-msg'); if (mg) mg.textContent = msg;
  }
  async function reload() {
    try { photos = await dbAll(); idbOk = true; } catch (e) { photos = []; idbOk = false; }
    const ds = dates();
    setLast(ds.length ? ds[ds.length - 1] : '');
    paint();
  }

  A.hooks.after.push((id) => {
    if (id !== 'progressi') { revokeAll(); return; }
    reload();
  });

  /* all'avvio aggiorno la data dell'ultima sessione per la home */
  (async () => {
    try {
      const rows = await dbAll();
      const ds = Array.from(new Set(rows.map(r => r.d))).sort();
      const nw = ds.length ? ds[ds.length - 1] : '';
      if (nw !== getLast()) {
        setLast(nw);
        const h = (location.hash || '').replace('#', '');
        if (!h || h === 'settimana' || h === 'piano') A.route(true);
      }
    } catch (e) { /* niente archivio */ }
  })();

  /* ---------- eventi ---------- */
  function armBtn(b, label) {
    if (b.dataset.confirm !== '1') {
      b.dataset.confirm = '1'; b.textContent = 'Conferma'; b.classList.add('arm');
      setTimeout(() => { if (b.isConnected) { b.dataset.confirm = ''; b.textContent = label; b.classList.remove('arm'); } }, 3500);
      return false;
    }
    return true;
  }

  A.hooks.click.push(e => {
    const t = e.target && e.target.closest ? e.target : null;
    if (!t) return false;
    const del = t.closest('[data-bd-del]');
    if (del) {
      if (armBtn(del, 'Elimina')) dbDel(del.dataset.bdDel).then(reload).catch(() => { msg = 'Non riesco a eliminare la foto.'; paint(); });
      return true;
    }
    const md = t.closest('[data-bd-mdel]');
    if (md) {
      if (armBtn(md, 'Elimina')) {
        const m = Object.assign({}, measures()); delete m[md.dataset.bdMdel];
        A.store.set('measures', m); A.route(true);
      }
      return true;
    }
    if (t.closest('#bd-msave')) {
      const d = (document.getElementById('bd-md') || {}).value || todayKey();
      const rec = {}; let any = false;
      Object.keys(FIELDS).forEach(f => {
        const el = document.getElementById('bd-m-' + f);
        const v = el ? parseFloat(String(el.value).replace(',', '.')) : NaN;
        if (isFinite(v) && v > 0 && v < 300) { rec[f] = Math.round(v * 10) / 10; any = true; }
      });
      if (!any) { (document.getElementById('bd-m-' + fieldOrder()[0]) || {}).focus && document.getElementById('bd-m-' + fieldOrder()[0]).focus(); return true; }
      const m = Object.assign({}, measures());
      m[d] = Object.assign({}, m[d] || {}, rec);
      A.store.set('measures', m);
      A.buzz && A.buzz();
      A.route(true);
      return true;
    }
    return false;
  });

  A.hooks.change.push(e => {
    const t = e.target;
    if (!t) return false;
    if (t.dataset && t.dataset.bdFile) {
      const pose = t.dataset.bdFile, file = t.files && t.files[0];
      t.value = '';
      if (!file) return true;
      msg = 'Salvo la foto…'; const mg = document.getElementById('bd-msg'); if (mg) mg.textContent = msg;
      shrink(file).then(blob => dbPut({ user: A.user(), d: todayKey(), pose, blob, at: Date.now() }))
        .then(() => { msg = `Foto “${POSE_NAME[pose]}” salvata.`; return reload(); })
        .catch(() => { msg = 'Non sono riuscito a salvare la foto. Riprova.'; paint(); });
      return true;
    }
    if (t.id === 'bd-pose' || t.id === 'bd-a' || t.id === 'bd-b') {
      if (t.id === 'bd-pose') cmp.pose = t.value;
      if (t.id === 'bd-a') cmp.a = t.value;
      if (t.id === 'bd-b') cmp.b = t.value;
      revokeAll();
      const p = document.getElementById('bd-photos'), c = document.getElementById('bd-cmp');
      if (p) p.innerHTML = photosHTML();
      if (c) c.innerHTML = compareHTML();
      return true;
    }
    if (t.id === 'bd-msel') {
      mSel = t.value;
      const c = document.getElementById('bd-chart'); if (c) c.innerHTML = chartHTML(mSel);
      return true;
    }
    return false;
  });

  A.hooks.input.push(e => {
    const t = e.target;
    if (t && t.id === 'bd-range') {
      const top = document.getElementById('bd-top');
      if (top) top.style.clipPath = `inset(0 ${100 - Number(t.value)}% 0 0)`;
      return true;
    }
    return false;
  });

  /* ---------- link nella home e nel piano ---------- */
  A.hooks.home.push(() => {
    const since = lastSince();
    const warn = since !== null && since > GAP ? '<div class="bd-warn">È ora delle foto del mese</div>' : '';
    const sub = since === null ? 'Foto di progresso e misure in cm'
      : since >= GAP ? 'Foto ogni 4 settimane: oggi è il giorno'
      : `Prossime foto tra ${GAP - since} ${GAP - since === 1 ? 'giorno' : 'giorni'}`;
    return `${warn}<a class="mob-link" href="#progressi"><div><b>Foto e misure</b><br><span>${sub}</span></div><em>Apri →</em></a>`;
  });
  A.hooks.plan.push(() => '<a class="mob-link" href="#progressi"><div><b>Foto e misure</b><br><span>Foto ogni 4 settimane e misure in cm</span></div><em>Apri →</em></a>');
});
