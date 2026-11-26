/* starfit+ — dati di esempio per l'account demo (programma terzino o glutei).
   Usato dal PC (admin.mjs demo) e dalla demo statica. seed(FitData, programma, data di oggi) -> documento dei dati. */
(function (root) {
  const pad = n => String(n).padStart(2, '0');
  const dk = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today0 = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };
  const addD = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const WD = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  let rnd = Math.random;
  /* ---------- dati di esempio ---------- */
  const PERSONA = { terzino: { kg0: 80.6, kg1: 78.4, nome: 'demo' }, glutei: { kg0: 57.6, kg1: 58.1, nome: 'demo' } };
  const BASE_KG = { bench: 62, trapbar: 100, bulgarian: 14, hipthrust: 80, landmine: 20, dbrow: 24, farmer: 26, gobletsquat: 16, latpull: 35, seatedrow: 35, rdl: 16, kickback: 9, stepup: 8, abduction: 35, cablechop: 12, slrdl: 12, pallof: 10 };
  const LOAD_CATS = new Set(['Forza', 'Gambe', 'Glutei', 'Schiena', 'Petto e spalle', 'Femorali', 'Contrasti', 'Braccia', 'Potenza']);
  function seed(FD, prog, todayDate) {
    const t = todayDate ? new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()) : today0();
    let s0 = Number(dk(t).replace(/-/g, '')) % 233280; rnd = () => { s0 = (s0 * 9301 + 49297) % 233280; return s0 / 233280; };
    const P = FD.PROGRAMS[prog] || FD.PROGRAMS.terzino, EX = FD.EX, doc = { program: P.id, demoDay: dk(t) };
    const days = {}; (P.days || []).forEach(d => { days[d.id] = Object.assign({}, d, { pk: d.pk || d.id }); });
    const per = PERSONA[P.id] || PERSONA.terzino, isGl = P.id === 'glutei';
    // peso: ultimi 45 giorni, con piccole oscillazioni
    doc.weights = {};
    for (let i = 45; i >= 1; i--) { if (rnd() < 0.18) continue; const f = (45 - i) / 44, kg = per.kg0 + (per.kg1 - per.kg0) * f + (rnd() - 0.5) * 0.6; doc.weights[dk(addD(t, -i))] = Math.round(kg * 10) / 10; }
    // allenamenti degli ultimi 5 mesi, con carichi che salgono
    doc.trained = {}; doc.loads = {}; doc.logs = {};
    const notes = isGl ? ['Hip thrust più fluido, sentito bene il gluteo', 'Stacco rumeno: ho tenuto la schiena dritta', 'Stanca ma ho finito tutto', 'Abduzioni brucianti, ottimo', 'Plank +5″ rispetto alla volta scorsa']
      : ['Stacco pesante ma pulito', 'Gambe un po\' stanche dalla partita', 'Salti esplosivi, mi sentivo veloce', 'Panca +2,5 kg, tutte le ripetizioni', 'Recupero lungo, qualità alta'];
    for (let i = 150; i >= 1; i--) {
      const d = addD(t, -i), k = dk(d), day = days[WD[d.getDay()]];
      if (!day || (day.type !== 'gym' && day.type !== 'act') || rnd() < 0.1) continue;
      doc.trained[k] = [day.pk];
      const weeksAgo = Math.floor(i / 7);
      (day.items || []).forEach((it, idx) => {
        const e = EX[it.ex]; if (!e || !LOAD_CATS.has(e.cat) || it.b !== 'main' || i > 60) return;
        const m = /^(\d+)(?:–(\d+))?\s*×\s*(\d+)(?:–(\d+))?/.exec(it.s || ''); if (!m) return;
        const sets = +(m[2] || m[1]), reps = +(m[4] || m[3]), base = BASE_KG[it.ex];
        const kg = base ? Math.round(base * (1 + (8 - weeksAgo) * 0.025) * 2) / 2 : null;
        (doc.loads[it.ex] = doc.loads[it.ex] || []).push({ d: k, u: day.pk + ':' + idx, sets: Array.from({ length: sets }, (x, s) => ({ kg, reps: s === sets - 1 && rnd() < 0.3 ? reps - 1 : reps })) });
      });
      if (i <= 14) doc.logs[k] = { d: day.id, pk: day.pk, t: notes[Math.floor(rnd() * notes.length)], r: ['facile', 'giusto', 'giusto', 'duro'][Math.floor(rnd() * 4)], at: d.getTime() + 19 * 3600e3 };
    }
    // come stai: ieri compilato, oggi da provare
    doc.ready = { [dk(addD(t, -1))]: { sonno: 7.5, energia: 2, dolore: 0, dove: '', light: false } };
    // acqua ultimi giorni, oggi a metà
    doc.water = {}; for (let i = 6; i >= 1; i--) doc.water[dk(addD(t, -i))] = (isGl ? 6 : 9) + Math.floor(rnd() * 4);
    doc.water[dk(t)] = isGl ? 4 : 6;
    // pasti: oggi colazione e pranzo, nei giorni scorsi qualcosa
    const F = (n, g, k, p, c, f, m) => ({ id: Math.random().toString(36).slice(2, 9), m, n, g, k, p, c, f });
    const todayFood = isGl ? [F('Yogurt greco 0%', 170, 97, 17, 6.8, 0, 'col'), F("Fiocchi d'avena", 40, 148, 5.2, 24, 2.8, 'col'), F('Banana', 120, 107, 1.3, 27.6, 0.4, 'col'), F('Riso (cotto)', 160, 208, 4.3, 44.8, 0.5, 'pra'), F('Petto di pollo (cotto)', 120, 198, 37.2, 0, 4.3, 'pra'), F('Zucchine', 200, 34, 2.4, 6.2, 0.6, 'pra')]
      : [F('Latte parzialmente scremato', 250, 115, 8.8, 12.5, 4, 'col'), F("Fiocchi d'avena", 70, 259, 9.1, 42, 4.9, 'col'), F('Uovo', 110, 141, 13.6, 0, 9.6, 'col'), F('Pasta (cruda)', 110, 388, 13.8, 79.2, 1.7, 'pra'), F('Tonno al naturale (sgocciolato)', 80, 82, 19.2, 0, 0.6, 'pra'), F("Olio extravergine d'oliva", 10, 88, 0, 0, 10, 'pra')];
    doc.food = { [dk(t)]: todayFood };
    // nei giorni passati la giornata è completa (spuntino e cena compresi)
    const rest = isGl ? [F('Skyr', 150, 95, 16.5, 6, 0.3, 'spu'), F('Mandorle', 20, 121, 4.4, 0.9, 11.1, 'spu'), F('Merluzzo o nasello', 180, 128, 30.6, 0, 0.5, 'cen'), F('Quinoa (cotta)', 150, 180, 6.6, 31.5, 2.9, 'cen'), F("Olio extravergine d'oliva", 10, 88, 0, 0, 10, 'cen'), F('Pane integrale', 50, 123, 4.5, 23, 1.3, 'cen')]
      : [F('Yogurt greco 0%', 170, 97, 17, 6.8, 0, 'spu'), F('Banana', 120, 107, 1.3, 27.6, 0.4, 'spu'), F('Petto di pollo (cotto)', 180, 297, 55.8, 0, 6.5, 'cen'), F('Riso (crudo)', 100, 350, 7, 79, 0.6, 'cen'), F('Verdure miste surgelate', 200, 90, 5, 14, 1, 'cen'), F("Olio extravergine d'oliva", 15, 133, 0, 0, 15, 'cen'), F('Pane comune', 60, 162, 5.1, 33, 0.7, 'cen')];
    for (let i = 1; i <= 5; i++) doc.food[dk(addD(t, -i))] = todayFood.concat(rest).map(e => Object.assign({}, e, { id: Math.random().toString(36).slice(2, 9) }));
    doc['food-recent'] = [];
    // Apple Watch, misure, profilo
    doc.watchAct = {}; for (let i = 10; i >= 1; i--) doc.watchAct[dk(addD(t, -i))] = { kcal: (isGl ? 380 : 680) + Math.round(rnd() * 250), min: 35 + Math.round(rnd() * 50), passi: 7000 + Math.round(rnd() * 5000), fcr: (isGl ? 62 : 55) + Math.round(rnd() * 4), sonno: Math.round((6.5 + rnd() * 1.8) * 10) / 10 };
    doc.measures = isGl ? { [dk(addD(t, -56))]: { vita: 68, fianchi: 94, cosce: 55, braccio: 26, petto: 86 }, [dk(addD(t, -28))]: { vita: 67.5, fianchi: 95, cosce: 55.5, braccio: 26, petto: 86 }, [dk(addD(t, -2))]: { vita: 67, fianchi: 96, cosce: 56, braccio: 26.5, petto: 86 } }
      : { [dk(addD(t, -56))]: { vita: 86, fianchi: 98, cosce: 58, braccio: 35, petto: 100 }, [dk(addD(t, -28))]: { vita: 84.5, fianchi: 97, cosce: 58.5, braccio: 35.5, petto: 100.5 }, [dk(addD(t, -2))]: { vita: 83, fianchi: 96.5, cosce: 59, braccio: 36, petto: 101 } };
    doc.profile = isGl ? { altezza: '1,65 m', obiettivo: 'Glutei più forti' } : { altezza: '1,80 m', obiettivo: '76 kg' };
    return doc;
  }

  root.FitDemoSeed = seed;
})(typeof window !== 'undefined' ? window : globalThis);
