/* starfit+ — Novità: schede da sfogliare una volta sola dopo un aggiornamento importante,
   e avviso "starfit+ è stato aggiornato" quando arriva una versione nuova. */
(window.FitPlugins = window.FitPlugins || []).push(function (A) {
  const NEWS = 'v2'; // cambia quando ci sono novità da raccontare
  const css = `
.nw { position: fixed; inset: 0; z-index: 90; background: rgba(17,19,22,.72); display: flex; align-items: flex-end; justify-content: center; padding: 16px; padding-bottom: max(16px, env(safe-area-inset-bottom)); }
@media (min-width: 761px) { .nw { align-items: center; } }
.nw-card { width: 100%; max-width: 440px; background: var(--iron); color: var(--on-iron); border-radius: 20px; padding: 22px 20px 18px; box-shadow: 0 20px 60px rgba(0,0,0,.45); border-top: 4px solid var(--fire); }
.nw-ic { width: 52px; height: 52px; border-radius: 14px; background: var(--fire); color: #fff; display: grid; place-items: center; font: 800 26px/1 var(--display); margin-bottom: 14px; }
.nw-k { font: 700 12px/1 var(--display); letter-spacing: .14em; text-transform: uppercase; color: var(--fire-bright); margin: 0 0 6px; }
.nw-t { font: 800 30px/1 var(--display); font-style: italic; text-transform: uppercase; margin: 0 0 10px; }
.nw-p { font-size: 16px; line-height: 1.45; color: var(--on-iron); margin: 0; min-height: 92px; }
.nw-w { font-size: 13px; color: var(--on-iron-muted); margin: 10px 0 0; }
.nw-dots { display: flex; gap: 6px; justify-content: center; margin: 16px 0 12px; }
.nw-dots i { width: 7px; height: 7px; border-radius: 50%; background: var(--iron-3); }
.nw-dots i.on { background: var(--fire-bright); width: 18px; border-radius: 4px; }
.nw-act { display: flex; gap: 10px; align-items: center; }
.nw-act .sb-btn { flex: 1; min-height: 48px; font-size: 16px; }
.nw-skip { background: none; border: 0; color: var(--on-iron-muted); font: 600 14px/1 inherit; padding: 12px 6px; min-height: 44px; cursor: pointer; }
.nw-go { display: inline-block; margin-top: 10px; color: var(--fire-bright); font-weight: 700; text-decoration: none; }
.nw-upd { position: fixed; left: 50%; transform: translateX(-50%); top: max(10px, env(safe-area-inset-top)); z-index: 95; background: var(--iron); color: var(--on-iron); border: 1px solid var(--fire); border-radius: 999px; padding: 10px 16px; font: 600 14px/1.2 inherit; box-shadow: 0 8px 30px rgba(0,0,0,.35); cursor: pointer; max-width: calc(100% - 32px); }
.nw-upd b { color: var(--fire-bright); }`;
  const st = document.createElement('style'); st.id = 'sf-news'; st.textContent = css; document.head.appendChild(st);

  const ter = A.PROG.id === 'terzino';
  const slides = [
    ['+', 'Novità', 'starfit+ è cresciuto', 'Ecco cosa c\'è di nuovo: ci vuole un minuto. Puoi saltare quando vuoi.'],
    ['▶', 'Allenamento', 'Modalità allenamento', 'Nei giorni di palestra tocca «Inizia l\'allenamento»: un esercizio alla volta a tutto schermo, recupero che parte da solo e schermo sempre acceso.'],
    ['kg', 'Progressi', 'Carichi e record', 'A ogni serie scrivi kg e ripetizioni: la volta dopo ti dico che carico usare. I record e il grafico dei progressi compaiono da soli.'],
    ['✓', 'Ogni mattina', 'Come stai oggi?', 'Tre tocchi: sonno, energia e dolori. Se sei stanco o hai male, ti propongo la versione leggera della seduta.'],
    ['⇄', 'Corpo', 'Foto e misure', ter ? 'Ogni 4 settimane foto e misure (vita, petto…): vedi come cambi davvero. Le foto restano solo sul tuo iPhone.' : 'Ogni 4 settimane foto e misure (fianchi, cosce…): vedi come cambia il corpo, non solo il peso. Le foto restano solo sul tuo iPhone.'],
    ['↺', 'Cibo', 'Codice a barre e preferiti', 'Inquadri l\'etichetta e i valori arrivano da soli. Poi pasti preferiti, «Ripeti ieri», lista della spesa e acqua. Gli obiettivi cambiano con il tipo di giorno.'],
    ['⌚', 'Apple Watch', 'Dal polso', 'Scheda di oggi, prossimo esercizio, recupero, peso, calendario e promemoria. La trovi nel menu (il logo al centro, in basso) → Apple Watch.', '#watch', 'Apri la pagina Apple Watch →'],
    ['★', 'Insieme', 'Sfida della settimana', 'Una sfida della costanza con gli altri di starfit+: punti per allenamenti, peso, cibo e acqua. Si vedono solo i punti. La trovi nella pagina Io.']
  ];
  let i = 0, box = null, x0 = null;
  const seen = () => A.store.get('news-seen', '') === NEWS;
  function paint() {
    const s = slides[i], last = i === slides.length - 1;
    box.innerHTML = `<div class="nw-card" role="dialog" aria-modal="true" aria-labelledby="nw-t">
      <div class="nw-ic" aria-hidden="true">${s[0]}</div><p class="nw-k">${A.esc(s[1])} · ${i + 1} di ${slides.length}</p>
      <h2 class="nw-t" id="nw-t">${A.esc(s[2])}</h2><p class="nw-p">${A.esc(s[3])}</p>
      ${s[4] ? `<a class="nw-go" href="${s[4]}" data-nw="close">${A.esc(s[5])}</a>` : ''}
      <div class="nw-dots" aria-hidden="true">${slides.map((x, k) => `<i${k === i ? ' class="on"' : ''}></i>`).join('')}</div>
      <div class="nw-act">${last ? '' : '<button type="button" class="nw-skip" data-nw="close">Salta</button>'}${i > 0 ? '<button type="button" class="btn-ghost" data-nw="prev" aria-label="Indietro">←</button>' : ''}<button type="button" class="sb-btn" data-nw="${last ? 'close' : 'next'}">${last ? 'Inizia' : 'Avanti'}</button></div></div>`;
  }
  function close() { if (!box) return; box.remove(); box = null; A.store.set('news-seen', NEWS); document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (!box) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowRight' && i < slides.length - 1) { i++; paint(); } if (e.key === 'ArrowLeft' && i > 0) { i--; paint(); } }
  function open() {
    if (box || seen()) return;
    i = 0; box = document.createElement('div'); box.className = 'nw'; paint(); document.body.appendChild(box);
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-nw]');
      if (!b) { if (e.target === box) close(); return; }
      const a = b.dataset.nw;
      if (a === 'next' && i < slides.length - 1) { i++; paint(); }
      else if (a === 'prev' && i > 0) { i--; paint(); }
      else if (a === 'close') close();
    });
    box.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) < 50) return; if (dx < 0 && i < slides.length - 1) i++; else if (dx > 0 && i > 0) i--; paint(); }, { passive: true });
    document.addEventListener('keydown', onKey);
    const go = box.querySelector('[data-nw="next"]'); if (go) setTimeout(() => go.focus({ preventScroll: true }), 50);
  }
  // Dopo il primo disegno, solo se l'utente non l'ha già vista
  let tried = false;
  A.hooks.after.push(() => { if (tried) return; tried = true; if (!seen()) setTimeout(open, 600); });

  // Versione nuova installata in sottofondo: avviso discreto per ricaricare
  if ('serviceWorker' in navigator) {
    const had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!had || document.querySelector('.nw-upd')) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'nw-upd';
      b.innerHTML = 'starfit+ è stato aggiornato · <b>Tocca per aprire la versione nuova</b>';
      b.addEventListener('click', () => location.reload());
      document.body.appendChild(b);
    });
  }
});
