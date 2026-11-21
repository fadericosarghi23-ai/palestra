/* fit+ — motore delle animazioni (omini stilizzati) e libreria pose.
   Coordinate: viewBox 0 0 240 220, pavimento a y=200, la figura guarda verso destra.
   Angoli in gradi: 0 = verso il basso, 90 = avanti (destra), 180 = verso l'alto, -90 = indietro. */
(function (root) {
  const LEN = { t: 58, n: 16, ua: 30, fa: 28, th: 44, sh: 42, ft: 13 };
  const RAD = Math.PI / 180;
  const dv = (a, l) => [Math.sin(a * RAD) * l, Math.cos(a * RAD) * l];
  const add = (p, v) => [p[0] + v[0], p[1] + v[1]];
  const lerp = (a, b, u) => a + (b - a) * u;
  const lerp2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  const mid = (a, b) => lerp2(a, b, 0.5);
  const KEYS = ['head', 'neck', 'hip', 'shN', 'shF', 'hpN', 'hpF', 'elN', 'haN', 'elF', 'haF', 'knN', 'anN', 'toN', 'knF', 'anF', 'toF'];

  function fk(p, front) {
    const J = {};
    J.hip = [0, 0];
    J.neck = add(J.hip, dv(p.t, LEN.t));
    J.head = add(J.neck, dv(p.h == null ? p.t : p.h, LEN.n));
    const so = front ? 13 : 0, sy = front ? 4 : 0, ho = front ? 8 : 0;
    J.shN = [J.neck[0] + so, J.neck[1] + sy];
    J.shF = [J.neck[0] - so, J.neck[1] + sy];
    J.hpN = [ho, 0];
    J.hpF = [-ho, 0];
    const ka = p.ka == null ? 1 : p.ka;
    J.elN = add(J.shN, dv(p.aN[0], LEN.ua * ka)); J.haN = add(J.elN, dv(p.aN[1], LEN.fa * ka));
    J.elF = add(J.shF, dv(p.aF[0], LEN.ua * ka)); J.haF = add(J.elF, dv(p.aF[1], LEN.fa * ka));
    const kN = p.kN == null ? 1 : p.kN, kF = p.kF == null ? 1 : p.kF;
    J.knN = add(J.hpN, dv(p.lN[0], LEN.th * kN)); J.anN = add(J.knN, dv(p.lN[1], LEN.sh * kN)); J.toN = add(J.anN, dv(p.lN[2], LEN.ft));
    J.knF = add(J.hpF, dv(p.lF[0], LEN.th * kF)); J.anF = add(J.knF, dv(p.lF[1], LEN.sh * kF)); J.toF = add(J.anF, dv(p.lF[2], LEN.ft));
    return J;
  }
  function offsetFor(J, f) { const j = J[f.anc]; return [f.at[0] - j[0], f.at[1] - j[1]]; }
  function shift(J, o) { for (const k in J) J[k] = [J[k][0] + o[0], J[k][1] + o[1]]; return J; }
  function lerpPose(a, b, u) {
    const g = (x, d) => (x == null ? d : x);
    const arr = (x, y) => x.map((v, i) => lerp(v, y[i], u));
    return {
      t: lerp(a.t, b.t, u), h: lerp(g(a.h, a.t), g(b.h, b.t), u),
      ka: lerp(g(a.ka, 1), g(b.ka, 1), u), kN: lerp(g(a.kN, 1), g(b.kN, 1), u), kF: lerp(g(a.kF, 1), g(b.kF, 1), u),
      aN: arr(a.aN, b.aN), aF: arr(a.aF, b.aF), lN: arr(a.lN, b.lN), lF: arr(a.lF, b.lF)
    };
  }
  function fillPts(p) {
    const J = {};
    for (const k in p) J[k] = p[k].slice();
    if (!J.shN) J.shN = J.neck.slice();
    if (!J.shF) J.shF = J.neck.slice();
    if (!J.hpN) J.hpN = J.hip.slice();
    if (!J.hpF) J.hpF = J.hip.slice();
    return J;
  }
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
  const ease = u => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

  /* Prepara un'animazione: pose chiave, timeline */
  function prepare(A) {
    if (A._ready) return A;
    A.front = A.view === 'front';
    if (A.mode !== 'custom') {
      A.K = A.frames.map(f => {
        if (A.mode === 'pts') return fillPts(f.pts);
        const J = fk(f, A.front);
        return shift(J, offsetFor(J, f));
      });
      A.B = A.frames.map((f, i) => f.ball || (A.props || []).some(p => p.k === 'ball') ? (f.ball || mid(A.K[i].haN, A.K[i].haF)) : null);
      A.segs = [];
      const n = A.frames.length;
      A.frames.forEach((f, i) => {
        const hold = f.hold == null ? 0.25 : f.hold;
        if (hold > 0) A.segs.push({ type: 'hold', i, dur: hold });
        if (A.reset && i === n - 1) return;
        A.segs.push({ type: 'move', i, j: (i + 1) % n, dur: f.d == null ? 0.7 : f.d, lin: f.lin });
      });
      A.total = A.segs.reduce((s, x) => s + x.dur, 0);
    } else {
      A.total = A.period || 1.2;
    }
    A._ready = true;
    return A;
  }

  function evaluate(A, time) {
    prepare(A);
    let t = ((time % A.total) + A.total) % A.total;
    if (A.mode === 'custom') return { J: A.custom(t / A.total), ball: null };
    for (const s of A.segs) {
      if (t > s.dur) { t -= s.dur; continue; }
      if (s.type === 'hold') return { J: A.K[s.i], ball: A.B[s.i] };
      const u = s.lin ? t / s.dur : ease(t / s.dur);
      const a = A.frames[s.i], b = A.frames[s.j];
      let J;
      if (A.mode === 'pts') {
        J = {};
        for (const k of KEYS) J[k] = lerp2(A.K[s.i][k], A.K[s.j][k], u);
      } else {
        J = fk(lerpPose(a, b, u), A.front);
        const oa = offsetFor(J, a), ob = offsetFor(J, b);
        shift(J, b.lock ? ob : lerp2(oa, ob, u));
      }
      const ball = A.B[s.i] && A.B[s.j] ? lerp2(A.B[s.i], A.B[s.j], u) : null;
      return { J, ball };
    }
    return { J: A.K[0], ball: A.B[0] };
  }

  /* ---------- Libreria pose ---------- */
  // a(t, braccioVicino, braccioLontano, gambaVicina, gambaLontana, ancora, puntoAncora, extra)
  const a = (t, aN, aF, lN, lF, anc, at, x) => Object.assign({ t, aN, aF, lN, lF, anc, at }, x || {});
  const STAND = [2, 0, 85];
  const mirrorPts = p => {
    const o = {};
    for (const k in p) {
      const nk = /N$/.test(k) ? k.slice(0, -1) + 'F' : /F$/.test(k) ? k.slice(0, -1) + 'N' : k;
      o[nk] = [240 - p[k][0], p[k][1]];
    }
    return o;
  };

  const ANIM = {};

  // ===== Mobilità =====
  const m90a = { head: [120, 110], neck: [120, 126], hip: [120, 182], shN: [132, 130], shF: [108, 130], hpN: [128, 182], hpF: [112, 182], elN: [142, 154], haN: [150, 180], elF: [98, 154], haF: [90, 180], knN: [136, 192], anN: [90, 195], toN: [80, 193], knF: [70, 190], anF: [62, 184], toF: [52, 182] };
  const m90b = Object.assign({}, m90a, { knN: [150, 146], anN: [166, 196], toN: [176, 197], knF: [90, 146], anF: [74, 196], toF: [64, 197] });
  ANIM.m9090 = { mode: 'pts', view: 'front', frames: [
    { pts: m90a, hold: 1.2, d: 0.9 }, { pts: m90b, hold: 0.15, d: 0.9 }, { pts: mirrorPts(m90a), hold: 1.2, d: 0.9 }, { pts: m90b, hold: 0.15, d: 0.9 }] };

  const couchLegs = { knN: [118, 154], anN: [118, 196], toN: [131, 198], knF: [62, 192], anF: [62, 150], toF: [60, 137] };
  ANIM.couch = { mode: 'pts', props: [{ k: 'couch', x: 10, w: 48, y: 142 }], frames: [
    { pts: Object.assign({ hip: [76, 150], neck: [96, 96], head: [102, 81], elN: [104, 124], haN: [117, 150], elF: [101, 124], haF: [114, 150] }, couchLegs), hold: 0.8, d: 1.2 },
    { pts: Object.assign({ hip: [82, 147], neck: [82, 90], head: [82, 74], elN: [96, 114], haN: [86, 140], elF: [94, 114], haF: [84, 140] }, couchLegs), hold: 2.2, d: 1.2 }] };

  const qBase = { hip: [92, 148], neck: [150, 142], head: [166, 137], elN: [151, 169], haN: [152, 196], elF: [149, 169], haF: [148, 196], knF: [92, 192], anF: [50, 194], toF: [40, 198] };
  const qp = (kn, an, to) => Object.assign({}, qBase, { knN: kn, anN: an, toN: to });
  ANIM.hipcars = { mode: 'pts', frames: [
    { pts: qp([94, 192], [52, 194], [42, 198]), hold: 0.4, d: 0.8 },
    { pts: qp([128, 178], [92, 186], [82, 190]), hold: 0.1, d: 0.8 },
    { pts: qp([104, 160], [72, 148], [62, 146]), hold: 0.1, d: 0.8 },
    { pts: qp([56, 146], [18, 160], [8, 166]), hold: 0.1, d: 0.9 }] };

  const cosC = { head: [120, 52], neck: [120, 68], hip: [120, 124], shN: [132, 72], shF: [108, 72], hpN: [128, 124], hpF: [112, 124], elN: [136, 96], haN: [122, 104], elF: [104, 96], haF: [118, 104], knN: [150, 160], anN: [170, 196], toN: [180, 198], knF: [90, 160], anF: [70, 196], toF: [60, 198] };
  const cosR = { head: [150, 106], neck: [152, 122], hip: [160, 178], shN: [164, 126], shF: [140, 126], hpN: [168, 178], hpF: [152, 178], elN: [166, 150], haN: [154, 156], elF: [140, 150], haF: [152, 156], knN: [186, 156], anN: [170, 196], toN: [182, 198], knF: [111, 187], anF: [70, 196], toF: [64, 184] };
  ANIM.cossack = { mode: 'pts', view: 'front', frames: [
    { pts: cosC, hold: 0.2, d: 1.0 }, { pts: cosR, hold: 0.8, d: 1.0 }, { pts: cosC, hold: 0.2, d: 1.0 }, { pts: mirrorPts(cosR), hold: 0.8, d: 1.0 }] };

  ANIM.rockback = { mode: 'pts', frames: [
    { pts: { hip: [100, 148], neck: [156, 140], head: [172, 136], elN: [157, 168], haN: [158, 196], elF: [155, 168], haF: [154, 196], knF: [100, 192], anF: [58, 194], toF: [48, 198], knN: [108, 172], anN: [116, 196], toN: [128, 197] }, hold: 0.3, d: 1.1 },
    { pts: { hip: [70, 160], neck: [128, 150], head: [143, 146], elN: [143, 172], haN: [158, 196], elF: [141, 172], haF: [154, 196], knF: [100, 192], anF: [58, 194], toF: [48, 198], knN: [93, 178], anN: [116, 196], toN: [128, 197] }, hold: 0.6, d: 1.0 }] };

  const wgsLeg = { hip: [110, 160], knN: [150, 154], anN: [152, 196], toN: [165, 198], knF: [68, 172], anF: [27, 186], toF: [20, 197] };
  const wgs1 = Object.assign({ neck: [160, 131], head: [175, 126], elN: [150, 163], haN: [138, 196], elF: [148, 164], haF: [134, 196] }, wgsLeg);
  ANIM.wgs = { mode: 'pts', frames: [
    { pts: wgs1, hold: 0.4, d: 0.8 },
    { pts: Object.assign({}, wgs1, { neck: [156, 140], head: [171, 138], elN: [146, 182], haN: [124, 192] }), hold: 0.9, d: 0.7 },
    { pts: wgs1, hold: 0.2, d: 0.9 },
    { pts: Object.assign({}, wgs1, { head: [168, 120], elN: [150, 165], haN: [138, 196], elF: [160, 102], haF: [162, 74] }), hold: 1.1, d: 0.9 }] };

  const ankleBack = { knF: [110, 192], anF: [68, 194], toF: [58, 198], anN: [170, 196], toN: [183, 198] };
  ANIM.ankle = { mode: 'pts', props: [{ k: 'wall', x: 196 }], frames: [
    { pts: Object.assign({ hip: [125, 150], neck: [125, 92], head: [125, 76], knN: [168, 154], elN: [140, 116], haN: [162, 140], elF: [138, 116], haF: [160, 142] }, ankleBack), hold: 0.4, d: 0.9 },
    { pts: Object.assign({ hip: [140, 152], neck: [142, 94], head: [144, 78], knN: [188, 160], elN: [165, 108], haN: [192, 110], elF: [164, 110], haF: [191, 112] }, ankleBack), hold: 0.7, d: 0.9 }] };

  // ===== Palestra A =====
  ANIM.pullapart = { view: 'front', props: [{ k: 'band', a: 'haN', b: 'haF' }], frames: [
    a(180, [-15, -15], [15, 15], [4, -2, 80], [-4, 2, -80], 'hip', [120, 110], { ka: 0.35, hold: 0.3, d: 0.8 }),
    a(180, [90, 90], [-90, -90], [4, -2, 80], [-4, 2, -80], 'hip', [120, 110], { hold: 0.5, d: 1.0 })] };

  const benchL = [72, -5, 90];
  ANIM.bench = { props: [{ k: 'bench', x: 64, y: 142, w: 98 }, { k: 'plate', at: 'haN', r: 15 }], frames: [
    a(-90, [180, 180], [180, 180], benchL, benchL, 'hip', [150, 138], { h: -90, hold: 0.4, d: 1.6 }),
    a(-90, [60, 175], [60, 175], benchL, benchL, 'hip', [150, 138], { h: -90, hold: 0.15, d: 0.9 })] };

  const pullL = [15, -60, 40];
  ANIM.pullup = { noGround: true, props: [{ k: 'bar', x1: 62, x2: 178, y: 26 }], frames: [
    a(180, [180, 180], [180, 180], pullL, pullL, 'haN', [120, 26], { hold: 0.4, d: 1.0 }),
    a(182, [35, 195], [35, 195], pullL, pullL, 'haN', [120, 26], { hold: 0.4, d: 1.4 })] };

  ANIM.landmine = { props: [{ k: 'landmine', at: 'haN', to: [236, 199] }], frames: [
    a(170, [10, 170], [-10, 20], [12, 0, 85], [-15, -10, 85], 'anN', [130, 196], { hold: 0.3, d: 0.8 }),
    a(170, [132, 138], [-10, 20], [12, 0, 85], [-15, -10, 85], 'anN', [130, 196], { hold: 0.3, d: 1.1 })] };

  ANIM.dbrow = { props: [{ k: 'bench', x: 30, y: 160, w: 135 }, { k: 'db', at: 'haN' }], frames: [
    a(100, [5, 0], [0, 0], [-15, 15, 85], [0, -90, -90], 'hip', [92, 114], { hold: 0.3, d: 0.8 }),
    a(100, [200, 0], [0, 0], [-15, 15, 85], [0, -90, -90], 'hip', [92, 114], { hold: 0.4, d: 1.2 })] };

  const pallofL = [[10, -4, 80], [-10, 4, -80]];
  ANIM.pallof = { view: 'front', props: [{ k: 'post', x: 22 }, { k: 'band', a: [30, 66], b: 'hands' }], frames: [
    a(180, [12, -137], [-12, 137], pallofL[0], pallofL[1], 'hip', [120, 111], { hold: 0.3, d: 0.9 }),
    a(180, [-30, -30], [30, 30], pallofL[0], pallofL[1], 'hip', [120, 111], { ka: 0.45, hold: 1.4, d: 0.9 })] };

  ANIM.farmer = { props: [{ k: 'db', at: 'haN' }, { k: 'db', at: 'haF', far: true }], frames: [
    a(180, [3, 0], [-3, 0], [20, 5, 85], [-15, -25, 70], 'hip', [120, 113], { hold: 0, d: 0.45 }),
    a(180, [-3, 0], [3, 0], [-15, -25, 70], [20, 5, 85], 'hip', [120, 113], { hold: 0, d: 0.45 })] };

  ANIM.copen = { props: [{ k: 'bench', x: 186, y: 140, w: 50 }], frames: [
    a(-78, [0, -90], [180, 180], [102, 102, 102], [96, 96, 96], 'elN', [70, 196], { hold: 0.5, d: 1.2 }),
    a(-75, [0, -90], [180, 180], [104, 100, 100], [104, 100, 100], 'elN', [70, 196], { hold: 1.6, d: 1.2 })] };

  ANIM.bike = { mode: 'custom', period: 1.15, props: [{ k: 'bike' }, { k: 'crank' }], custom(ph) {
    const J = {};
    J.hip = [108, 112]; J.neck = add(J.hip, dv(135, 58)); J.head = add(J.neck, dv(122, 16));
    J.shN = J.neck; J.shF = J.neck; J.hpN = J.hip; J.hpF = J.hip;
    const c = [128, 172], r = 17, ang = ph * 2 * Math.PI;
    const pN = [c[0] + r * Math.cos(ang), c[1] + r * Math.sin(ang)], pF = [c[0] - r * Math.cos(ang), c[1] - r * Math.sin(ang)];
    J.pN = pN; J.pF = pF;
    J.anN = [pN[0] - 4, pN[1] - 5]; J.toN = [pN[0] + 9, pN[1] + 1];
    J.anF = [pF[0] - 4, pF[1] - 5]; J.toF = [pF[0] + 9, pF[1] + 1];
    J.knN = ik(J.hip, J.anN, 44, 42, k => k[0]); J.knF = ik(J.hip, J.anF, 44, 42, k => k[0]);
    const hb = [176, 94];
    J.haN = hb; J.haF = [hb[0] - 3, hb[1] + 1];
    J.elN = ik(J.neck, J.haN, 30, 28, k => k[1]); J.elF = ik(J.neck, J.haF, 30, 28, k => k[1]);
    return J;
  } };

  // ===== Palestra B =====
  const mbProps = [{ k: 'band', a: ['knN', 'anN', 0.3], b: ['knF', 'anF', 0.3], w: 4 }];
  const mbArms = [[27, -30], [-27, 30]];
  ANIM.mbwalk = { view: 'front', props: mbProps, frames: [
    a(180, mbArms[0], mbArms[1], [14, -6, 80], [-14, 6, -80], 'hip', [120, 112], { hold: 0.15, d: 0.45 }),
    a(180, mbArms[0], mbArms[1], [27, 6, 80], [-14, 6, -80], 'hip', [124, 112], { hold: 0.15, d: 0.45 }),
    a(180, mbArms[0], mbArms[1], [14, -6, 80], [-14, 6, -80], 'hip', [120, 112], { hold: 0.15, d: 0.45 }),
    a(180, mbArms[0], mbArms[1], [14, -6, 80], [-27, -6, -80], 'hip', [116, 112], { hold: 0.15, d: 0.45 })] };

  ANIM.bridge = { frames: [
    a(-90, [90, 90], [90, 90], [135, 5, 90], [135, 5, 90], 'neck', [60, 186], { h: -90, hold: 0.3, d: 0.8 }),
    a(-72, [90, 90], [90, 90], [108, -5, 90], [108, -5, 90], 'neck', [60, 186], { h: -85, hold: 1.0, d: 0.9 })] };

  ANIM.boxjump = { reset: true, props: [{ k: 'box', x: 130, y: 180, w: 66 }], frames: [
    a(178, [5, 0], [5, 0], STAND, STAND, 'anN', [80, 196], { hold: 0.5, d: 0.45 }),
    a(140, [-60, -40], [-60, -40], [75, -25, 85], [75, -25, 85], 'anN', [80, 196], { hold: 0.05, d: 0.32 }),
    a(160, [120, 130], [120, 130], [80, -20, 60], [80, -20, 60], 'hip', [125, 102], { hold: 0, d: 0.3 }),
    a(140, [60, 70], [60, 70], [75, -25, 85], [75, -25, 85], 'anN', [160, 176], { hold: 0.25, d: 0.6 }),
    a(178, [5, 0], [5, 0], STAND, STAND, 'anN', [160, 176], { hold: 0.8 })] };

  ANIM.trapbar = { props: [{ k: 'trap', at: 'haN', dy: 23, r: 18, behind: true }], frames: [
    a(140, [0, 0], [0, 0], [75, -20, 85], [75, -20, 85], 'anN', [120, 196], { hold: 0.35, d: 0.95 }),
    a(178, [2, 0], [2, 0], STAND, STAND, 'anN', [120, 196], { hold: 0.5, d: 1.3 })] };

  ANIM.bulgarian = { props: [{ k: 'bench', x: 30, y: 160, w: 62 }, { k: 'db', at: 'haN' }], frames: [
    a(172, [0, 0], [0, 0], [20, -3, 85], [-25, -79.5, -100], 'anN', [150, 196], { hold: 0.35, d: 1.3 }),
    a(165, [0, 0], [0, 0], [85, -12, 85], [-15, -142, -100], 'anN', [150, 196], { hold: 0.2, d: 1.0 })] };

  ANIM.hipthrust = { props: [{ k: 'bench', x: 14, y: 150, w: 62 }, { k: 'plate', at: 'hip', dy: -15, r: 16 }], frames: [
    a(-124, [66, 46], [66, 46], [120, 20, 90], [120, 20, 90], 'neck', [72, 146], { h: -115, hold: 0.3, d: 0.9 }),
    a(-98, [92, 72], [92, 72], [90, 0, 90], [90, 0, 90], 'neck', [72, 146], { h: -115, hold: 0.8, d: 1.1 })] };

  const nordL = [0, -90, -60];
  ANIM.nordic = { props: [{ k: 'pad', at: 'anN' }], frames: [
    a(180, [25, 170], [25, 170], nordL, nordL, 'knN', [80, 190], { hold: 0.6, d: 2.4, lin: true }),
    a(120, [70, 60], [70, 60], [-60, -90, -60], [-60, -90, -60], 'knN', [80, 190], { hold: 0, d: 0.35 }),
    a(108, [50, 40], [50, 40], [-72, -90, -60], [-72, -90, -60], 'knN', [80, 190], { hold: 0.35, d: 1.0 })] };

  ANIM.calf = { props: [{ k: 'step', x: 124, y: 186, w: 56 }, { k: 'wall', x: 182 }], frames: [
    a(180, [60, 90], [55, 90], [0, 0, 115], [5, -80, 20], 'toN', [136, 184], { hold: 0.3, d: 0.8 }),
    a(180, [60, 90], [55, 90], [0, 0, 45], [5, -80, 20], 'toN', [136, 184], { hold: 0.6, d: 1.4 })] };

  const dbugBase = { h: -90 };
  const DB_A = [180, 180], DB_L = [180, 90, 180];
  ANIM.deadbug = { frames: [
    a(-90, DB_A, DB_A, DB_L, DB_L, 'neck', [70, 186], Object.assign({ hold: 0.3, d: 1.0 }, dbugBase)),
    a(-90, [260, 260], DB_A, DB_L, [95, 95, 170], 'neck', [70, 186], Object.assign({ hold: 0.5, d: 1.0 }, dbugBase)),
    a(-90, DB_A, DB_A, DB_L, DB_L, 'neck', [70, 186], Object.assign({ hold: 0.3, d: 1.0 }, dbugBase)),
    a(-90, DB_A, [260, 260], [95, 95, 170], DB_L, 'neck', [70, 186], Object.assign({ hold: 0.5, d: 1.0 }, dbugBase))] };

  // ===== Palestra C =====
  const knee = [90, 0, 100], stance = [0, 0, 70];
  const armFwd = [40, 130], armBack = [-40, 40];
  ANIM.bandskip = { props: [{ k: 'post', x: 6 }, { k: 'band', a: 'hip', b: [12, 106] }], frames: [
    a(172, armBack, armFwd, knee, stance, 'hip', [120, 108], { hold: 0.12, d: 0.5 }),
    a(172, armFwd, armBack, stance, knee, 'hip', [120, 108], { hold: 0.12, d: 0.5 })] };

  ANIM.pogo = { frames: [
    a(178, [15, 110], [15, 110], [4, -4, 85], [4, -4, 85], 'hip', [120, 110], { hold: 0.02, d: 0.17 }),
    a(178, [15, 120], [15, 120], [1, -1, 30], [1, -1, 30], 'hip', [120, 94], { hold: 0.02, d: 0.17 })] };

  ANIM.broad = { reset: true, frames: [
    a(178, [5, 0], [5, 0], STAND, STAND, 'anN', [50, 196], { hold: 0.5, d: 0.5 }),
    a(140, [-60, -40], [-60, -40], [75, -25, 85], [75, -25, 85], 'anN', [50, 196], { hold: 0.05, d: 0.22 }),
    a(135, [140, 145], [140, 145], [-40, -40, 10], [-40, -40, 10], 'toN', [64, 199], { hold: 0, d: 0.3 }),
    a(150, [100, 90], [100, 90], [95, 15, 70], [95, 15, 70], 'hip', [132, 100], { hold: 0, d: 0.3 }),
    a(140, [60, 40], [60, 40], [75, -25, 85], [75, -25, 85], 'anN', [165, 196], { hold: 0.3, d: 0.6 }),
    a(178, [5, 0], [5, 0], STAND, STAND, 'anN', [165, 196], { hold: 0.8 })] };

  ANIM.latbound = { view: 'front', frames: [
    a(176, [35, 20], [-60, -40], [8, -2, 80], [22, 10, -80], 'anN', [178, 196], { kF: 0.7, hold: 0.4, d: 0.3 }),
    a(180, [10, 10], [-10, -10], [6, -6, 80], [-6, 6, -80], 'hip', [120, 92], { kN: 0.95, kF: 0.95, hold: 0, d: 0.3 }),
    a(184, [60, 40], [-35, -20], [-22, -10, 80], [-8, 2, -80], 'anF', [62, 196], { kN: 0.7, hold: 0.4, d: 0.3 }),
    a(180, [10, 10], [-10, -10], [6, -6, 80], [-6, 6, -80], 'hip', [120, 92], { kN: 0.95, kF: 0.95, hold: 0, d: 0.3 })] };

  // Rotazione esplosiva al cavo: carica verso il cavo, rotazione veloce, ritorno lento
  const chL = [[12, -4, 80], [-12, 4, -80]];
  ANIM.cablechop = { view: 'front', props: [{ k: 'post', x: 18 }, { k: 'band', a: [24, 68], b: 'hands', w: 2 }], frames: [
    a(184, [-70, -80], [-80, -90], chL[0], chL[1], 'hip', [120, 111], { hold: 0.35, d: 0.28 }),
    a(176, [80, 90], [70, 80], chL[0], chL[1], 'hip', [120, 111], { hold: 0.3, d: 1.2 })] };

  // Partenze al muro: corpo inclinato, mani al muro, cambio gamba veloce
  ANIM.walldrive = { props: [{ k: 'wall', x: 210 }], frames: [
    a(130, [80, 80], [78, 80], [-30, -35, 20], [75, 20, 95], 'hip', [110, 111], { h: 115, hold: 0.55, d: 0.16 }),
    a(130, [80, 80], [78, 80], [75, 20, 95], [-30, -35, 20], 'hip', [110, 111], { h: 115, hold: 0.55, d: 0.16 })] };

  ANIM.accel = { frames: [
    a(140, [60, 150], [-50, 20], [-30, -35, 20], [75, 20, 95], 'hip', [104, 111], { h: 125, hold: 0.02, d: 0.34 }),
    a(140, [-50, 20], [60, 150], [75, 20, 95], [-30, -35, 20], 'hip', [104, 111], { h: 125, hold: 0.02, d: 0.34 })] };

  ANIM.slrdl = { props: [{ k: 'db', at: 'haN' }], frames: [
    a(178, [0, 0], [-2, 0], STAND, [-8, -15, 70], 'anN', [120, 196], { hold: 0.5, d: 1.3 }),
    a(95, [0, 0], [0, 0], [10, -5, 85], [-85, -85, 0], 'anN', [120, 196], { h: 100, hold: 0.35, d: 1.0 })] };

  // ===== Attivazione MD-1 =====
  ANIM.skipa = { frames: [
    a(174, armBack, armFwd, knee, stance, 'hip', [120, 104], { hold: 0.04, d: 0.3 }),
    a(174, armFwd, armBack, stance, knee, 'hip', [120, 104], { hold: 0.04, d: 0.3 })] };

  const neutral = [0, 60];
  ANIM.skipb = { frames: [
    a(174, armBack, armFwd, [90, 0, 100], [0, 0, 75], 'hip', [120, 108], { hold: 0, d: 0.25 }),
    a(174, armBack, armFwd, [80, 75, 95], [0, 0, 75], 'hip', [120, 108], { hold: 0, d: 0.25 }),
    a(174, neutral, neutral, [-8, -5, 80], [20, -20, 80], 'hip', [120, 110], { hold: 0, d: 0.25 }),
    a(174, armFwd, armBack, [0, 0, 75], [90, 0, 100], 'hip', [120, 108], { hold: 0, d: 0.25 }),
    a(174, armFwd, armBack, [0, 0, 75], [80, 75, 95], 'hip', [120, 108], { hold: 0, d: 0.25 }),
    a(174, neutral, neutral, [20, -20, 80], [-8, -5, 80], 'hip', [120, 110], { hold: 0, d: 0.25 })] };

  ANIM.buttkick = { frames: [
    a(178, [40, 120], [-40, 40], [-5, -165, -150], [0, 0, 75], 'hip', [120, 108], { hold: 0, d: 0.24 }),
    a(178, [-40, 40], [40, 120], [0, 0, 75], [-5, -165, -150], 'hip', [120, 108], { hold: 0, d: 0.24 })] };

  ANIM.cmj = { frames: [
    a(178, [5, 0], [5, 0], STAND, STAND, 'anN', [120, 196], { hold: 0.5, d: 0.4 }),
    a(140, [-55, -40], [-55, -40], [70, -25, 85], [70, -25, 85], 'anN', [120, 196], { hold: 0.02, d: 0.25 }),
    a(180, [130, 140], [130, 140], [0, 0, 25], [0, 0, 25], 'hip', [120, 98], { hold: 0.05, d: 0.25 }),
    a(150, [60, 40], [60, 40], [55, -20, 85], [55, -20, 85], 'anN', [120, 196], { hold: 0.25, d: 0.6 })] };

  const foamL = [90, 90, 175];
  ANIM.foam = { props: [{ k: 'roller', x: 150, y: 192, r: 8 }], frames: [
    a(-143, [-5, -5], [-5, -5], foamL, foamL, 'hip', [110, 182], { h: -150, hold: 0.2, d: 1.6 }),
    a(-143, [-28, -28], [-28, -28], foamL, foamL, 'hip', [135, 182], { h: -150, hold: 0.2, d: 1.6 })] };

  root.FitAnim = { ANIM, evaluate, prepare, mid, lerp2 };
})(typeof window !== 'undefined' ? window : globalThis);
