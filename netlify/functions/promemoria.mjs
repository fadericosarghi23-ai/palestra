/* starfit+ — promemoria: ogni 15 minuti controlla chi deve ricevere una notifica
   (peso, allenamento, vigilia della partita, mobilità, cibo). Ognuno al massimo una volta al giorno.
   Funzione programmata di Netlify, inclusa nel piano gratuito: consuma pochissimi crediti. */
import { getStore } from '@netlify/blobs';
import { runReminders } from '../../lib/watch-core.mjs';

const adminKey = () => {
  try { if (globalThis.Netlify && Netlify.env && Netlify.env.get) return Netlify.env.get('STARFIT_ADMIN_KEY') || ''; } catch (e) { /* niente */ }
  return process.env.STARFIT_ADMIN_KEY || '';
};

export default async () => {
  const store = getStore({ name: 'starfit', consistency: 'strong' });
  const kv = {
    get: key => store.get(key, { type: 'json' }),
    set: (key, value) => store.setJSON(key, value),
    del: key => store.delete(key),
    list: async prefix => (await store.list({ prefix })).blobs.map(b => b.key)
  };
  const sent = await runReminders(kv, { adminKey: adminKey() });
  return new Response(JSON.stringify({ ok: true, sent }), { headers: { 'Content-Type': 'application/json' } });
};

// Ora UTC: dalle 04:00 alle 22:59 = in Italia dalle 5/6 del mattino fino a mezzanotte circa (di notte non parte)
export const config = { schedule: '*/15 4-22 * * *' };
