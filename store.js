// Capa de datos: Supabase (compartido) o Demo (localStorage, solo este dispositivo).
import { CONFIG } from './config.js';
import { SEED } from './seed.js';
import { today, saturdayOf, mondayOf, addDays } from './dates.js';

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now());

export const isDemo = !CONFIG.supabaseUrl;

/* ---------------- DEMO ---------------- */
class DemoStore {
  constructor() { this.key = 'casa-limpia-demo-v1'; this.listeners = []; }
  async init() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(this.key)); } catch {}
    if (!s) s = this.seed();
    this.s = s;
    this.me = localStorage.getItem('casa-limpia-demo-me') || 'vicho';
    return true;
  }
  seed() {
    const t = today();
    const sat = (new Date().getDay() === 0) ? addDays(mondayOf(t), 12) : saturdayOf(t);
    const s = { members: [
      { slug: 'vicho', name: 'Vicho', email: 'vicho@demo', color: '#2f7d6d' },
      { slug: 'cami', name: 'Cami', email: 'cami@demo', color: '#d4644a' }],
      rooms: [], tasks: [], completions: [], victories: [], push: [] };
    for (const r of SEED) {
      const id = uid();
      s.rooms.push({ id, name: r.name, sort: r.sort, default_assignee: r.default_assignee });
      for (const tk of r.tasks) s.tasks.push({ id: uid(), room_id: id, name: tk.name, every_n: tk.every_n,
        every_unit: tk.every_unit, next_due: addDays(sat, tk.offset), last_done: null, assignee: null, points: tk.points });
    }
    return s;
  }
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.s)); } catch {} this.listeners.forEach(f => f()); }
  setMe(slug) { this.me = slug; try { localStorage.setItem('casa-limpia-demo-me', slug); } catch {} }
  get data() { return { members: this.s.members, rooms: this.s.rooms, tasks: this.s.tasks,
    completions: this.s.completions, victories: this.s.victories }; }
  async load() { return JSON.parse(JSON.stringify(this.data)); }
  onChange(f) { this.listeners.push(f); }
  async updateTask(id, patch) { Object.assign(this.s.tasks.find(t => t.id === id), patch); this.save(); }
  async addTask(t) { this.s.tasks.push({ id: uid(), last_done: null, assignee: null, ...t }); this.save(); }
  async deleteTask(id) { this.s.tasks = this.s.tasks.filter(t => t.id !== id); this.save(); }
  async addRoom(r) { this.s.rooms.push({ id: uid(), ...r }); this.save(); }
  async updateRoom(id, patch) { Object.assign(this.s.rooms.find(r => r.id === id), patch); this.save(); }
  async deleteRoom(id) { this.s.rooms = this.s.rooms.filter(r => r.id !== id);
    this.s.tasks = this.s.tasks.filter(t => t.room_id !== id); this.save(); }
  async addCompletion(c) { const row = { id: uid(), done_at: new Date().toISOString(), ...c }; this.s.completions.push(row); this.save(); return row; }
  async deleteCompletion(id) { this.s.completions = this.s.completions.filter(c => c.id !== id); this.save(); }
  async addVictory(week) { if (!this.s.victories.some(v => v.week_start === week)) { this.s.victories.push({ week_start: week }); this.save(); } }
  async savePush() { throw new Error('Los avisos funcionan cuando la app está conectada a Supabase.'); }
  async signOut() { localStorage.removeItem(this.key); location.reload(); }
}

/* ---------------- SUPABASE ---------------- */
class SupabaseStore {
  constructor() { this.listeners = []; this.cache = null; }
  async init() {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    this.sb = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'casa-limpia-auth' } });
    const { data } = await this.sb.auth.getSession();
    this.session = data.session;
    return !!this.session;
  }
  async signIn(email, password) {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw error; this.session = data.session;
  }
  async signUp(email, password) {
    const { data, error } = await this.sb.auth.signUp({ email, password });
    if (error) throw error; this.session = data.session;
    if (!data.session) throw new Error('Cuenta creada. Revisa tu correo para confirmarla y luego entra.');
  }
  async signOut() { await this.sb.auth.signOut(); location.reload(); }
  async load() {
    const since = addDays(today(), -120);
    const q = (p) => p.then(({ data, error }) => { if (error) throw error; return data; });
    const [members, rooms, tasks, completions, victories] = await Promise.all([
      q(this.sb.from('members').select('*')),
      q(this.sb.from('rooms').select('*').order('sort')),
      q(this.sb.from('tasks').select('*')),
      q(this.sb.from('completions').select('*').gte('done_at', since).order('done_at', { ascending: false })),
      q(this.sb.from('victories').select('*')),
    ]);
    const email = this.session.user.email.toLowerCase();
    const me = members.find(m => m.email.toLowerCase() === email);
    if (!me) { const e = new Error('not-member'); e.code = 'not-member'; throw e; }
    this.me = me.slug;
    this.cache = { members, rooms, tasks, completions, victories };
    if (!this.channel) this.subscribe();
    return this.cache;
  }
  subscribe() {
    let timer;
    const bump = () => { clearTimeout(timer); timer = setTimeout(() => this.listeners.forEach(f => f()), 250); };
    this.channel = this.sb.channel('casa');
    for (const table of ['rooms', 'tasks', 'completions', 'victories'])
      this.channel.on('postgres_changes', { event: '*', schema: 'public', table }, bump);
    this.channel.subscribe();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) bump(); });
  }
  onChange(f) { this.listeners.push(f); }
  async run(p) { const { data, error } = await p; if (error) throw error; return data; }
  updateTask(id, patch) { return this.run(this.sb.from('tasks').update(patch).eq('id', id)); }
  addTask(t) { return this.run(this.sb.from('tasks').insert(t)); }
  deleteTask(id) { return this.run(this.sb.from('tasks').delete().eq('id', id)); }
  addRoom(r) { return this.run(this.sb.from('rooms').insert(r)); }
  updateRoom(id, patch) { return this.run(this.sb.from('rooms').update(patch).eq('id', id)); }
  deleteRoom(id) { return this.run(this.sb.from('rooms').delete().eq('id', id)); }
  async addCompletion(c) { const rows = await this.run(this.sb.from('completions').insert(c).select()); return rows[0]; }
  deleteCompletion(id) { return this.run(this.sb.from('completions').delete().eq('id', id)); }
  addVictory(week) { return this.run(this.sb.from('victories').upsert({ week_start: week }, { onConflict: 'week_start', ignoreDuplicates: true })); }
  savePush(sub) {
    return this.run(this.sb.from('push_subscriptions').upsert(
      { endpoint: sub.endpoint, member_slug: this.me, subscription: sub.toJSON() }, { onConflict: 'endpoint' }));
  }
}

export const store = isDemo ? new DemoStore() : new SupabaseStore();
