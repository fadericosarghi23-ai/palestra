/* starfit+ — animazioni aggiuntive (omini stilizzati).
   Da caricare DOPO anim.js e PRIMA di app.js: aggiunge voci a window.FitAnim.ANIM.
   Stesse convenzioni di anim.js: viewBox 0 0 240 220, pavimento a y=200, la figura guarda a destra.
   Angoli in gradi: 0 = giù, 90 = avanti (destra), 180 = su, -90 = indietro.
   Le chiavi sono gli id degli esercizi (con i trattini). */
(function (root) {
  const F = root.FitAnim;
  if (!F || !F.ANIM) return;
  const ANIM = F.ANIM;

  /* ---------- strumenti (copie locali di quelli di anim.js, che non li esporta) ---------- */
  const LEN = { t: 58, n: 16, ua: 30, fa: 28, th: 44, sh: 42, ft: 13 };
  const RAD = Math.PI / 180;
  const dv = (a, l) => [Math.sin(a * RAD) * l, Math.cos(a * RAD) * l];
  const add = (p, v) => [p[0] + v[0], p[1] + v[1]];
  const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
  const lerp = (a, b, u) => a + (b - a) * u;
  const lerp2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const ease = u => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

  // cinematica diretta come in anim.js, con fattore di scala s (1 = figura standard)
  function fk(p, front, s) {
    s = s || 1;
    const J = {};
    J.hip = [0, 0];
    J.neck = add(J.hip, dv(p.t, LEN.t * s));
    J.head = add(J.neck, dv(p.h == null ? p.t : p.h, LEN.n * s));
    const so = front ? 13 * s : 0, sy = front ? 4 * s : 0, ho = front ? 8 * s : 0;
    J.shN = [J.neck[0] + so, J.neck[1] + sy];
    J.shF = [J.neck[0] - so, J.neck[1] + sy];
    J.hpN = [ho, 0];
    J.hpF = [-ho, 0];
    J.elN = add(J.shN, dv(p.aN[0], LEN.ua * s)); J.haN = add(J.elN, dv(p.aN[1], LEN.fa * s));
    J.elF = add(J.shF, dv(p.aF[0], LEN.ua * s)); J.haF = add(J.elF, dv(p.aF[1], LEN.fa * s));
    J.knN = add(J.hpN, dv(p.lN[0], LEN.th * s)); J.anN = add(J.knN, dv(p.lN[1], LEN.sh * s)); J.toN = add(J.anN, dv(p.lN[2], LEN.ft * s));
    J.knF = add(J.hpF, dv(p.lF[0], LEN.th * s)); J.anF = add(J.knF, dv(p.lF[1], LEN.sh * s)); J.toF = add(J.anF, dv(p.lF[2], LEN.ft * s));
    return J;
  }
  function place(J, anc, at) { const o = sub(at, J[anc]); for (const k in J) J[k] = add(J[k], o); return J; }
  function ik(A, C, l1, l2, score) {
    const dx = C[0] - A[0], dy = C[1] - A[1];
    const raw = Math.hypot(dx, dy) || 0.001;
    const d = Math.min(Math.max(raw, Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
    const ux = dx / raw, uy = dy / raw;
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const px = A[0] + a * ux, py = A[1] + a * uy;
    const s1 = [px - h * uy, py + h * ux], s2 = [px + h * uy, py - h * ux];
    return score(s1) >= score(s2) ? s1 : s2;
  }
  // a(t, braccioVicino, braccioLontano, gambaVicina, gambaLontana, ancora, puntoAncora, extra) — come in anim.js
  const a = (t, aN, aF, lN, lF, anc, at, x) => Object.assign({ t, aN, aF, lN, lF, anc, at }, x || {});
  const pose = (p, front, s) => place(fk(p, front, s), p.anc, p.at);

  // interpolazione generica di numeri, array e oggetti (le stringhe restano quelle del primo)
  function mix(x, y, u) {
    if (typeof x === 'number') return lerp(x, y, u);
    if (Array.isArray(x)) return x.map((v, i) => mix(v, y[i], u));
    if (x && typeof x === 'object') { const o = {}; for (const k in x) o[k] = y && k in y ? mix(x[k], y[k], u) : x[k]; return o; }
    return x;
  }
  // linea del tempo come quella di anim.js: per ogni chiave pausa (hold) e movimento (d) verso la successiva
  function timeline(keys) {
    const segs = [];
    keys.forEach((k, i) => {
      const hold = k.hold == null ? 0.25 : k.hold;
      if (hold > 0) segs.push({ hold: true, i, dur: hold });
      segs.push({ i, j: (i + 1) % keys.length, dur: k.d == null ? 0.7 : k.d, lin: k.lin });
    });
    const total = segs.reduce((s, x) => s + x.dur, 0);
    return {
      total,
      at(t) {
        t = ((t % total) + total) % total;
        for (const s of segs) {
          if (t > s.dur) { t -= s.dur; continue; }
          if (s.hold) return keys[s.i].v;
          const u = s.lin ? t / s.dur : ease(t / s.dur);
          return mix(keys[s.i].v, keys[s.j].v, u);
        }
        return keys[0].v;
      }
    };
  }
  // animazione 'custom' del motore guidata da chiavi: build(valori) restituisce le articolazioni
  function driven(def) {
    const tl = timeline(def.keys);
    return {
      mode: 'custom', view: def.view || 'side', props: def.props || [], period: tl.total,
      custom(ph) { return def.build(tl.at(ph * tl.total), ph); }
    };
  }
  // pose come in anim.js (modalità fk) + punti extra (es. il rullo che ruota con la tibia)
  function fkDriven(def) {
    return driven({
      view: def.view, props: def.props,
      keys: def.frames.map(f => ({ v: f, hold: f.hold, d: f.d, lin: f.lin })),
      build(v) { const J = pose(v, def.view === 'front', def.s); if (def.extra) def.extra(J, v); return J; }
    });
  }

  const FL = [[4, -2, 80], [-4, 2, -80]]; // gambe in piedi, vista frontale

  /* ===== 1. Chest press inclinata alla macchina (laterale) =====
     Schienale inclinato di 25°, le maniglie partono dall'alto del petto e salgono avanti e in alto. */
  const cpL = [85, 5, 90];
  ANIM['chest-press-macchina-inclinata'] = {
    props: [
      { k: 'line', x1: 94, y1: 153, x2: 66, y2: 93, w: 8 },   // schienale
      { k: 'line', x1: 86, y1: 150, x2: 80, y2: 200, w: 4 },  // supporto dello schienale
      { k: 'bench', x: 70, y: 156, w: 56 },                    // sedile
      { k: 'db', at: 'haN' }                                   // maniglia
    ],
    frames: [
      a(205, [-10, 130], [-8, 128], cpL, cpL, 'hip', [100, 150], { h: 195, hold: 0.3, d: 1.0 }),
      a(205, [125, 125], [127, 127], cpL, cpL, 'hip', [100, 150], { h: 195, hold: 0.35, d: 1.4 })]
  };

  /* ===== 2. Pec deck (frontale) =====
     Le braccia ruotano sul piano orizzontale: si calcolano in 3D e si proiettano (accorciamento prospettico reale). */
  const pdBase = {
    head: [120, 76], neck: [120, 92], hip: [120, 150], shN: [133, 96], shF: [107, 96], hpN: [128, 150], hpF: [112, 150],
    knN: [132, 160], anN: [134, 196], toN: [142, 198], knF: [108, 160], anF: [106, 196], toF: [98, 198]
  };
  const PD = { dE: 9, dH: 7, be: -10, bh: 25 };
  PD.hU = Math.sqrt(30 * 30 - PD.dE * PD.dE); PD.hF = Math.sqrt(28 * 28 - PD.dH * PD.dH); // gomito un po' piegato
  const pdOff = f => PD.hU * Math.cos((f + PD.be) * RAD) + PD.hF * Math.cos((f + PD.bh) * RAD);
  let pdLo = 20, pdHi = 140;
  for (let i = 0; i < 40; i++) { const m = (pdLo + pdHi) / 2; if (pdOff(m) > -11) pdLo = m; else pdHi = m; } // mani a 2 px dal centro
  ANIM['pec-deck'] = driven({
    view: 'front',
    props: [{ k: 'box', x: 102, y: 64, w: 36 }, { k: 'bench', x: 90, y: 154, w: 60 }, { k: 'pad', at: 'haN', dy: 0 }, { k: 'pad', at: 'haF', dy: 0 }],
    keys: [{ v: { f: -8 }, hold: 0.3, d: 0.9 }, { v: { f: pdLo }, hold: 0.5, d: 1.4 }],
    build(v) {
      const J = {};
      for (const k in pdBase) J[k] = pdBase[k].slice();
      [[1, 'N'], [-1, 'F']].forEach(([sg, s]) => {
        const S = J['sh' + s];
        const el = [S[0] + sg * PD.hU * Math.cos((v.f + PD.be) * RAD), S[1] + PD.dE];
        J['el' + s] = el;
        J['ha' + s] = [el[0] + sg * PD.hF * Math.cos((v.f + PD.bh) * RAD), el[1] + PD.dH];
      });
      return J;
    }
  });

  /* ===== 3. Camminata inclinata sul tapis roulant (laterale) =====
     Nastro in salita (linea inclinata), piede in appoggio che scorre indietro col nastro, busto eretto, mani libere. */
  const beltY = x => 199 - (x - 24) * 0.1;              // asse del nastro
  const FLAT = 90 + Math.atan(0.1) / RAD;               // piede parallelo al nastro
  const TR = { hx: 124, hy: 101.5, xf: 146, xb: 104, st: 0.62 };
  function trLeg(p, hip) {
    let x, lift = 0, fa;
    if (p < TR.st) { const s = p / TR.st; x = lerp(TR.xf, TR.xb, s); fa = s < 0.15 ? lerp(108, FLAT, s / 0.15) : FLAT; }
    else {
      const s = (p - TR.st) / (1 - TR.st);
      x = lerp(TR.xb, TR.xf, ease(s)); lift = 13 * Math.sin(Math.PI * s);
      fa = s < 0.45 ? lerp(FLAT, 74, s / 0.45) : lerp(74, 108, (s - 0.45) / 0.55);
    }
    let an = [x, beltY(x) - 6.5 - lift];
    const to = add(an, dv(fa, 13));
    while (dist(hip, an) > 84 && fa > 30) { fa -= 1; an = sub(to, dv(fa, 13)); } // stacco del tallone a fine appoggio
    return { an, to, kn: ik(hip, an, LEN.th, LEN.sh, k => k[0]) };
  }
  ANIM['tapis-roulant-inclinato'] = {
    mode: 'custom', period: 1.1,
    props: [
      { k: 'line', x1: 24, y1: 199, x2: 216, y2: 179.8, w: 6 },  // nastro inclinato
      { k: 'line', x1: 208, y1: 181, x2: 214, y2: 106, w: 5 },   // montante
      { k: 'line', x1: 214, y1: 112, x2: 178, y2: 120, w: 4 },   // corrimano (non usato)
      { k: 'line', x1: 205, y1: 100, x2: 222, y2: 108, w: 8 }    // console
    ],
    custom(ph) {
      const J = {};
      J.hip = [TR.hx, TR.hy + 1.5 * Math.cos(4 * Math.PI * ph)];
      J.neck = add(J.hip, dv(172, LEN.t));
      J.head = add(J.neck, dv(174, LEN.n));
      J.shN = J.neck.slice(); J.shF = J.neck.slice(); J.hpN = J.hip.slice(); J.hpF = J.hip.slice();
      [['N', ph], ['F', (ph + 0.5) % 1]].forEach(([s, p]) => {
        const L = trLeg(p, J.hip);
        J['kn' + s] = L.kn; J['an' + s] = L.an; J['to' + s] = L.to;
        const ua = -22 * Math.cos(2 * Math.PI * p);       // braccio opposto alla gamba
        J['el' + s] = add(J.neck, dv(ua, LEN.ua));
        J['ha' + s] = add(J['el' + s], dv(ua + 28, LEN.fa));
      });
      return J;
    }
  };

  /* ===== 4. Military press con bilanciere (laterale) =====
     Bilanciere (disco) dalle clavicole sopra la testa con traiettoria verticale; la testa arretra al passaggio
     e torna avanti in chiusura. Figura al 90% per far stare le braccia tese nel riquadro. */
  const MP = 0.9;
  ANIM['military-press-bilanciere'] = driven({
    props: [{ k: 'plate', at: 'haN', r: 10 }],
    keys: [{ v: { u: 0 }, hold: 0.4, d: 0.9 }, { v: { u: 1 }, hold: 0.4, d: 1.3 }],
    build(v) {
      const u = v.u;
      const J = pose(a(179, [0, 0], [0, 0], [2, 0, 85], [-2, 0, 85], 'anN', [118, 196],
        { h: lerp(181, 174, u) + 12 * Math.sin(Math.PI * u) }), false, MP);
      const n = J.neck;
      const w = ease(Math.max(0, (u - 0.35) / 0.65));
      const hN = [n[0] + lerp(16, 3, w) * MP, n[1] + lerp(4, -57, u) * MP];
      const hF = [hN[0] - 1.5, hN[1] + 0.5];
      const sc = e => e[0] + e[1]; // gomiti avanti e in basso
      J.haN = hN; J.elN = ik(n, hN, LEN.ua * MP, LEN.fa * MP, sc);
      J.haF = hF; J.elF = ik(n, hF, LEN.ua * MP, LEN.fa * MP, sc);
      return J;
    }
  });

  /* ===== 5. Pushdown a un braccio (laterale) =====
     Cavo alto davanti, gomito fermo al fianco, si estende solo l'avambraccio. */
  const puL = [6, -3, 85];
  ANIM['pushdown-a-un-braccio'] = {
    props: [{ k: 'post', x: 198 }, { k: 'roller', x: 201, y: 32, r: 5 }, { k: 'cable', a: 'haN', b: [201, 32] }, { k: 'pad', at: 'haN', dy: 0 }],
    frames: [
      a(172, [6, 150], [-3, 2], puL, [-2, 0, 85], 'anN', [128, 196], { h: 174, hold: 0.3, d: 0.9 }),
      a(172, [6, 6], [-3, 2], puL, [-2, 0, 85], 'anN', [128, 196], { h: 174, hold: 0.35, d: 1.3 })]
  };

  /* ===== 6. Curl a martello al cavo con corda (laterale) =====
     Cavo basso davanti, gomiti fermi ai fianchi, mani che salgono verso le spalle. */
  ANIM['curl-cavo-con-corda'] = {
    props: [{ k: 'post', x: 200 }, { k: 'roller', x: 203, y: 190, r: 5 }, { k: 'cable', a: 'haN', b: [203, 190] }],
    frames: [
      a(178, [-2, 6], [-4, 4], [3, -1, 85], [-3, 1, 85], 'anN', [128, 196], { hold: 0.3, d: 0.9 }),
      a(178, [-2, 156], [-4, 154], [3, -1, 85], [-3, 1, 85], 'anN', [128, 196], { hold: 0.3, d: 1.3 })]
  };

  /* ===== 7. Alzate laterali con manubri (frontale) ===== */
  ANIM['alzate-laterali-manubri'] = {
    view: 'front',
    props: [{ k: 'db', at: 'haN' }, { k: 'db', at: 'haF' }],
    frames: [
      a(180, [10, 4], [-10, -4], FL[0], FL[1], 'hip', [120, 110], { hold: 0.35, d: 1.0 }),
      a(180, [88, 82], [-88, -82], FL[0], FL[1], 'hip', [120, 110], { hold: 0.35, d: 1.4 })]
  };

  /* ===== 8. Tricipiti sopra la testa al cavo (laterale) =====
     Di spalle al cavo, passo avanti e busto inclinato; braccia accanto alla testa, gomiti fermi,
     le mani partono dietro la nuca e si distendono avanti e in alto. */
  const tsL = [[28, -8, 92], [-22, -22, 75]];
  ANIM['tricipiti-sopra-la-testa-cavo'] = {
    props: [{ k: 'post', x: 8 }, { k: 'roller', x: 20, y: 62, r: 5 }, { k: 'cable', a: 'haN', b: [20, 62] }],
    frames: [
      a(158, [150, -60], [148, -62], tsL[0], tsL[1], 'anN', [148, 196], { h: 162, hold: 0.3, d: 0.9 }),
      a(158, [150, -210], [148, -212], tsL[0], tsL[1], 'anN', [148, 196], { h: 162, hold: 0.35, d: 1.3 })]
  };

  /* ===== 9. Curl alla panca Scott (laterale) =====
     Braccia appoggiate sul cuscino inclinato a 45°, si muove solo l'avambraccio; in basso non si distende del tutto. */
  const scL = [80, 0, 90];
  const sc0 = a(168, [45, 60], [45, 62], scL, scL, 'hip', [96, 146], { h: 172, hold: 0.3, d: 1.0 });
  const sc1 = a(168, [45, 175], [45, 177], scL, scL, 'hip', [96, 146], { h: 172, hold: 0.4, d: 1.5 });
  const scJ = pose(sc0);
  const scU = dv(45, 1), scP = dv(-45, 11); // direzione del braccio e lato sotto il braccio
  const scA = add(add(scJ.neck, [scU[0] * 8, scU[1] * 8]), scP), scB = add(add(scJ.elN, [scU[0] * 6, scU[1] * 6]), scP);
  ANIM['curl-alla-panca-scott'] = {
    props: [
      { k: 'line', x1: 118, y1: scA[1] + (118 - scA[0]) * (scB[1] - scA[1]) / (scB[0] - scA[0]), x2: 118, y2: 200, w: 5 }, // colonna
      { k: 'bench', x: 70, y: 152, w: 46 },                                           // sedile
      { k: 'line', x1: scA[0], y1: scA[1], x2: scB[0], y2: scB[1], w: 10 },          // cuscino inclinato
      { k: 'plate', at: 'haN', r: 9 }
    ],
    frames: [sc0, sc1]
  };

  /* ===== 10. Leg curl sdraiato (laterale) =====
     Prono sulla panca, ginocchia appena fuori dal bordo, rullo sopra i talloni che ruota con la tibia. */
  const lcLeg0 = [-88, -92, -2], lcLeg1 = [-88, -205, -115];
  ANIM['leg-curl-sdraiato'] = fkDriven({
    props: [{ k: 'bench', x: 62, y: 149, w: 128 }, { k: 'pad', at: 'roll', dy: 0 }, { k: 'pad', at: 'haN', dy: 0 }],
    frames: [
      a(90, [15, 100], [17, 102], lcLeg0, lcLeg0, 'hip', [96, 143], { h: 100, hold: 0.3, d: 1.0 }),
      a(90, [15, 100], [17, 102], lcLeg1, lcLeg1, 'hip', [96, 143], { h: 100, hold: 0.3, d: 1.8 })],
    extra(J, v) { J.roll = add(lerp2(J.knN, J.anN, 0.9), dv(v.lN[1] - 90, 8)); }
  });

  /* ===== 11. Leg extension a una gamba (laterale) =====
     Seduto con schienale, la gamba vicina estende il ginocchio contro il rullo, l'altra resta piegata. */
  const leF = [90, -12, 78];
  ANIM['leg-extension-monopodalica'] = fkDriven({
    props: [
      { k: 'line', x1: 79, y1: 144, x2: 70, y2: 78, w: 8 }, // schienale
      { k: 'bench', x: 60, y: 146, w: 78 },
      { k: 'pad', at: 'roll', dy: 0 }
    ],
    frames: [
      a(188, [-10, 40], [-12, 38], [90, -8, 82], leF, 'hip', [86, 140], { h: 186, hold: 0.3, d: 1.0 }),
      a(188, [-10, 40], [-12, 38], [90, 82, 172], leF, 'hip', [86, 140], { h: 186, hold: 0.4, d: 1.4 })],
    extra(J, v) { J.roll = add(lerp2(J.knN, J.anN, 0.86), dv(v.lN[1] + 90, 8)); }
  });

  /* ===== 12. Circonduzioni delle spalle (laterale) =====
     Grandi cerchi a braccia tese: un giro all'indietro e uno in avanti. Figura al 94% per stare nel riquadro. */
  const CS = 0.94;
  ANIM['circonduzioni-spalle'] = driven({
    keys: [{ v: { r: 0 }, hold: 0.2, d: 1.8 }, { v: { r: 360 }, hold: 0.2, d: 1.8 }],
    build(v) {
      return pose(a(180, [v.r, v.r + 6], [v.r - 12, v.r - 6], [2, 0, 85], [-2, 0, 85], 'anN', [120, 196]), false, CS);
    }
  });

  /* ===== 13. Wall slide (frontale) =====
     Schiena e avambracci al muro (il riquadro dietro), braccia da W a Y. */
  ANIM['wall-slide'] = {
    view: 'front',
    props: [{ k: 'box', x: 40, y: 2, w: 160 }],
    frames: [
      a(180, [62, 168], [-62, -168], FL[0], FL[1], 'hip', [120, 110], { hold: 0.4, d: 1.3 }),
      a(180, [148, 152], [-148, -152], FL[0], FL[1], 'hip', [120, 110], { hold: 0.4, d: 1.3 })]
  };

  /* ===== 14. Squat al multipower (laterale) =====
     Bilanciere guidato: la barra (disco) scorre su un binario verticale, piedi un po' avanti. */
  const SR = 112, SA = [[126, 196], [123, 196]];
  ANIM['squat-al-multipower'] = driven({
    props: [{ k: 'line', x1: SR - 5, y1: 6, x2: SR - 5, y2: 200, w: 3 }, { k: 'plate', at: 'neck', dx: -5, dy: 0, r: 9 }],
    keys: [{ v: { u: 0 }, hold: 0.4, d: 1.3 }, { v: { u: 1 }, hold: 0.2, d: 1.0 }],
    build(v) {
      const t = lerp(178, 155, v.u);
      const J = {};
      J.neck = [SR, lerp(54.5, 97.4, v.u)];
      J.hip = sub(J.neck, dv(t, LEN.t));
      J.head = add(J.neck, dv(t + 4, LEN.n));
      J.shN = J.neck.slice(); J.shF = J.neck.slice(); J.hpN = J.hip.slice(); J.hpF = J.hip.slice();
      [['N', SA[0], [-4, 0]], ['F', SA[1], [-6, 0]]].forEach(([s, an, hd]) => {
        J['an' + s] = an.slice();
        J['to' + s] = add(an, dv(88, LEN.ft));
        J['kn' + s] = ik(J.hip, an, LEN.th, LEN.sh, k => k[0]);
        J['ha' + s] = add(J.neck, hd);
        J['el' + s] = ik(J.neck, J['ha' + s], LEN.ua, LEN.fa, e => e[1] - e[0]); // gomiti in basso e indietro
      });
      return J;
    }
  });

  /* ===== 15. Adduttori alla macchina (frontale) =====
     Seduto, cuscinetti all'interno delle ginocchia; le cosce (che puntano verso chi guarda) si chiudono. */
  const adBase = {
    head: [120, 76], neck: [120, 92], hip: [120, 150], shN: [133, 96], shF: [107, 96], hpN: [128, 150], hpF: [112, 150],
    elN: [146, 122], haN: [142, 150], elF: [94, 122], haF: [98, 150]
  };
  ANIM['adduttori-alla-macchina'] = driven({
    view: 'front',
    props: [{ k: 'box', x: 102, y: 64, w: 36 }, { k: 'bench', x: 90, y: 154, w: 60 }, { k: 'pad', at: 'knN', dx: -6, dy: 1 }, { k: 'pad', at: 'knF', dx: 6, dy: 1 }],
    keys: [{ v: { o: 40 }, hold: 0.3, d: 1.0 }, { v: { o: 6 }, hold: 0.5, d: 1.4 }],
    build(v) {
      const J = {};
      for (const k in adBase) J[k] = adBase[k].slice();
      const lat = LEN.th * Math.cos(12 * RAD) * Math.sin(v.o * RAD), drop = LEN.th * Math.sin(12 * RAD);
      [[1, 'N'], [-1, 'F']].forEach(([sg, s]) => {
        const kn = add(J['hp' + s], [sg * lat, drop]);
        J['kn' + s] = kn;
        J['an' + s] = add(kn, [sg * 2, 36.4]);
        J['to' + s] = add(J['an' + s], [sg * 5, 3]);
      });
      return J;
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
