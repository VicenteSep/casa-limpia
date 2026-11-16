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

// Solo lo "particular" de la semana: tareas de más de 1 semana, o semanales que quedaron atrasadas.
const days = tk => tk.every_n * ({ day: 1, week: 7, month: 30 }[tk.every_unit] || 7);
const monday = (() => { const x = new Date(Date.UTC(y, m - 1, d)); x.setUTCDate(x.getUTCDate() - (x.getUTCDay() + 6) % 7); return x.toISOString().slice(0, 10); })();
const special = tk => days(tk) > 7 || tk.next_due < monday;

for (const mem of members) {
  const all = tasks.filter(tk => who(tk) === mem.slug);
  const mine = all.filter(special).sort((a, b) => a.next_due.localeCompare(b.next_due));
  const label = tk => `${tk.name} (${roomById[tk.room_id]?.name ?? ''})${tk.next_due < monday ? ' ⚠️' : ''}`;
  const list = mine.slice(0, 6).map(label).join(', ') + (mine.length > 6 ? ` y ${mine.length - 6} más` : '');
  const title = mine.length
    ? `${mem.name}, este finde además te toca 🧹`
    : `${mem.name}, este finde solo lo de siempre ✨`;
  const body = mine.length ? list : 'Nada especial esta semana.';

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
