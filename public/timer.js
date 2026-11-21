/* Progetto Missile — timer di recupero (conto alla rovescia) e cronometro */
(function () {
  const bar = document.createElement('div');
  bar.className = 'timer';
  bar.id = 'timer';
  bar.hidden = true;
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Timer');
  bar.innerHTML = `<div class="t-prog"><i></i></div>
    <div class="wrap t-in">
      <div class="t-info"><span class="t-kind"></span><span class="t-label"></span></div>
      <div class="t-time" aria-live="off">0:00</div>
      <div class="t-ctrl">
        <button type="button" data-t="minus" class="t-adj">−15″</button>
        <button type="button" data-t="plus" class="t-adj">+15″</button>
        <button type="button" data-t="lap" class="t-sw">Giro</button>
        <button type="button" data-t="reset" class="t-sw">Azzera</button>
        <button type="button" data-t="toggle" class="t-main">Pausa</button>
        <button type="button" data-t="pick" class="t-back" aria-label="Scegli un altro tempo">⏱</button>
        <button type="button" data-t="close" class="t-x" aria-label="Chiudi il timer">✕</button>
      </div>
    </div>
    <div class="wrap t-pick">
      <div class="t-info"><span class="t-kind">Recupero</span><span class="t-label">Scegli quanto riposare</span></div>
      <div class="t-presets">
        <button type="button" data-preset="30">30″</button><button type="button" data-preset="45">45″</button>
        <button type="button" data-preset="60">1′</button><button type="button" data-preset="90">1′30″</button>
        <button type="button" data-preset="120">2′</button><button type="button" data-preset="150">2′30″</button>
        <button type="button" data-preset="180">3′</button>
        <button type="button" data-t="sw" class="t-swbtn">Cronometro libero</button>
        <button type="button" data-t="close" class="t-x" aria-label="Chiudi il timer">✕</button>
      </div>
    </div>
    <div class="wrap t-laps" hidden></div>
    <p class="t-sr" aria-live="assertive"></p>`;
  document.body.appendChild(bar);
  const $ = s => bar.querySelector(s);
  const elTime = $('.t-time'), elKind = $('.t-kind'), elLabel = $('.t-label'), elProg = $('.t-prog i'), elToggle = $('[data-t="toggle"]'), elLaps = $('.t-laps'), elSr = $('.t-sr');

  const S = { mode: null, total: 0, remain: 0, endAt: 0, running: false, swStart: 0, swAcc: 0, laps: [], lastBeep: null, finished: false, kind: '' };
  let iv = null, audio = null, wake = null;

  const fmt = ms => {
    const t = Math.max(0, ms), s = Math.floor(t / 1000), m = Math.floor(s / 60);
    return S.mode === 'sw' ? `${m}:${String(s % 60).padStart(2, '0')}.${Math.floor((t % 1000) / 100)}` : `${m}:${String(s % 60).padStart(2, '0')}`;
  };
  function beep(freq, dur, when) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audio.currentTime + (when || 0);
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'square'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(audio.destination); o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) { /* audio non disponibile */ }
  }
  async function keepAwake(on) {
    try {
      if (on && !wake && navigator.wakeLock) wake = await navigator.wakeLock.request('screen');
      if (!on && wake) { await wake.release(); wake = null; }
    } catch (e) { wake = null; }
  }
  function show() {
    bar.hidden = false; document.body.classList.add('has-timer');
    bar.classList.toggle('is-sw', S.mode === 'sw');
    bar.classList.toggle('is-pick', S.mode === 'pick');
    keepAwake(true);
    if (!iv) iv = setInterval(tick, 100);
  }
  function close() {
    bar.hidden = true; document.body.classList.remove('has-timer');
    bar.classList.remove('is-done');
    S.running = false; S.mode = null;
    clearInterval(iv); iv = null; keepAwake(false);
  }
  function render() {
    if (S.mode === 'cd') {
      const left = S.running ? S.endAt - Date.now() : S.remain;
      elTime.textContent = fmt(left + 999);
      elProg.style.width = (S.total ? Math.max(0, Math.min(1, 1 - left / (S.total * 1000))) * 100 : 0) + '%';
    } else if (S.mode === 'sw') {
      const el = S.swAcc + (S.running ? Date.now() - S.swStart : 0);
      elTime.textContent = fmt(el);
      elProg.style.width = ((el % 60000) / 600) + '%';
    }
    elToggle.textContent = S.finished ? 'Ricomincia' : S.running ? 'Pausa' : (S.mode === 'sw' && !S.swAcc ? 'Avvia' : 'Riprendi');
  }
  function tick() {
    if (S.mode === 'cd' && S.running) {
      const left = S.endAt - Date.now();
      const sec = Math.ceil(left / 1000);
      if (sec <= 3 && sec >= 1 && S.lastBeep !== sec) { S.lastBeep = sec; beep(880, 0.12); }
      if (left <= 0) {
        S.running = false; S.remain = 0; S.finished = true;
        beep(1320, 0.35); beep(1320, 0.5, 0.45);
        try { navigator.vibrate && navigator.vibrate([250, 120, 250]); } catch (e) { /* niente */ }
        bar.classList.add('is-done');
        elKind.textContent = S.kind === 'hold' ? 'Tempo!' : 'Vai!';
        elSr.textContent = S.kind === 'hold' ? 'Tempo finito' : 'Recupero finito: prossima serie';
        if (S.onDone) S.onDone();
      }
    }
    render();
  }

  /* Conto alla rovescia. kind: 'rest' (recupero) oppure 'hold' (tenuta / durata) */
  function countdown(sec, label, kind) {
    S.mode = 'cd'; S.kind = kind || 'rest'; S.total = sec; S.remain = sec * 1000; S.endAt = Date.now() + S.remain;
    S.running = true; S.finished = false; S.lastBeep = null; S.label = label;
    bar.classList.remove('is-done');
    elKind.textContent = S.kind === 'hold' ? 'Tempo' : 'Recupero';
    elLabel.textContent = label || '';
    elLaps.hidden = true;
    beep(660, 0.06);
    show(); render();
  }
  function stopwatch() {
    S.mode = 'sw'; S.running = false; S.swAcc = 0; S.laps = []; S.finished = false;
    bar.classList.remove('is-done');
    elKind.textContent = 'Cronometro';
    elLabel.textContent = 'Per sprint, tenute e test';
    elLaps.hidden = true; elLaps.innerHTML = '';
    show(); render();
  }
  /* Scelta rapida: recupero a tempo fisso oppure cronometro libero */
  function picker() {
    S.mode = 'pick'; S.running = false; S.finished = false;
    bar.classList.remove('is-done');
    elLaps.hidden = true;
    show();
  }
  function renderLaps() {
    elLaps.hidden = !S.laps.length;
    elLaps.innerHTML = S.laps.map((l, i) => `<span><b>Giro ${i + 1}</b> ${fmt(l)}</span>`).join('');
  }

  bar.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const a = b.dataset.t;
    if (a === 'close') return close();
    if (b.dataset.preset) return countdown(+b.dataset.preset, 'Recupero a tempo', 'rest');
    if (a === 'sw') { stopwatch(); S.swStart = Date.now(); S.running = true; elLabel.textContent = 'Quanto stai riposando'; return render(); }
    if (a === 'pick') return picker();
    if (S.mode === 'cd') {
      if (a === 'plus' || a === 'minus') {
        const d = (a === 'plus' ? 15 : -15) * 1000;
        if (S.running) S.endAt = Math.max(Date.now() + 1000, S.endAt + d); else S.remain = Math.max(1000, S.remain + d);
        S.total = Math.max(S.total + d / 1000, 1);
        if (S.finished) { S.finished = false; bar.classList.remove('is-done'); S.running = true; S.endAt = Date.now() + Math.max(1000, d); S.lastBeep = null; elKind.textContent = S.kind === 'hold' ? 'Tempo' : 'Recupero'; }
      }
      if (a === 'toggle') {
        if (S.finished) return countdown(S.total, S.label, S.kind);
        if (S.running) { S.remain = S.endAt - Date.now(); S.running = false; } else { S.endAt = Date.now() + S.remain; S.running = true; }
      }
    } else if (S.mode === 'sw') {
      if (a === 'toggle') { if (S.running) { S.swAcc += Date.now() - S.swStart; S.running = false; } else { S.swStart = Date.now(); S.running = true; beep(660, 0.06); } }
      if (a === 'reset') { S.running = false; S.swAcc = 0; S.laps = []; renderLaps(); }
      if (a === 'lap') { const el = S.swAcc + (S.running ? Date.now() - S.swStart : 0); if (el > 0) { S.laps.push(el); renderLaps(); } }
    }
    render();
  });
  document.addEventListener('visibilitychange', () => { if (!bar.hidden && document.visibilityState === 'visible') keepAwake(true).then(render); });

  window.MissileTimer = { countdown, stopwatch, picker, close };
})();
