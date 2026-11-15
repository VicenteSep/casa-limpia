// Envía el aviso del finde a cada persona: "Este finde te toca…".
// Lo ejecuta GitHub Actions (ver .github/workflows/avisos.yml).
//   node scripts/avisos.mjs finde   → manda los avisos
//   node scripts/avisos.mjs ping    → solo consulta la BD (evita que Supabase se pause)
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SECRET_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, APP_URL } = process.env;
const mode = process.argv[2] || 'finde';
const sb = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };

if (mode === 'ping') {
  must(await sb.from('rooms').select('id').limit(1));
  console.log('Supabase despierto ✔');
  process.exit(0);
}

// Fechas en hora de Madrid
const todayMadrid = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
const [y, m, d] = todayMadrid.split('-').map(Number);
const t = new Date(Date.UTC(y, m - 1, d));
const dowMon = (t.getUTCDay() + 6) % 7;
t.setUTCDate(t.getUTCDate() + (6 - dowMon));
const sunday = t.toISOString().slice(0, 10);

const [members, rooms, tasks, subs] = await Promise.all([
  sb.from('members').select('*').then(must),
  sb.from('rooms').select('*').then(must),
  sb.from('tasks').select('*').lte('next_due', sunday).then(must),
  sb.from('push_subscriptions').select('*').then(must),
]);
const roomById = Object.fromEntries(rooms.map(r => [r.id, r]));
const who = tk => tk.assignee || roomById[tk.room_id]?.default_assignee || null;
const unassigned = tasks.filter(tk => !who(tk));

webpush.setVapidDetails('mailto:avisos@casa-limpia.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

for (const mem of members) {
  const mine = tasks.filter(tk => who(tk) === mem.slug)
    .sort((a, b) => a.next_due.localeCompare(b.next_due));
  const label = tk => `${tk.name} (${roomById[tk.room_id]?.name ?? ''})`;
  const list = mine.slice(0, 5).map(label).join(', ') + (mine.length > 5 ? ` y ${mine.length - 5} más` : '');
  const title = mine.length
    ? `${mem.name}, este finde te toca ${mine.length === 1 ? '1 tarea' : `${mine.length} tareas`} 🧹`
    : `${mem.name}, este finde no tienes nada asignado 🎉`;
  let body = mine.length ? list : 'Dusty no tiene nada contra ti… por ahora.';
  if (unassigned.length) body += `\nY hay ${unassigned.length} sin asignar para repartir.`;

  const mySubs = subs.filter(s => s.member_slug === mem.slug);
  for (const s of mySubs) {
    try {
      await webpush.sendNotification(s.subscription, JSON.stringify({ title, body, url: APP_URL || './', tag: 'finde' }));
      console.log(`✔ aviso enviado a ${mem.name}`);
    } catch (e) {
      console.log(`✘ ${mem.name}: ${e.statusCode} ${e.body || e.message}`);
      if (e.statusCode === 404 || e.statusCode === 410) await sb.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
    }
  }
  if (!mySubs.length) console.log(`(sin avisos activados para ${mem.name})`);
}
