/* starfit+ — daily: "Come stai oggi?" con versione leggera, riepilogo della settimana, macro in base all'attività, sonno dal Watch */
(window.FitPlugins = window.FitPlugins || []).push(function (A) {
  const esc = A.esc, H = A.hooks;
  const isG = A.PROG.id === 'glutei', isT = !isG;
  const WD = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  const WEEK = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];

  /* ---------- funzioni di base ---------- */
  const num = v => typeof v === 'number' && isFinite(v) ? v : (typeof v === 'string' && v.trim() !== '' && isFinite(+v.replace(',', '.')) ? +v.replace(',', '.') : null);
  const addDays = (dk, n) => { const d = A.kdate(dk); return A.dkey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); };
  const todayKey = () => A.dkey(new Date());
  const obj = (k, d) => { const v = A.store.get(k, d); return v && typeof v === 'object' ? v : d; };
  const ready = () => obj('ready', {});
  const wact = () => obj('watchAct', {});
  const act = dk => { const a = wact()[dk]; return a && typeof a === 'object' ? a : {}; };
  const sign1 = n => (n > 0.04 ? '+' : n < -0.04 ? '−' : '±') + A.kg(Math.abs(n));
  const h1 = h => String(Math.round(h * 10) / 10).replace('.', ',');
  const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;

  /* ---------- 1 · Come stai oggi? ---------- */
  const SLEEP = [['Meno di 6 h', 5.5], ['6–7 h', 6.5], ['7–8 h', 7.5], ['Più di 8 h', 8.5]];
  const ENERGY = [[1, 'Bassa'], [2, 'Normale'], [3, 'Alta']];
  const PAIN = [[0, 'No'], [1, 'Un po\''], [2, 'Sì']];
  const sleepBucket = h => h < 6 ? 0 : h < 7 ? 1 : h < 8 ? 2 : 3;
  let editing = false;

  function setReady(dk, patch) {
    const all = Object.assign({}, ready());
    all[dk] = Object.assign({ sonno: null, energia: null, dolore: null, dove: '', light: false }, all[dk] || {}, patch);
    const ks = Object.keys(all).sort(); while (ks.length > 150) delete all[ks.shift()];
    A.store.set('ready', all);
  }

  // battito a riposo di oggi rispetto alla media degli ultimi 14 giorni con dati (almeno 4)
  function fcrDelta(dk) {
    const t = num(act(dk).fcr); if (t == null) return null;
    const W = wact(), vals = [];
    for (let i = 1; i <= 14; i++) { const a = W[addDays(dk, -i)], v = a && num(a.fcr); if (v != null && v > 25 && v < 160) vals.push(v); }
    if (vals.length < 4) return null;
    return Math.round(t - avg(vals));
  }

  function state(dk) {
    const r = Object.assign({ sonno: null, energia: null, dolore: null, dove: '', light: false }, ready()[dk] || {});
    const ws = num(act(dk).sonno), rs = num(r.sonno);
    const sonno = rs != null ? rs : (ws != null && ws > 0 && ws < 16 ? ws : null);
    const fromWatch = rs == null && sonno != null;
    const energia = [1, 2, 3].includes(r.energia) ? r.energia : null;
    const dolore = [0, 1, 2].includes(r.dolore) ? r.dolore : null;
    const complete = sonno != null && energia != null && dolore != null;
    const fd = fcrDelta(dk), fcrUp = fd != null && fd >= 7 ? fd : null;
    let level = null;
    if (complete) {
      const lowSleep = sonno < 6, lowEn = energia === 1;
      if ((lowSleep && lowEn) || dolore === 2) level = 'r';
      else if (lowSleep || lowEn || dolore === 1 || fcrUp) level = 'y';
      else level = 'g';
    }
    return { r, sonno, ws, fromWatch, energia, dolore, dove: String(r.dove || ''), light: !!r.light, complete, fcrUp, level };
  }

  const LEVEL = { g: ['Pronto', 'Oggi puoi allenarti come da scheda.'], y: ['Attenzione', 'Ascolta il corpo: se ti senti pesante, scegli la versione leggera.'], r: ['Leggero', 'Oggi seduta leggera o solo mobilità: recuperare adesso ti fa rendere di più domani.'] };
  const todayDay = () => A.dayById(A.TODAY_ID());
  const hasEx = d => !!d && (d.items || []).some(it => it.ex && A.EX[it.ex]);

  function tipsFor(s) {
    const out = [];
    const where = s.dove.trim() ? ' (' + esc(s.dove.trim()) + ')' : '';
    if (s.dolore === 2) out.push(`Con il dolore${where} salta i salti e gli sprint. Se il dolore resta, senti un fisioterapista.`);
    else if (s.dolore === 1) out.push(`Un po' di dolore${where}: scalda bene quella zona e fermati se peggiora.`);
    if (s.fcrUp) out.push(`Il battito a riposo è più alto del solito (+${s.fcrUp}): oggi tieni la seduta leggera.`);
    if (s.sonno != null && s.sonno < 6) out.push('Hai dormito poco: stasera vai a letto prima e punta a 8 ore.');
    if (s.energia === 1) out.push('Energia bassa: mangia carboidrati e bevi bene un paio d\'ore prima di allenarti.');
    return out;
  }

  function readyHTML(inDay) {
    const dk = todayKey(), s = state(dk), d = todayDay();
    const cls = 'panel rd-box' + (inDay ? ' rd-day' : ' sec');
    const showForm = !s.complete || editing;
    let body;
    if (showForm) {
      const sb = s.sonno != null ? sleepBucket(s.sonno) : -1;
      const btn = (k, v, lbl, on) => `<button type="button" data-rd="${k}|${v}" aria-pressed="${on}">${lbl}</button>`;
      body = `<div class="rd-head"><h3>Come stai oggi?</h3><span>3 tocchi</span></div>
        <div class="rd-q"><p class="rd-l">Sonno${s.fromWatch ? ` <em>dal Watch · ${h1(s.sonno)} h</em>` : ''}</p>
          <div class="rd-opts four" role="group" aria-label="Quanto hai dormito">${SLEEP.map((x, i) => btn('sonno', i, x[0], i === sb)).join('')}</div></div>
        <div class="rd-q"><p class="rd-l">Energia</p>
          <div class="rd-opts" role="group" aria-label="Energia">${ENERGY.map(x => btn('energia', x[0], x[1], s.energia === x[0])).join('')}</div></div>
        <div class="rd-q"><p class="rd-l">Dolori</p>
          <div class="rd-opts" role="group" aria-label="Dolori">${PAIN.map(x => btn('dolore', x[0], x[1], s.dolore === x[0])).join('')}</div></div>
        ${s.dolore ? `<label class="rd-dove">Dove?<input id="rd-dove" maxlength="40" autocomplete="off" enterkeyhint="done" placeholder="Es. ginocchio destro" value="${esc(s.dove)}"></label>` : ''}
        ${s.complete ? '<div class="f-act"><button type="button" class="sb-btn" data-rd-done>Fatto</button></div>' : '<p class="small">Tocca una risposta per ogni domanda.</p>'}`;
    } else {
      const parts = ['Sonno ' + SLEEP[sleepBucket(s.sonno)][0].toLowerCase() + (s.fromWatch ? ' (Watch)' : ''), 'energia ' + ENERGY.find(x => x[0] === s.energia)[1].toLowerCase(), s.dolore === 0 ? 'nessun dolore' : (s.dolore === 1 ? 'un po\' di dolore' : 'dolore') + (s.dove.trim() ? ': ' + esc(s.dove.trim()) : '')];
      body = `<div class="rd-row"><i class="rd-dot ${s.level}" aria-hidden="true"></i><div class="rd-t"><b>${LEVEL[s.level][0]}</b><small>${parts.join(' · ')}</small></div><button type="button" class="btn-ghost rd-chg" data-rd-edit>Cambia</button></div>`;
    }
    if (s.complete) {
      const lv = LEVEL[s.level];
      if (showForm) body += `<div class="rd-row rd-res"><i class="rd-dot ${s.level}" aria-hidden="true"></i><div class="rd-t"><b>${lv[0]}</b></div></div>`;
      body += `<p class="rd-msg">${lv[1]}</p>`;
      if (s.level !== 'g') {
        const tips = tipsFor(s);
        if (tips.length) body += `<ul class="rd-tips">${tips.map(t => `<li>${t}</li>`).join('')}</ul>`;
      }
      if (hasEx(d) && (s.level !== 'g' || s.light)) {
        body += `<label class="rd-light"><input type="checkbox" data-rd-light${s.light ? ' checked' : ''}><span><b>Versione leggera</b><small>Circa metà delle serie e carico −10%${inDay ? '' : ' nella scheda di oggi'}</small></span></label>`;
        if (s.light && !inDay) body += `<a class="rd-go" href="#${d.id}">Apri la scheda leggera <b>→</b></a>`;
      }
    } else if (s.fcrUp) {
      body += `<p class="rd-msg">Il battito a riposo è più alto del solito (+${s.fcrUp}): oggi tieni la seduta leggera.</p>`;
    }
    return `<section class="${cls}" id="rd-box">${body}</section>`;
  }

  /* versione leggera: circa metà delle serie (minimo 1) */
  function halfSets(s) {
    const m = /^(\d+)(?:\s*[–-]\s*(\d+))?(\s*×.*)$/.exec(String(s || ''));
    if (!m) return s;
    const n = +(m[2] || m[1]);
    return Math.max(1, Math.round(n / 2)) + m[3];
  }
  const JUMP = /salt|sprint|balz|jump|bound|pogo|scatt|partenz|hop\b|pliometr/;
  const isJump = ex => !!ex && (ex.cat === 'Pliometria' || JUMP.test(A.fold(ex.name || '')));
  function lightItem(it) {
    if (!/×/.test(String(it.s || ''))) return it; // tempi e metri senza × restano come sono
    const c = Object.assign({}, it);
    c.s = halfSets(it.s);
    c.note = (it.note ? it.note + ' · ' : '') + 'Versione leggera: carico −10%';
    return c;
  }
  H.item.push((it, d) => {
    if (!it || !d || d.id !== A.TODAY_ID()) return it;
    const s = state(todayKey());
    let out = it;
    if (s.light) out = lightItem(out);
    if (s.dolore === 2 && isJump(A.EX[it.ex])) out = Object.assign({}, out, { note: (out.note ? out.note + ' · ' : '') + 'Con il dolore di oggi: salta questo esercizio' });
    return out;
  });

  /* app.js ridisegna la barra delle serie con l'item originale dopo ogni tocco: qui la riporto alla versione leggera */
  function fixBars() {
    if (!state(todayKey()).light) return;
    const d = todayDay(); if (!d) return;
    const setsDone = obj('sets', {});
    document.querySelectorAll('.setbar[data-key]').forEach(sb => {
      const key = sb.dataset.key, it = (d.items || []).find(i => i.uid === key);
      if (!it) return;
      const ls = A.parseSets(halfSets(it.s));
      if (!ls || String(ls) === sb.dataset.sets) return;
      const rest = +sb.dataset.rest || 0, n = Math.min(+setsDone[key] || 0, ls);
      const hold = sb.querySelector('.sb-hold');
      const dots = ls > 1 ? `<span class="dots" aria-label="${n} serie su ${ls}">${Array.from({ length: ls }, (_, i) => `<i${i < n ? ' class="on"' : ''}></i>`).join('')}<span class="dots-l">${n}/${ls}</span></span>` : '';
      const main = ls > 1 ? `<button type="button" class="sb-btn sb-set" data-act="set">${n >= ls ? 'Serie finite ✓' : 'Serie fatta' + (rest ? ' · recupero ' + A.fmtSec(rest) : '')}</button>`
        : rest ? `<button type="button" class="sb-btn sb-set" data-act="rest">▶ Recupero ${A.fmtSec(rest)}</button>` : '';
      const undo = ls > 1 && n > 0 ? '<button type="button" class="sb-undo" data-act="undo" aria-label="Togli una serie">↺</button>' : '';
      sb.dataset.sets = ls;
      sb.innerHTML = `${dots}<span class="sb-acts">${hold ? hold.outerHTML : ''}${main}${undo}</span>`;
      if (ls > 1 && n >= ls && !A.done[key]) {
        A.done[key] = true; A.store.set('done', A.done);
        const card = sb.closest('.ex');
        if (card) { const cb = card.querySelector('.done input'); if (cb) cb.checked = true; card.classList.add('is-done'); }
      }
    });
  }
  document.addEventListener('fit:set', () => { try { fixBars(); } catch (e) { /* niente */ } });

  /* ---------- 2 · Riepilogo della settimana ---------- */
  const WATER_GOAL = isT ? 12 : 8;
  function rangeKeys(startKey, n) { return Array.from({ length: n }, (_, i) => addDays(startKey, i)); }
  function weekInfo() {
    const t = A.today0(), wd = (t.getDay() + 6) % 7, tk = A.dkey(t);
    const mon = addDays(tk, -wd);
    if (t.getDay() === 0) return { full: true, keys: rangeKeys(mon, 7) };
    if (wd <= 1) return { full: true, keys: rangeKeys(addDays(mon, -7), 7) };
    return { full: false, keys: rangeKeys(mon, wd + 1) };
  }
  function weekStats(keys) {
    const inR = new Set(keys), tk = todayKey();
    const L = obj('logs', {}), loads = obj('loads', {});
    const train = new Set(), donePk = new Set();
    Object.keys(L).forEach(dk => { if (inR.has(dk)) { train.add(dk); const v = L[dk] || {}; if (v.pk) donePk.add(v.pk); if (v.d) donePk.add('id:' + v.d); } });
    const TR = obj('trained', {});
    Object.keys(TR).forEach(dk => { if (inR.has(dk) && Array.isArray(TR[dk])) { train.add(dk); TR[dk].forEach(pk => donePk.add(pk)); } });
    Object.keys(loads).forEach(ex => { const a = loads[ex]; if (!Array.isArray(a)) return; a.forEach(s => { if (s && inR.has(s.d)) { train.add(s.d); if (s.u) donePk.add(String(s.u).split(':')[0]); } }); });
    const gyms = A.days().filter(d => d.type === 'gym').map(d => {
      const i = WEEK.indexOf(d.id), dk = i >= 0 && i < keys.length ? keys[i] : null;
      return { label: d.label, d: d.d, done: donePk.has(d.pk) || donePk.has('id:' + d.id), past: !!dk && dk < tk };
    });
    // peso medio e settimana prima
    const wl = A.wList(), prevKeys = new Set(rangeKeys(addDays(keys[0], -7), 7));
    const wNow = avg(wl.filter(x => inR.has(x[0])).map(x => x[1])), wPrev = avg(wl.filter(x => prevKeys.has(x[0])).map(x => x[1]));
    // cibo
    const fd = keys.map(dk => A.dayFood(dk)).filter(l => Array.isArray(l) && l.length).map(l => A.sumFood(l));
    // acqua
    const W = obj('water', {});
    const wDays = keys.filter(dk => num(W[dk]) != null);
    const waterOk = keys.filter(dk => (num(W[dk]) || 0) >= WATER_GOAL).length;
    // sonno
    const R = ready(), WA = wact();
    const sl = keys.map(dk => { const a = num((R[dk] || {}).sonno), b = num((WA[dk] || {}).sonno); return a != null ? a : b; }).filter(v => v != null && v > 1 && v < 16);
    return { n: keys.length, train: train.size, gyms, wNow, wPrev, foodDays: fd.length, p: avg(fd.map(x => x.p)), k: avg(fd.map(x => x.k)),
      waterAny: wDays.length > 0, waterOk, sleep: avg(sl), sleepN: sl.length };
  }
  function weekTips(st, full) {
    const M = A.MAC0, out = [];
    if (st.foodDays >= 2 && st.p != null && st.p < M.p[0] - 8) {
      const gap = M.p[0] - st.p;
      const fix = gap <= 25 ? 'aggiungi uno yogurt greco a merenda'
        : gap <= 50 ? (isT ? 'aggiungi uno yogurt greco a merenda e una porzione di carne o pesce in più a pranzo' : 'aggiungi uno yogurt greco a merenda e 2 uova a colazione')
          : 'metti carne, pesce, uova o legumi a ogni pasto e uno yogurt greco a merenda';
      out.push(`Le proteine sono state ${A.n0(st.p)} g su ${A.n0(M.p[0])}: ${fix}.`);
    }
    const missed = st.gyms.filter(g => !g.done && (full || g.past));
    if (st.train > 0 && missed.length) {
      const names = missed.map(g => esc(g.label)).join(' e la ');
      if (full) out.push(`Hai saltato la ${names}: questa settimana ${missed.length > 1 ? 'mettile' : 'mettila'} ${missed.map(g => g.d.toLowerCase()).join(' e ')}${isT ? '' : ', con un giorno di riposo tra due sedute'}.`);
      else out.push(`La ${names} non ${missed.length > 1 ? 'risultano' : 'risulta'}: recupera${missed.length > 1 ? 'le' : 'la'} nel prossimo giorno libero, o segna il diario se l'hai fatta.`);
    } else if (!st.train && full) out.push('Nessun allenamento segnato: dopo ogni seduta scrivi due righe nel diario o i carichi, così il riepilogo li conta.');
    if (st.wNow != null && st.wPrev != null) {
      const df = st.wNow - st.wPrev, s = sign1(df) + ' kg';
      if (isT) {
        if (df > -0.2) out.push(`Peso ${df > 0.2 ? 'in salita (' + s + ')' : 'stabile'}: per te va bene −0,4/0,6 kg a settimana, togli circa 200 kcal (per esempio metà porzione di pasta a cena).`);
        else if (df < -0.8) out.push(`Stai scendendo veloce (${s}): per te va bene −0,4/0,6 kg a settimana, aggiungi uno spuntino per non perdere muscolo.`);
        else out.push(`Peso ${s} in una settimana: il ritmo giusto (−0,4/0,6 kg), continua così.`);
      } else {
        if (df < -0.3) out.push(`Il peso scende (${s}): per te va bene stabile o leggermente su, aggiungi pane o frutta a colazione.`);
        else if (df > 0.6) out.push(`Peso ${s}: va bene se sale piano, controlla vita e fianchi ogni 4 settimane.`);
        else out.push(`Peso stabile (${s}): per te va bene stabile o leggermente su, continua così.`);
      }
    }
    if (st.sleepN >= 3 && st.sleep < 7) out.push(`Hai dormito in media ${h1(st.sleep)} h: prova ad andare a letto 30′ prima, ${isT ? 'il recupero per la partita passa da lì' : 'è mentre dormi che il muscolo cresce'}.`);
    if (st.foodDays >= 2 && st.k != null) {
      if (st.k < A.MAC0.kcal[0] - 250) out.push(`Calorie basse (media ${A.n0(st.k)} su ${A.n0(M.kcal[0])}): con troppo poco perdi muscolo, aggiungi pane o riso a pranzo.`);
      else if (st.k > A.MAC0.kcal[1] + 250) out.push(`Calorie sopra l'obiettivo (media ${A.n0(st.k)} su ${A.n0(M.kcal[1])}): taglia condimenti in più e dolci fuori pasto.`);
    }
    if (st.waterAny && st.waterOk < Math.ceil(st.n * 0.6)) out.push(`Acqua: ${WATER_GOAL} bicchieri raggiunti ${st.waterOk} giorni su ${st.n}: tieni una borraccia sempre a portata di mano.`);
    return out;
  }
  function rangeLabel(keys) {
    const a = A.kdate(keys[0]), b = A.kdate(keys[keys.length - 1]);
    return a.getMonth() === b.getMonth() ? A.fmt(a, { day: 'numeric' }) + '–' + A.fmt(b, { day: 'numeric', month: 'long' }) : A.fmt(a, { day: 'numeric', month: 'short' }) + '–' + A.fmt(b, { day: 'numeric', month: 'short' });
  }
  function weekHTML() {
    const w = weekInfo(), st = weekStats(w.keys), M = A.MAC0;
    const tips = weekTips(st, w.full);
    const gDone = st.gyms.filter(g => g.done).length;
    if (!w.full) {
      const bits = [`<b>${st.train}</b> ${st.train === 1 ? 'allenamento' : 'allenamenti'}`];
      if (st.gyms.length) bits.push(`palestre <b>${gDone}/${st.gyms.length}</b>`);
      if (st.p != null) bits.push(`proteine <b>${A.n0(st.p)}</b>/${A.n0(M.p[0])} g`);
      if (st.sleep != null) bits.push(`sonno <b>${h1(st.sleep)} h</b>`);
      if (st.waterAny) bits.push(`acqua <b>${st.waterOk}/${st.n}</b> giorni`);
      return `<section class="sec panel rd-wk-mini"><div class="rd-head"><h3>La settimana finora</h3><span>${rangeLabel(w.keys)}</span></div>
        <p class="rd-bits">${bits.join(' · ')}</p>${tips[0] ? `<p class="rd-tip1">${tips[0]}</p>` : ''}</section>`;
    }
    const stat = (big, lbl, sub, hot) => `<div class="rd-stat${hot ? ' hot' : ''}"><span>${lbl}</span><b>${big}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
    const wDiff = st.wNow != null && st.wPrev != null ? sign1(st.wNow - st.wPrev) + ' kg sulla settimana prima' : st.wNow != null ? 'nessun peso la settimana prima' : 'non segnato';
    const stats = [
      stat(`${st.train} ${st.train === 1 ? 'giorno' : 'giorni'}`, 'Allenamenti', st.gyms.length ? `palestre ${gDone} su ${st.gyms.length}` : '', true),
      stat(st.wNow != null ? A.kg(st.wNow) + ' kg' : '—', 'Peso medio', wDiff),
      stat(st.p != null ? A.n0(st.p) + ' g' : '—', 'Proteine', st.p != null ? `obiettivo ${A.n0(M.p[0])} g · ${st.foodDays} ${st.foodDays === 1 ? 'giorno' : 'giorni'} segnati` : 'cibo non segnato'),
      stat(st.k != null ? A.n0(st.k) : '—', 'Calorie', st.k != null ? `obiettivo ${A.n0(M.kcal[0])}–${A.n0(M.kcal[1])}` : 'cibo non segnato'),
      stat(st.waterAny ? `${st.waterOk}/${st.n}` : '—', 'Acqua', st.waterAny ? `giorni con ${WATER_GOAL} bicchieri` : 'non segnata'),
      stat(st.sleep != null ? h1(st.sleep) + ' h' : '—', 'Sonno medio', st.sleep != null ? `${st.sleepN} ${st.sleepN === 1 ? 'notte' : 'notti'}` : 'non segnato')
    ].join('');
    const gyms = st.gyms.length ? `<div class="rd-gyms">${st.gyms.map(g => `<span class="${g.done ? 'on' : ''}">${esc(g.label)} ${g.done ? '✓' : '—'}</span>`).join('')}</div>` : '';
    return `<section class="sec panel dark rd-week"><div class="rd-head"><h3>La tua settimana</h3><span>${rangeLabel(w.keys)}</span></div>
      <div class="rd-stats">${stats}</div>${gyms}
      ${tips.length ? `<ul class="rd-wtips">${tips.slice(0, 2).map(t => `<li>${t}</li>`).join('')}</ul>` : '<p class="small">Settimana in linea con la scheda: continua così.</p>'}</section>`;
  }

  H.home.push(() => readyHTML(false));
  H.home.push(() => weekHTML());
  H.dayTop.push(d => d && d.id === A.TODAY_ID() ? readyHTML(true) : '');

  /* ---------- 3 · Macro in base all'attività ---------- */
  function adjust(dk) {
    const out = { kcal: 0, c: 0, why: [] };
    const dt = A.kdate(dk); if (isNaN(dt)) return out;
    const d = A.dayById(WD[dt.getDay()]), type = d && d.type;
    if (isT) {
      const T = { field: [150, 35, 'campo'], match: [300, 70, 'partita'], act: [150, 35, 'attivazione'] }[type];
      if (T) { out.kcal += T[0]; out.c += T[1]; out.why.push([T[2], T[1], T[0]]); }
    } else if (type === 'gym') { out.kcal += 80; out.c += 20; out.why.push(['palestra', 20, 80]); }
    const kc = num(act(dk).kcal), lim = isT ? 800 : 500, max = isT ? 400 : 250;
    if (kc != null && kc > lim) {
      const ex = Math.min(max, Math.round((kc - lim) / 2)), g = Math.round(ex / 4);
      if (g > 0) { out.kcal += ex; out.c += g; out.why.push(['watch', g, ex, kc]); }
    }
    return out;
  }
  H.macros.push((dk, mac) => {
    if (!mac || !Array.isArray(mac.kcal) || !Array.isArray(mac.c)) return mac;
    const a = adjust(dk); if (!a.kcal && !a.c) return mac;
    const m = JSON.parse(JSON.stringify(mac));
    m.kcal = m.kcal.map(x => x + a.kcal); m.c = m.c.map(x => x + a.c);
    return m;
  });
  H.food.push(dk => {
    if (!dk) return '';
    const a = adjust(dk); if (!a.why.length) return '';
    const who = dk === todayKey() ? 'Oggi' : A.fmt(A.kdate(dk), { weekday: 'long' }).replace(/^./, c => c.toUpperCase());
    const txt = a.why.map(w => w[0] === 'watch' ? `${A.n0(w[3])} kcal attive dal Watch: +${w[1]} g di carboidrati` : `${w[0]}: +${w[1]} g di carboidrati`).join(' · ');
    return `<p class="rd-mac"><b>${who}</b> ${txt} <span>(+${A.n0(a.kcal)} kcal sugli obiettivi)</span></p>`;
  });

  /* ---------- 4 · Sonno e battito dal Watch ---------- */
  H.watch.push(() => {
    let code = null; try { code = localStorage.getItem('sf-wcode:' + (A.user() || '')); } catch (e) { code = null; }
    const u = location.origin + '/api/w/mattino?k=' + (code || '') + '&sonno=A&fcr=B';
    const steps = ['In <b>Comandi</b> apri <b>Automazione</b> → <b>+</b> → <b>Ora del giorno</b>: 07:30, ogni giorno, <b>Esegui immediatamente</b>.',
      '<b>Trova campioni di Salute</b>: <b>Analisi del sonno</b>, data di inizio <b>nelle ultime 12 ore</b>, valore <b>Dormito</b> (o «Sonno»).',
      '<b>Ottieni dettagli dei campioni di Salute</b>: <b>Durata</b>.',
      '<b>Calcola statistiche</b>: <b>Somma</b>. È il valore A.',
      'Ancora <b>Trova campioni di Salute</b>: <b>Frequenza cardiaca a riposo</b>, ordina per data dalla più recente, limite 1. È B.',
      '<b>Ottieni contenuti dell\'URL</b> con l\'indirizzo: al posto di A e B inserisci i due risultati.'];
    return `<section class="panel wt-sec"><h3>Sonno e battito al mattino</h3>
      <p class="small">Ogni mattina porta qui le ore di sonno e il battito a riposo: la domanda sul sonno di «Come stai oggi?» si compila da sola e ti avviso se il battito è più alto del solito.</p>
      ${code ? `<div class="wt-url"><span>Indirizzo</span><code>${esc(u)}</code><button type="button" class="btn-ghost wt-copy" data-copy="${esc(u)}">Copia</button></div>` : '<p class="small"><b>Prima crea il codice al punto 1.</b></p>'}
      <ol class="wt-steps">${steps.map(x => `<li>${x}</li>`).join('')}</ol>
      <p class="small">Il sonno può arrivare in ore, minuti o secondi: il server lo capisce da solo.</p></section>`;
  });

  /* ---------- eventi ---------- */
  function saveDove() {
    const inp = document.getElementById('rd-dove');
    if (!inp) return;
    const v = inp.value.trim().slice(0, 40), dk = todayKey();
    if (v !== state(dk).dove) setReady(dk, { dove: v });
  }
  H.click.push(e => {
    const t = e.target;
    if (t.closest('.setbar [data-act="undo"]')) { setTimeout(() => { try { fixBars(); } catch (x) { /* niente */ } }, 0); return false; }
    const b = t.closest('[data-rd]');
    if (b) {
      const [k, v] = b.dataset.rd.split('|'), dk = todayKey(), was = state(dk).complete;
      const patch = k === 'sonno' ? { sonno: (SLEEP[+v] || SLEEP[2])[1] } : k === 'energia' ? { energia: +v } : { dolore: +v };
      if (k === 'dolore' && +v === 0) patch.dove = '';
      saveDove(); setReady(dk, patch);
      const now = state(dk);
      if (!was && now.complete) editing = now.dolore > 0;
      A.buzz(); A.route(true); return true;
    }
    if (t.closest('[data-rd-edit]')) { editing = true; A.buzz(); A.route(true); return true; }
    if (t.closest('[data-rd-done]')) { saveDove(); editing = false; A.buzz(); A.route(true); return true; }
    return false;
  });
  H.change.push(e => {
    const t = e.target;
    if (t.matches && t.matches('[data-rd-light]')) { setReady(todayKey(), { light: !!t.checked }); A.buzz(); A.route(true); return true; }
    if (t.id === 'rd-dove') { saveDove(); return true; }
    return false;
  });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'rd-dove') { e.preventDefault(); e.target.blur(); } });

  /* ---------- stile ---------- */
  if (!document.getElementById('sf-daily')) {
    const st = document.createElement('style'); st.id = 'sf-daily';
    st.textContent = `
.rd-day { margin: 12px 0; }
.rd-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.rd-head h3 { margin: 0; }
.rd-head span { font-size: 13px; color: var(--ink-muted); }
.panel.dark .rd-head span { color: var(--on-iron-muted); }
.rd-q { margin-top: 12px; }
.rd-l { margin: 0 0 6px; font: 700 15px/1.2 var(--display); text-transform: uppercase; letter-spacing: .06em; }
.rd-l em { font: 600 12px/1 var(--body); text-transform: none; letter-spacing: 0; font-style: normal; color: var(--on-iron); background: var(--iron); padding: 3px 8px; border-radius: 999px; margin-left: 6px; }
.rd-opts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.rd-opts.four { grid-template-columns: repeat(2, minmax(0, 1fr)); }
@media (min-width: 560px) { .rd-opts.four { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.rd-opts button { min-height: 44px; padding: 6px 8px; border-radius: 999px; border: 1px solid var(--steel-line); background: #fff; color: var(--ink); font: 700 14px/1.15 var(--body); cursor: pointer; }
.rd-opts button[aria-pressed="true"] { background: var(--iron); color: var(--on-iron); border-color: var(--iron); }
.rd-dove { display: block; margin-top: 12px; font-size: 13px; font-weight: 700; color: var(--ink-muted); }
.rd-dove input { display: block; width: 100%; margin-top: 4px; min-height: 44px; padding: 8px 12px; font: 16px/1.2 var(--body); border-radius: 10px; border: 1px solid var(--steel-line); background: #fff; color: var(--ink); }
.rd-row { display: flex; align-items: center; gap: 12px; }
.rd-res { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--steel-line); }
.rd-dot { flex: none; width: 16px; height: 16px; border-radius: 50%; box-shadow: 0 0 0 3px var(--steel-light), 0 0 0 4px var(--steel-line); }
.rd-dot.g { background: #2F9E57; } .rd-dot.y { background: #E8B10C; } .rd-dot.r { background: var(--fire); }
.rd-t { flex: 1; min-width: 0; }
.rd-t b { display: block; font: 800 22px/1.05 var(--display); text-transform: uppercase; }
.rd-t small { display: block; font-size: 13px; color: var(--ink-muted); overflow-wrap: anywhere; }
.rd-chg { min-height: 40px; flex: none; }
.rd-msg { margin: 10px 0 0; font-size: 15px; }
.rd-tips { margin: 8px 0 0; padding-left: 20px; font-size: 14px; }
.rd-tips li { margin: 4px 0; }
.rd-light { display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 10px; align-items: center; margin-top: 12px; padding: 10px 12px; min-height: 48px; border-radius: 12px; background: #fff; border: 1px solid var(--steel-line); cursor: pointer; }
.rd-light input { width: 22px; height: 22px; accent-color: var(--fire); margin: 0; }
.rd-light b { display: block; font-size: 15px; }
.rd-light small { display: block; font-size: 12px; color: var(--ink-muted); }
.rd-go { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; margin-top: 6px; font-weight: 700; color: var(--ink); text-decoration: none; }
.rd-go b { color: var(--fire); }
.rd-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
@media (min-width: 640px) { .rd-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.rd-stat { background: var(--iron-2); border-radius: 10px; padding: 10px 12px; min-width: 0; }
.rd-stat span { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--on-iron-muted); }
.rd-stat b { display: block; font: 800 24px/1.1 var(--display); color: var(--on-iron); margin-top: 2px; }
.rd-stat.hot b { color: var(--fire-bright); }
.rd-stat small { display: block; font-size: 12px; line-height: 1.3; color: var(--on-iron-muted); margin-top: 2px; }
.rd-gyms { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.rd-gyms span { font: 700 13px/1 var(--display); text-transform: uppercase; letter-spacing: .06em; padding: 6px 10px; border-radius: 4px; background: var(--iron-3); color: var(--on-iron-muted); }
.rd-gyms span.on { background: var(--fire); color: #fff; }
.rd-wtips { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 8px; }
.rd-wtips li { border-left: 3px solid var(--fire-bright); padding: 2px 0 2px 10px; font-size: 14px; line-height: 1.45; }
.rd-bits { margin: 8px 0 0; font-size: 14px; }
.rd-tip1 { margin: 8px 0 0; font-size: 14px; border-left: 3px solid var(--fire); padding-left: 10px; }
.rd-wk-mini h3 { font-size: 20px; }
.rd-mac { margin: 12px 0; padding: 10px 12px; border-left: 3px solid var(--fire); background: var(--steel-light); border-radius: 0 10px 10px 0; font-size: 14px; }
.rd-mac span { color: var(--ink-muted); }
`;
    document.head.appendChild(st);
  }
});
