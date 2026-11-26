/* starfit+ — account: accesso una volta sola, dati salvati nell'account e sincronizzati.
   La sessione resta sul dispositivo finché non premi "Esci".
   Funziona anche offline: le modifiche si salvano sul telefono e partono appena torna la rete. */
(function () {
  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* niente */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* niente */ } }
  };
  const S = { token: LS.get('sf-token'), user: LS.get('sf-user'), doc: null, dirty: false, timer: null, status: 'ok' };
  const readyCbs = [], remoteCbs = [];
  let isReady = false;

  async function api(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (S.token) headers.Authorization = 'Bearer ' + S.token;
    const r = await fetch('api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
    let j = {};
    try { j = await r.json(); } catch (e) { /* risposta vuota */ }
    if (!r.ok) { const err = new Error(j.error || 'Errore ' + r.status); err.status = r.status; throw err; }
    return j;
  }

  /* ---------- dati locali ---------- */
  const docKey = () => 'sf-doc:' + S.user;
  function saveLocal() { LS.set(docKey(), JSON.stringify(S.doc)); LS.set(docKey() + ':dirty', S.dirty ? '1' : ''); }
  function loadLocal() {
    try { S.doc = JSON.parse(LS.get(docKey()) || 'null'); } catch (e) { S.doc = null; }
    S.dirty = LS.get(docKey() + ':dirty') === '1';
  }
  // Porta nell'account quello che era già salvato su questo telefono prima degli account
  function migrateOld() {
    const doc = {};
    [['done', 'done'], ['sets', 'sets'], ['tests', 'tests'], ['media', 'media'], ['speed', 'speed'], ['install-ok', 'install-ok']].forEach(([old, k]) => {
      const v = LS.get('pm-' + old);
      if (v != null) { try { doc[k] = JSON.parse(v); } catch (e) { /* niente */ } }
    });
    return doc;
  }

  const store = {
    get(k, d) { const v = S.doc ? S.doc[k] : undefined; return v === undefined ? d : JSON.parse(JSON.stringify(v)); },
    set(k, v) { if (!S.doc) return; S.doc[k] = v; S.doc.localAt = Date.now(); S.dirty = true; saveLocal(); schedule(); }
  };

  /* ---------- sincronizzazione ---------- */
  function setStatus(s) {
    S.status = s;
    const el = document.getElementById('acct-status');
    if (el) el.textContent = statusText();
    const b = document.getElementById('acct');
    if (b) b.dataset.status = s;
  }
  const statusText = () => S.status === 'saving' ? 'Salvataggio in corso…' : S.status === 'offline' ? 'Offline: salvo appena torna la rete' : 'Tutto salvato nell\'account';
  function schedule() { clearTimeout(S.timer); setStatus('saving'); S.timer = setTimeout(push, 1000); }
  async function push() {
    clearTimeout(S.timer);
    if (!S.token || !S.doc) return;
    if (!S.dirty) return setStatus('ok');
    const sent = S.doc.localAt;
    try {
      await api('PUT', '/data', { data: S.doc });
      if (S.doc.localAt === sent) { S.dirty = false; saveLocal(); setStatus('ok'); } else schedule();
    } catch (e) {
      if (e.status === 401) return expired();
      setStatus('offline');
    }
  }
  /* Quello che arriva dall'Apple Watch e dai comandi rapidi (esercizi fatti, peso, attività):
     si aggiunge ai dati dell'app, una volta sola per ogni voce. */
  function applyWx(wx) {
    if (!wx || !S.doc) return false;
    const since = S.doc.wxAt || 0, reset = S.doc.doneResetAt || 0;
    let max = since, ch = false;
    (wx.done || []).forEach(e => {
      if (e.t > since) { if (e.t > reset) { S.doc.done = S.doc.done || {}; if (!S.doc.done[e.u]) { S.doc.done[e.u] = true; ch = true; } } max = Math.max(max, e.t); }
    });
    Object.entries(wx.w || {}).forEach(([d, v]) => { if (v.t > since) { S.doc.weights = S.doc.weights || {}; S.doc.weights[d] = v.kg; ch = true; max = Math.max(max, v.t); } });
    Object.entries(wx.act || {}).forEach(([d, v]) => { if (v.t > since) { S.doc.watchAct = S.doc.watchAct || {}; S.doc.watchAct[d] = { kcal: v.kcal, min: v.min, passi: v.passi, fcr: v.fcr }; ch = true; max = Math.max(max, v.t); } });
    if (max > since) { S.doc.wxAt = max; S.doc.localAt = Date.now(); S.dirty = true; saveLocal(); schedule(); }
    return ch;
  }
  const remote = () => remoteCbs.forEach(f => { try { f(); } catch (e) { /* niente */ } });
  async function refresh() {
    if (!S.token) return;
    try {
      const r = await api('GET', '/me');
      if (S.dirty) { if (applyWx(r.wx)) remote(); return push(); }
      if (r.data && JSON.stringify(r.data) !== JSON.stringify(S.doc)) {
        S.doc = r.data; saveLocal(); applyWx(r.wx);
        remote();
      } else if (applyWx(r.wx)) remote();
      setStatus('ok');
    } catch (e) {
      if (e.status === 401) return expired();
      setStatus(S.dirty ? 'offline' : 'ok');
    }
  }
  window.addEventListener('online', push);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') push(); else refresh(); });
  // Mentre l'app è aperta, ogni 45″ controlla se dall'orologio è arrivato qualcosa
  setInterval(() => { if (document.visibilityState === 'visible' && navigator.onLine !== false && isReady) refresh(); }, 45000);

  /* ---------- sessione ---------- */
  function ready() {
    isReady = true;
    document.body.classList.remove('auth-mode');
    const a = document.getElementById('auth'); if (a) a.remove();
    paintAccount();
    readyCbs.splice(0).forEach(f => f());
  }
  function clearSession() { LS.del('sf-token'); LS.del('sf-user'); S.token = null; }
  function expired() { clearSession(); location.reload(); }
  async function logout() {
    await push().catch(() => {});
    try { await api('POST', '/logout'); } catch (e) { /* già scaduta */ }
    LS.del(docKey()); LS.del(docKey() + ':dirty');
    clearSession();
    location.reload();
  }

  async function boot() {
    if (!S.token || !S.user) return showAuth();
    loadLocal();
    if (S.doc) { ready(); refresh(); return; }
    try {
      const r = await api('GET', '/me');
      S.doc = r.data || migrateOld();
      if (!r.data) { S.dirty = true; schedule(); }
      applyWx(r.wx);
      saveLocal(); ready();
    } catch (e) {
      if (e.status === 401) { clearSession(); return showAuth('La sessione è scaduta: accedi di nuovo.'); }
      showAuth('Non riesco a collegarmi. Controlla la connessione e riprova.');
    }
  }

  /* ---------- schermata di accesso ---------- */
  function showAuth(msg) {
    document.body.classList.add('auth-mode');
    let box = document.getElementById('auth');
    if (box) box.remove();
    box = document.createElement('section');
    box.id = 'auth';
    box.className = 'auth';
    box.innerHTML = `<div class="auth-in">
      <p class="auth-brand">starfit<em>+</em></p>
      <p class="auth-sub">Accedi per aprire la tua scheda.</p>
      <form class="auth-form" id="auth-form" novalidate>
        <label for="auth-user">Nome utente</label>
        <input id="auth-user" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" inputmode="text" required minlength="3" maxlength="24">
        <label for="auth-pass">Password</label>
        <div class="auth-pw"><input id="auth-pass" name="password" type="password" autocomplete="current-password" required minlength="4">
          <button type="button" class="auth-eye" id="auth-eye" aria-label="Mostra la password">Mostra</button></div>
        <p class="auth-err" id="auth-err" role="alert"${msg ? '' : ' hidden'}></p>
        <button type="submit" class="auth-go" id="auth-go">Accedi</button>
        <p class="auth-note">Accedi una volta: su questo telefono resti dentro finché non premi Esci.<br>Non hai un account? Chiedilo a chi gestisce starfit+.</p>
      </form>
    </div>`;
    document.body.appendChild(box);
    const err = box.querySelector('#auth-err');
    if (msg) err.textContent = msg;
    box.querySelector('#auth-eye').addEventListener('click', e => {
      const p = box.querySelector('#auth-pass'), show = p.type === 'password';
      p.type = show ? 'text' : 'password';
      e.currentTarget.textContent = show ? 'Nascondi' : 'Mostra';
      e.currentTarget.setAttribute('aria-label', show ? 'Nascondi la password' : 'Mostra la password');
    });
    box.querySelector('#auth-form').addEventListener('submit', async e => {
      e.preventDefault();
      const user = box.querySelector('#auth-user').value.trim().toLowerCase();
      const pass = box.querySelector('#auth-pass').value;
      const go = box.querySelector('#auth-go');
      if (!user) { err.textContent = 'Scrivi il nome utente.'; err.hidden = false; return; }
      if (!pass) { err.textContent = 'Scrivi la password.'; err.hidden = false; return; }
      go.disabled = true; go.textContent = 'Accesso…'; err.hidden = true;
      try {
        const r = await api('POST', '/login', { user, pass });
        S.token = r.token; S.user = r.user;
        LS.set('sf-token', r.token); LS.set('sf-user', r.user);
        S.doc = r.data || migrateOld();
        S.dirty = !r.data;
        applyWx(r.wx);
        saveLocal();
        if (S.dirty) schedule();
        ready();
      } catch (ex) {
        err.textContent = ex.status ? ex.message : 'Non riesco a collegarmi. Controlla la connessione e riprova.';
        err.hidden = false;
        go.disabled = false; go.textContent = 'Accedi';
      }
    });
    setTimeout(() => { const u = box.querySelector('#auth-user'); if (u && window.matchMedia('(min-width: 761px)').matches) u.focus(); }, 50);
  }

  /* ---------- pulsante account nella testata ---------- */
  function paintAccount() {
    const b = document.getElementById('acct'), menu = document.getElementById('acct-menu');
    if (!b || !menu) return;
    b.hidden = false;
    b.querySelector('.acct-i').textContent = (S.user || '?').charAt(0).toUpperCase();
    menu.querySelector('.acct-name').textContent = S.user || '';
    setStatus(S.dirty ? 'saving' : 'ok');
    if (S.dirty) schedule();
    if (b.dataset.wired) return;
    b.dataset.wired = '1';
    const close = () => { menu.hidden = true; b.setAttribute('aria-expanded', 'false'); };
    b.addEventListener('click', e => { e.stopPropagation(); menu.hidden = !menu.hidden; b.setAttribute('aria-expanded', String(!menu.hidden)); });
    document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target)) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    menu.querySelector('#acct-out').addEventListener('click', logout);
  }

  window.FitAccount = {
    store,
    whenReady(fn) { if (isReady) fn(); else readyCbs.push(fn); },
    onRemote(fn) { remoteCbs.push(fn); },
    user: () => S.user,
    saveNow: push,
    api: (method, path, body) => api(method, path, body)
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
