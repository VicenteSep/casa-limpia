import { CONFIG } from './config.js';
import { store, isDemo } from './store.js';
import { today, addDays, diffDays, mondayOf, saturdayOf, sundayOf, addInterval, intervalDays,
  fmtShort, everyLabel, dow, iso } from './dates.js';

const $app = document.getElementById('app');
const $sheet = document.getElementById('sheet-root');
const $toast = document.getElementById('toast');

const S = { view: 'finde', data: null, hit: false, showDone: false };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ============ Helpers de dominio ============ */
const room = id => S.data.rooms.find(r => r.id === id) || { name: '¿?' };
const member = slug => S.data.members.find(m => m.slug === slug);
const memberName = slug => member(slug)?.name || slug;
const effAssignee = t => t.assignee || room(t.room_id).default_assignee || null;
const sortedMembers = () => [...S.data.members].sort((a, b) => (a.slug === store.me ? -1 : b.slug === store.me ? 1 : a.name.localeCompare(b.name)));

function weekendEnd() { return sundayOf(today()); }
function thisWeekendSat() { const t = today(); return dow(t) >= 5 ? t : saturdayOf(t); }

function dirtOf(t) {
  const I = intervalDays(t.every_n, t.every_unit);
  const start = addDays(t.next_due, -I);
  return Math.max(0, diffDays(start, today()) / I);
}
function healthOf(t) {
  const late = diffDays(t.next_due, today());           // días de atraso (>0 = atrasada)
  if (late < 0) return 1;                               // aún no toca → limpia
  if (late === 0 || t.next_due >= mondayOf(today())) return 0.85; // toca este finde
  return Math.max(0, 0.7 - 0.7 * late / intervalDays(t.every_n, t.every_unit));
}
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 1;
function houseHealth(tasks = S.data.tasks) { return avg(tasks.map(healthOf)); }

function dueChip(t) {
  const d = diffDays(today(), t.next_due);
  if (d < 0) return `<span class="chip late">Atrasada ${-d} ${-d === 1 ? 'día' : 'días'}</span>`;
  if (d === 0) return `<span class="chip today">Hoy</span>`;
  if (t.next_due <= weekendEnd()) return `<span class="chip today">${d === 1 ? 'Mañana' : fmtShort(t.next_due)}</span>`;
  return `<span class="chip">${d <= 13 ? `en ${d} días` : fmtShort(t.next_due)}</span>`;
}
function dirtBar(t) {
  const d = dirtOf(t), w = Math.min(1, d) * 100;
  const c = d < .6 ? 'var(--ok)' : d <= 1 ? 'var(--warn)' : 'var(--bad)';
  return `<div class="dirt"><i style="width:${w}%;background:${c}"></i></div>`;
}
const localDate = ts => iso(new Date(ts));

function weekStats() {
  const ws = mondayOf(today()), end = weekendEnd();
  const doneThisWeek = S.data.completions.filter(c => localDate(c.done_at) >= ws);
  const pending = S.data.tasks.filter(t => t.next_due <= end);
  const donePts = doneThisWeek.reduce((s, c) => s + (c.points || 0), 0);
  const pendPts = pending.reduce((s, t) => s + (t.points || 0), 0);
  return { ws, doneThisWeek, pending, donePts, pendPts, max: donePts + pendPts };
}

const ROOM_EMOJI = [['coc', '🍳'], ['baño chico', '🐾'], ['baño', '🛁'], ['pieza chica', '🧸'], ['pieza', '🛏️'],
  ['dorm', '🛏️'], ['living', '🛋️'], ['sal', '🛋️'], ['terr', '🪴'], ['recib', '🚪'], ['lav', '🧺']];
const roomEmoji = name => (ROOM_EMOJI.find(([k]) => name.toLowerCase().includes(k)) || [0, '🏠'])[1];

/* ============ Ilustraciones ============ */
function dustySVG(defeated) {
  const pts = [];
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2, r = i % 2 ? 31 : 40 + (i % 4 === 0 ? 3 : 0);
    pts.push(`${(48 + Math.cos(a) * r).toFixed(1)},${(52 + Math.sin(a) * r * .9).toFixed(1)}`);
  }
  const eyes = defeated
    ? `<path d="M30 42l10 10M40 42l-10 10M56 42l10 10M66 42l-10 10" stroke="#3b3646" stroke-width="4" stroke-linecap="round"/>`
    : `<path d="M27 37l14 6M69 37l-14 6" stroke="#3b3646" stroke-width="4" stroke-linecap="round"/>
       <circle cx="36" cy="50" r="7" fill="#fff"/><circle cx="60" cy="50" r="7" fill="#fff"/>
       <circle cx="37" cy="51" r="3.5" fill="#3b3646"/><circle cx="59" cy="51" r="3.5" fill="#3b3646"/>`;
  const mouth = defeated ? `<path d="M38 70q10-7 20 0" stroke="#3b3646" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
    : `<path d="M36 68q12 8 24 0" stroke="#3b3646" stroke-width="3.5" fill="#3b3646" stroke-linecap="round"/>
       <path d="M42 68l2 4 2-4M50 68l2 4 2-4" fill="#fff"/>`;
  return `<svg viewBox="0 0 96 100"><g class="${defeated ? '' : 'float'}" opacity="${defeated ? .75 : 1}">
    <ellipse cx="48" cy="95" rx="26" ry="4" fill="rgba(0,0,0,.25)"/>
    <polygon points="${pts.join(' ')}" fill="#b7aec4" stroke="#9a90a8" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="26" cy="30" r="3" fill="#cfc7da"/><circle cx="72" cy="74" r="2.5" fill="#cfc7da"/>
    ${eyes}${mouth}</g></svg>`;
}
function catSVG(x, body, mood, flip, chest, line = 'none') {
  const st = line === 'none' ? '' : ` stroke="${line}" stroke-width="1.2"`;
  const eyes = mood === 'happy' ? `<path d="M${x - 9} 33q4-4 8 0M${x + 1} 33q4-4 8 0" stroke="#1f2a27" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
    : `<circle cx="${x - 5}" cy="32" r="2.4" fill="#1f2a27"/><circle cx="${x + 5}" cy="32" r="2.4" fill="#1f2a27"/>`;
  const mouth = mood === 'happy' ? `<path d="M${x - 4} 40q4 4 8 0" stroke="#1f2a27" stroke-width="2" fill="none" stroke-linecap="round"/>`
    : mood === 'meh' ? `<path d="M${x - 3} 41h6" stroke="#1f2a27" stroke-width="2" stroke-linecap="round"/>`
    : `<path d="M${x - 4} 43q4-4 8 0" stroke="#1f2a27" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  const tear = mood === 'sad' ? `<path d="M${x + 7} 35q2 4 0 6q-2-2 0-6z" fill="#7cc0e8"/>` : '';
  const tail = flip ? `M${x - 14} 50q-14-2-12-16` : `M${x + 14} 50q14-2 12-16`;
  const tailLine = line === 'none' ? '' : `<path d="${tail}" stroke="${line}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  return `${tailLine}<path d="${tail}" stroke="${body}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <ellipse cx="${x}" cy="50" rx="15" ry="9" fill="${body}"${st}/>
    ${chest ? `<ellipse cx="${x}" cy="49" rx="7" ry="7" fill="${chest}"/>` : ''}
    <path d="M${x - 15} 26l3-14 9 8zM${x + 15} 26l-3-14-9 8z" fill="${body}"${st}/>
    <path d="M${x - 13} 24l2-8 5 5zM${x + 13} 24l-2-8-5 5z" fill="#f2b8b8"/>
    <circle cx="${x}" cy="34" r="15" fill="${body}"${st}/>
    ${chest ? `<path d="M${x - 6} 40q6 8 12 0q-6 3-12 0z" fill="${chest}"/>` : ''}
    <path d="M${x - 1.5} 37h3l-1.5 2z" fill="#e58b8b"/>
    <path d="M${x - 8} 38h-9M${x - 8} 40l-8 3M${x + 8} 38h9M${x + 8} 40l8 3" stroke="#1f2a27" stroke-width=".8" opacity=".5"/>
    ${eyes}${mouth}${tear}`;
}
function catsSVG(mood) {
  return `<svg viewBox="0 0 104 60" role="img" aria-label="Auki (blanco) y Antu (naranja)">${catSVG(30, '#fbfaf6', mood, true, null, '#cfc6b4')}${catSVG(74, '#e8913f', mood, false, '#fffaf0')}</svg>`;
}

/* ============ Vistas ============ */
function render() {
  if (!S.data) return;
  const v = S.view;
  let body = '';
  if (v === 'finde') body = viewFinde();
  else if (v === 'casa') body = viewCasa();
  else if (v.startsWith('room:')) body = viewRoom(v.slice(5));
  else if (v === 'hist') body = viewHist();
  const tab = v.startsWith('room:') ? 'casa' : v;
  $app.innerHTML = `<div class="minibar" id="minibar"><span>${S.title || ''}</span></div><div class="shell">
    ${isDemo ? `<div class="demo-banner">Modo demo: los datos se guardan solo en este teléfono. Eres <b>${esc(memberName(store.me))}</b> (cámbialo en ⚙️).</div>` : ''}
    ${body}</div>
    <div class="tabbar"><nav>
      ${[['finde', '✨', 'Este finde'], ['casa', '🏠', 'Casa'], ['hist', '🏆', 'Historial']].map(([k, i, l]) =>
        `<button data-act="tab" data-v="${k}" class="${tab === k ? 'on' : ''}"><span class="ico">${i}</span>${l}</button>`).join('')}
    </nav></div>`;
  S.hit = false;
  onScroll();
  checkVictory();
}

function topbar(title, sub) {
  S.title = title;
  return `<div class="topbar"><div><h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div>
    <button class="icon-btn" data-act="settings" aria-label="Ajustes">⚙️</button></div>`;
}

function viewFinde() {
  const st = weekStats();
  const won = st.max > 0 && st.pendPts === 0;
  const hpPct = st.max ? (st.pendPts / st.max) * 100 : 0;
  const h = houseHealth();
  const mood = h >= .7 ? 'happy' : h >= .45 ? 'meh' : 'sad';
  const moodTxt = { happy: 'Auki y Antu están felices', meh: 'Auki y Antu miran el polvo con sospecha', sad: 'Auki y Antu están estornudando' }[mood];
  const sat = thisWeekendSat();
  const sub = dow(today()) >= 5 ? `¡Es finde! ${fmtShort(today())}` : `Próximo finde: ${fmtShort(sat)}`;

  const groups = {};
  for (const t of st.pending) { const a = effAssignee(t) || '_'; (groups[a] ||= []).push(t); }
  for (const k in groups) groups[k].sort((a, b) => a.next_due.localeCompare(b.next_due) || room(a.room_id).sort - room(b.room_id).sort);

  let html = topbar('Este finde', sub);
  html += `<div class="card battle ${won ? 'won' : ''}">
    <div class="dusty ${S.hit ? 'hit' : ''}">${dustySVG(won)}</div>
    <div>
      <div class="title">${won ? '¡Derrotaron a Dusty! 🎉' : st.max ? 'Dusty acecha…' : 'Dusty está durmiendo'}</div>
      <div class="hp"><i style="width:${won ? 0 : hpPct}%"></i></div>
      <div class="meta">${won ? `${st.donePts} puntos de daño en equipo esta semana` : st.max ? `Vida: ${st.pendPts} / ${st.max} · Le han hecho ${st.donePts} de daño` : 'No hay tareas para este finde'}</div>
    </div></div>`;
  html += `<div class="card cats">${catsSVG(mood)}<div><div class="big">Casa al ${Math.round(h * 100)}%</div><div class="meta">${moodTxt}</div></div></div>`;

  for (const m of sortedMembers()) {
    const list = groups[m.slug] || [];
    html += `<div class="section-title"><span class="dot" style="background:${m.color || 'var(--primary)'}"></span>
      ${m.slug === store.me ? `Te toca a ti, ${esc(m.name)}` : `Le toca a ${esc(m.name)}`}<span class="count">${list.length}</span></div>`;
    html += list.length ? `<div class="list">${list.map(t => taskRow(t)).join('')}</div>` : `<div class="list"><div class="empty">Nada pendiente 🙌</div></div>`;
  }
  const un = groups['_'] || [];
  if (un.length) {
    html += `<div class="section-title">Sin asignar · repártanlas<span class="count">${un.length}</span></div>`;
    html += `<div class="list">${un.map(t => taskRow(t, { assign: true })).join('')}</div>`;
  }
  const end = weekendEnd(), soon = S.data.tasks.filter(t => t.next_due > end && t.next_due <= addDays(end, 7))
    .sort((a, b) => a.next_due.localeCompare(b.next_due));
  if (soon.length) {
    html += `<div class="section-title"><button data-act="toggle-soon">${S.showSoon ? '▾' : '▸'} Lo que viene el próximo finde</button><span class="count">${soon.length}</span></div>`;
    if (S.showSoon) html += `<div class="list">${soon.map(t => taskRow(t, { showWho: true })).join('')}</div>`;
  }
  if (st.doneThisWeek.length) {
    html += `<div class="section-title"><button data-act="toggle-done">${S.showDone ? '▾' : '▸'} Hechas esta semana</button><span class="count">${st.doneThisWeek.length}</span></div>`;
    if (S.showDone) html += `<div class="list">${st.doneThisWeek.map(c => `<div class="row is-done"><span class="check done">✓</span>
      <div><div class="name">${esc(c.task_name)}</div><div class="info"><span class="chip">${esc(c.room_name)}</span><span class="who ${esc(c.done_by)}">${esc(memberName(c.done_by))}</span></div></div><span></span></div>`).join('')}</div>`;
  }
  return html;
}

function taskRow(t, opt = {}) {
  const r = room(t.room_id);
  const right = opt.assign
    ? `<div class="assign">${sortedMembers().map(m => `<button class="${esc(m.slug)}" data-act="assign" data-id="${t.id}" data-m="${esc(m.slug)}">${esc(m.name)}</button>`).join('')}</div>`
    : `<span class="chev">›</span>`;
  const who = opt.showWho && effAssignee(t) ? `<span class="who ${esc(effAssignee(t))}">${esc(memberName(effAssignee(t)))}</span>` : '';
  return `<div class="row">
    <button class="check" data-act="done" data-id="${t.id}" aria-label="Marcar hecha">✓</button>
    <div data-act="open" data-id="${t.id}">
      <div class="name">${esc(t.name)}</div>
      <div class="info">${opt.inRoom ? `<span>${everyLabel(t.every_n, t.every_unit)}</span>` : `<span class="chip">${roomEmoji(r.name)} ${esc(r.name)}</span>`}${dueChip(t)}${who}</div>
      ${opt.inRoom ? dirtBar(t) : ''}
    </div>
    ${opt.assign ? right : `<span class="chev" data-act="open" data-id="${t.id}">›</span>`}
  </div>`;
}

function viewCasa() {
  const rooms = [...S.data.rooms].sort((a, b) => a.sort - b.sort);
  const end = weekendEnd();
  let html = topbar('Casa', `${S.data.tasks.length} tareas en ${rooms.length} habitaciones`);
  html += `<div class="rooms">${rooms.map(r => {
    const ts = S.data.tasks.filter(t => t.room_id === r.id);
    const h = houseHealth(ts), due = ts.filter(t => t.next_due <= end).length;
    const c = h >= .7 ? 'var(--ok)' : h >= .45 ? 'var(--warn)' : 'var(--bad)';
    return `<button class="room-card" data-act="room" data-id="${r.id}">
      <div class="emoji">${roomEmoji(r.name)}</div><div class="rname">${esc(r.name)}</div>
      <div class="rmeta">${due ? `${due} para este finde` : 'Al día ✨'}${r.default_assignee ? ` · ${esc(memberName(r.default_assignee))}` : ''}</div>
      <div class="dirt"><i style="width:${Math.round(h * 100)}%;background:${c}"></i></div></button>`;
  }).join('')}<button class="room-card add" data-act="new-room">＋ Habitación</button></div>`;
  return html;
}

function viewRoom(id) {
  const r = S.data.rooms.find(x => x.id === id);
  if (!r) { S.view = 'casa'; return viewCasa(); }
  const ts = S.data.tasks.filter(t => t.room_id === id).sort((a, b) => a.next_due.localeCompare(b.next_due) || a.name.localeCompare(b.name));
  let html = `<button class="back" data-act="tab" data-v="casa">‹ Casa</button>`;
  html += topbar(`${roomEmoji(r.name)} ${esc(r.name)}`, r.default_assignee ? `Siempre la hace ${esc(memberName(r.default_assignee))}` : 'Se reparte cada finde');
  html += ts.length ? `<div class="list">${ts.map(t => taskRow(t, { inRoom: true, showWho: true })).join('')}</div>` : `<div class="list"><div class="empty">Sin tareas todavía</div></div>`;
  html += `<div class="btn-row" style="margin-top:14px">
    <button class="btn" data-act="new-task" data-room="${r.id}">＋ Tarea</button>
    <button class="btn secondary" data-act="edit-room" data-id="${r.id}">Editar habitación</button></div>`;
  return html;
}

function viewHist() {
  const now = new Date(), monthStart = iso(new Date(now.getFullYear(), now.getMonth(), 1));
  const month = S.data.completions.filter(c => localDate(c.done_at) >= monthStart);
  const pts = month.reduce((s, c) => s + (c.points || 0), 0);
  let html = topbar('Historial', 'Lo que han hecho en equipo');
  html += `<div class="stats">
    <div class="stat"><b>${S.data.victories.length}</b><span>Dustys derrotados</span></div>
    <div class="stat"><b>${pts}</b><span>puntos este mes</span></div>
    <div class="stat"><b>${month.length}</b><span>tareas este mes</span></div></div>`;
  html += `<div class="card" style="display:flex;gap:10px;justify-content:space-around;font-size:14px">${S.data.members.map(m => {
    const n = month.filter(c => c.done_by === m.slug).length;
    return `<div><span class="who ${esc(m.slug)}">${esc(m.name)}</span> ${n} tareas</div>`;
  }).join('')}</div>`;
  const recent = [...S.data.completions].sort((a, b) => b.done_at.localeCompare(a.done_at)).slice(0, 150);
  if (!recent.length) return html + `<div class="list"><div class="empty">Aún no hay tareas hechas. ¡A por Dusty!</div></div>`;
  let day = null, open = false;
  for (const c of recent) {
    const d = localDate(c.done_at);
    if (d !== day) { if (open) html += `</div>`; html += `<div class="hist-day">${d === today() ? 'Hoy' : d === addDays(today(), -1) ? 'Ayer' : fmtShort(d)}</div><div class="list">`; day = d; open = true; }
    html += `<div class="row is-done"><span class="check done">✓</span><div><div class="name" style="text-decoration:none;color:var(--ink)">${esc(c.task_name)}</div>
      <div class="info"><span class="chip">${esc(c.room_name)}</span><span>+${c.points} pts</span></div></div><span class="who ${esc(c.done_by)}">${esc(memberName(c.done_by))}</span></div>`;
  }
  if (open) html += `</div>`;
  return html;
}

/* ============ Acciones ============ */
async function completeTask(id) {
  const t = S.data.tasks.find(x => x.id === id); if (!t) return;
  const r = room(t.room_id);
  const prev = { next_due: t.next_due, last_done: t.last_done, assignee: t.assignee };
  const next = saturdayOf(addInterval(today(), t.every_n, t.every_unit));
  const patch = { next_due: next, last_done: new Date().toISOString(), assignee: r.default_assignee ? t.assignee : null };
  // optimista
  Object.assign(t, patch); S.hit = true;
  const fake = { id: 'tmp', task_id: t.id, task_name: t.name, room_name: r.name, done_by: store.me, points: t.points, done_at: new Date().toISOString() };
  S.data.completions.unshift(fake); render();
  try {
    const c = await store.addCompletion({ task_id: t.id, task_name: t.name, room_name: r.name, done_by: store.me, points: t.points });
    await store.updateTask(t.id, patch);
    toast(`✓ ${t.name} · vuelve ${fmtShort(next)}`, 'Deshacer', async () => {
      await store.deleteCompletion(c.id); await store.updateTask(t.id, prev); await reload();
    });
  } catch (e) { toast('No se pudo guardar: ' + e.message); }
  await reload();
}

async function checkVictory() {
  const st = weekStats();
  if (st.max > 0 && st.pendPts === 0 && st.doneThisWeek.length && !S.data.victories.some(v => v.week_start === st.ws)) {
    S.data.victories.push({ week_start: st.ws });
    confetti();
    try { await store.addVictory(st.ws); } catch {}
  }
}

function confetti() {
  const box = document.createElement('div'); box.className = 'confetti';
  const items = ['✨', '🧹', '🫧', '🎉', '🐾', '⭐'];
  for (let i = 0; i < 36; i++) {
    const el = document.createElement('i'); el.textContent = items[i % items.length];
    el.style.left = Math.random() * 100 + '%'; el.style.animationDelay = Math.random() * .8 + 's';
    box.appendChild(el);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 3500);
}

let toastTimer;
function toast(msg, actLabel, act) {
  clearTimeout(toastTimer);
  $toast.hidden = false;
  $toast.innerHTML = `<span>${esc(msg)}</span>${actLabel ? `<button>${esc(actLabel)}</button>` : ''}`;
  if (actLabel) $toast.querySelector('button').onclick = () => { $toast.hidden = true; act(); };
  toastTimer = setTimeout(() => { $toast.hidden = true; }, actLabel ? 6000 : 3500);
}

/* ============ Hojas (formularios) ============ */
function openSheet(html, onMount) {
  const already = !!$sheet.innerHTML;
  $sheet.innerHTML = `<div class="backdrop" data-close></div><div class="sheet"><div class="sheet-inner">
    <div class="sheet-head"><div class="grab"></div><button class="sheet-x" data-close aria-label="Cerrar">✕</button></div>${html}</div></div>`;
  $sheet.querySelectorAll('[data-close]').forEach(b => b.onclick = () => closeSheet());
  if (!already) history.pushState({ view: S.view, sheet: true }, '');
  enableSwipeDown($sheet.querySelector('.sheet'));
  onMount?.($sheet.querySelector('.sheet'));
}
function closeSheet(fromPop) {
  if (!$sheet.innerHTML) return;
  $sheet.innerHTML = '';
  if (!fromPop && history.state?.sheet) history.back();
}
function enableSwipeDown(sheet) {
  let y0 = null, dy = 0, dragging = false;
  sheet.addEventListener('touchstart', e => {
    if (sheet.scrollTop > 0 || e.target.closest('input,select,textarea')) { y0 = null; return; }
    y0 = e.touches[0].clientY; dy = 0; dragging = false;
  }, { passive: true });
  sheet.addEventListener('touchmove', e => {
    if (y0 === null) return;
    dy = e.touches[0].clientY - y0;
    if (!dragging && dy > 8 && sheet.scrollTop <= 0) dragging = true;
    if (dragging) { e.preventDefault(); sheet.style.transition = 'none'; sheet.style.transform = `translateY(${Math.max(0, dy)}px)`; }
  }, { passive: false });
  sheet.addEventListener('touchend', () => {
    if (!dragging) { y0 = null; return; }
    sheet.style.transition = 'transform .2s ease';
    if (dy > 90) { sheet.style.transform = 'translateY(100%)'; setTimeout(() => closeSheet(), 180); }
    else sheet.style.transform = '';
    y0 = null; dragging = false;
  });
}

function assigneeSeg(name, value, withAuto, autoLabel) {
  const opts = [...(withAuto ? [['', autoLabel]] : [['', 'Nadie']]), ...sortedMembers().map(m => [m.slug, m.name])];
  return `<div class="seg" data-seg="${name}">${opts.map(([v, l]) => `<button type="button" data-v="${esc(v)}" class="${(value || '') === v ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
}
function segValue(root, name) { return root.querySelector(`[data-seg="${name}"] .on`)?.dataset.v || null; }
function wireSegs(root) {
  root.querySelectorAll('.seg').forEach(seg => seg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  }));
}

function taskSheet(t, roomId) {
  const isNew = !t;
  t = t || { name: '', room_id: roomId, every_n: 1, every_unit: 'week', next_due: thisWeekendSat(), assignee: null, points: 10 };
  const r = room(t.room_id);
  const auto = r.default_assignee ? `Auto (${memberName(r.default_assignee)})` : 'Sin asignar';
  openSheet(`
    <h2>${isNew ? 'Nueva tarea' : esc(t.name)}</h2>
    ${!isNew ? `<button class="btn" data-x="done" style="margin-bottom:16px">✓ Marcar como hecha</button>` : ''}
    <div class="field"><label>Nombre</label><input class="input" name="name" value="${esc(t.name)}" placeholder="p.ej. Limpiar horno"></div>
    <div class="field"><label>Habitación</label><select class="input" name="room">${[...S.data.rooms].sort((a, b) => a.sort - b.sort).map(x => `<option value="${x.id}" ${x.id === t.room_id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
    <div class="field"><label>Se repite</label><div class="inline">
      <input class="input" name="n" type="number" min="1" max="99" inputmode="numeric" value="${t.every_n}">
      <select class="input" name="unit">${[['day', 'días'], ['week', 'semanas'], ['month', 'meses']].map(([v, l]) => `<option value="${v}" ${v === t.every_unit ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </div></div>
    <div class="field"><label>Próxima vez</label>
      <input class="input" name="due" type="date" value="${t.next_due}">
      <div class="quick">
        <button type="button" data-q="weekend">Este finde</button>
        <button type="button" data-q="next">Próximo finde</button>
        <button type="button" data-q="+7">+1 semana</button>
        <button type="button" data-q="+28">+4 semanas</button>
      </div>
      ${t.last_done ? `<div class="hint">Última vez: ${fmtShort(localDate(t.last_done))}</div>` : ''}
    </div>
    <div class="field"><label>¿Quién la hace?</label>${assigneeSeg('who', t.assignee, true, auto)}
      <div class="hint">${r.default_assignee ? 'Por defecto la hace quien tiene asignada la habitación.' : 'Si la asignan para el finde, al marcarla hecha vuelve a quedar sin asignar.'}</div></div>
    <div class="field"><label>Daño a Dusty (puntos)</label><div class="seg" data-seg="pts">${[5, 10, 15, 20, 30].map(p => `<button type="button" data-v="${p}" class="${p === t.points ? 'on' : ''}">${p}</button>`).join('')}</div></div>
    <button class="btn" data-x="save">${isNew ? 'Crear tarea' : 'Guardar cambios'}</button>
    ${!isNew ? `<button class="btn danger" data-x="delete" style="margin-top:6px">Eliminar tarea</button>` : ''}
  `, root => {
    wireSegs(root);
    const due = root.querySelector('[name=due]');
    root.querySelector('.quick').addEventListener('click', e => {
      const q = e.target.closest('button')?.dataset.q; if (!q) return;
      const base = due.value || today();
      if (q === 'weekend') due.value = thisWeekendSat();
      else if (q === 'next') due.value = addDays(saturdayOf(today()), 7);
      else due.value = addDays(base, Number(q));
    });
    root.querySelector('[data-x=save]').onclick = async () => {
      const name = root.querySelector('[name=name]').value.trim();
      if (!name) return toast('Ponle un nombre a la tarea');
      const data = { name, room_id: root.querySelector('[name=room]').value,
        every_n: Math.max(1, parseInt(root.querySelector('[name=n]').value) || 1),
        every_unit: root.querySelector('[name=unit]').value, next_due: due.value || today(),
        assignee: segValue(root, 'who') || null, points: Number(segValue(root, 'pts') || 10) };
      closeSheet();
      try { isNew ? await store.addTask(data) : await store.updateTask(t.id, data); toast(isNew ? 'Tarea creada' : 'Guardado'); }
      catch (e) { toast('Error: ' + e.message); }
      reload();
    };
    root.querySelector('[data-x=done]')?.addEventListener('click', () => { closeSheet(); completeTask(t.id); });
    root.querySelector('[data-x=delete]')?.addEventListener('click', async () => {
      if (!confirm(`¿Eliminar "${t.name}"?`)) return;
      closeSheet(); await store.deleteTask(t.id); reload();
    });
  });
}

function roomSheet(r) {
  const isNew = !r;
  r = r || { name: '', default_assignee: null, sort: (Math.max(0, ...S.data.rooms.map(x => x.sort)) + 1) };
  openSheet(`
    <h2>${isNew ? 'Nueva habitación' : 'Editar habitación'}</h2>
    <div class="field"><label>Nombre</label><input class="input" name="name" value="${esc(r.name)}" placeholder="p.ej. Terraza"></div>
    <div class="field"><label>¿Quién se encarga siempre?</label>${assigneeSeg('who', r.default_assignee, false)}
      <div class="hint">Si eliges a alguien, todas las tareas de esta habitación le llegan a esa persona. Con "Nadie", se reparten cada finde.</div></div>
    <button class="btn" data-x="save">${isNew ? 'Crear' : 'Guardar'}</button>
    ${!isNew ? `<button class="btn danger" data-x="delete" style="margin-top:6px">Eliminar habitación y sus tareas</button>` : ''}
  `, root => {
    wireSegs(root);
    root.querySelector('[data-x=save]').onclick = async () => {
      const name = root.querySelector('[name=name]').value.trim(); if (!name) return toast('Ponle un nombre');
      const data = { name, default_assignee: segValue(root, 'who') || null };
      closeSheet();
      isNew ? await store.addRoom({ ...data, sort: r.sort }) : await store.updateRoom(r.id, data);
      reload();
    };
    root.querySelector('[data-x=delete]')?.addEventListener('click', async () => {
      if (!confirm(`¿Eliminar "${r.name}" y todas sus tareas?`)) return;
      closeSheet(); await store.deleteRoom(r.id); history.replaceState({ view: 'casa' }, ''); S.view = 'casa'; reload();
    });
  });
}

function settingsSheet() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  openSheet(`
    <h2>Ajustes</h2>
    ${isDemo ? `<div class="field"><label>¿Quién eres? (solo en demo)</label>${assigneeSeg('me', store.me, false).replace('>Nadie<', ' style="display:none">Nadie<')}</div>`
      : `<div class="card">Conectado como <b>${esc(memberName(store.me))}</b></div>`}
    <div class="field"><label>Avisos del finde</label>
      <button class="btn secondary" data-x="push">🔔 Activar avisos en este teléfono</button>
      <div class="hint">${standalone ? 'Cada sábado por la mañana te llega "este finde te toca…".' : 'En iPhone: primero instala la app (Compartir → "Añadir a pantalla de inicio") y ábrela desde el ícono.'}</div>
    </div>
    <button class="btn secondary" data-x="out" style="margin-top:8px">${isDemo ? 'Reiniciar datos de demo' : 'Cerrar sesión'}</button>
  `, root => {
    wireSegs(root);
    root.querySelector('[data-seg=me]')?.addEventListener('click', () => { const v = segValue(root, 'me'); if (v) { store.setMe(v); render(); } });
    root.querySelector('[data-x=push]').onclick = enablePush;
    root.querySelector('[data-x=out]').onclick = () => { if (confirm(isDemo ? '¿Borrar los datos de demo?' : '¿Cerrar sesión?')) store.signOut(); };
  });
}

function urlB64(b) { const p = '='.repeat((4 - b.length % 4) % 4); const r = atob((b + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, c => c.charCodeAt(0)); }
async function enablePush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window))
      return toast('En iPhone, instala la app en la pantalla de inicio y ábrela desde ahí para activar avisos.');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return toast('No diste permiso para notificaciones.');
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ||
      await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(CONFIG.vapidPublicKey) });
    await store.savePush(sub);
    toast('🔔 Avisos activados');
  } catch (e) { toast(e.message); }
}

/* ============ Eventos ============ */
$app.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const { act, id } = el.dataset;
  if (act === 'tab') go(el.dataset.v, false);
  else if (act === 'done') { el.classList.add('done'); setTimeout(() => completeTask(id), 180); }
  else if (act === 'open') taskSheet(S.data.tasks.find(t => t.id === id));
  else if (act === 'assign') { const t = S.data.tasks.find(x => x.id === id); t.assignee = el.dataset.m; render(); store.updateTask(id, { assignee: el.dataset.m }).catch(err => toast(err.message)); }
  else if (act === 'room') go('room:' + id, true);
  else if (act === 'new-room') roomSheet();
  else if (act === 'edit-room') roomSheet(S.data.rooms.find(r => r.id === id));
  else if (act === 'new-task') taskSheet(null, el.dataset.room);
  else if (act === 'settings') settingsSheet();
  else if (act === 'toggle-done') { S.showDone = !S.showDone; render(); }
  else if (act === 'toggle-soon') { S.showSoon = !S.showSoon; render(); }
});

function go(view, push) {
  if (view === S.view) return;
  if (S.view.startsWith('room:') && view === 'casa' && history.state?.view === S.view) { history.back(); return; }
  push ? history.pushState({ view }, '') : history.replaceState({ view }, '');
  S.view = view; render(); scrollTo(0, 0);
}
window.addEventListener('popstate', e => {
  if ($sheet.innerHTML) { closeSheet(true); if (!e.state?.sheet) return; }
  S.view = e.state?.view || 'finde'; render();
});
history.replaceState({ view: S.view }, '');

function onScroll() {
  const mb = document.getElementById('minibar'); if (!mb) return;
  const h1 = $app.querySelector('.topbar h1');
  const limit = h1 ? h1.getBoundingClientRect().bottom + scrollY - 10 : 60;
  mb.classList.toggle('show', scrollY > limit);
}
addEventListener('scroll', onScroll, { passive: true });

/* ============ Arranque ============ */
async function reload() {
  try { S.data = await store.load(); render(); }
  catch (e) {
    if (e.code === 'not-member') return notMember();
    toast('Sin conexión: ' + e.message);
  }
}

function loginView(mode = 'in', err = '') {
  $app.innerHTML = `<div class="login"><div class="logo">🧹</div><h1>Casa Limpia</h1><p>Contra Dusty, en equipo.</p>
    <form>
      <div class="field"><label>Email</label><input class="input" name="email" type="email" autocomplete="email" required></div>
      <div class="field"><label>Contraseña</label><input class="input" name="pw" type="password" autocomplete="${mode === 'in' ? 'current-password' : 'new-password'}" minlength="6" required></div>
      ${err ? `<div class="err">${esc(err)}</div>` : ''}
      <button class="btn">${mode === 'in' ? 'Entrar' : 'Crear cuenta'}</button>
    </form>
    <button class="linkish" data-mode>${mode === 'in' ? 'Primera vez: crear cuenta' : 'Ya tengo cuenta'}</button></div>`;
  $app.querySelector('[data-mode]').onclick = () => loginView(mode === 'in' ? 'up' : 'in');
  $app.querySelector('form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target, email = f.email.value.trim(), pw = f.pw.value;
    f.querySelector('button').disabled = true;
    try { mode === 'in' ? await store.signIn(email, pw) : await store.signUp(email, pw); await reload(); }
    catch (er) { loginView(mode, er.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos' : er.message); }
  };
}
function notMember() {
  $app.innerHTML = `<div class="login"><div class="logo">🚪</div><h1>Casi…</h1>
    <p>Tu email no está en la lista de la casa. Hay que agregarlo en la tabla <b>members</b> de Supabase.</p>
    <button class="btn secondary" id="out">Cerrar sesión</button></div>`;
  document.getElementById('out').onclick = () => store.signOut();
}

(async function main() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  try {
    const ok = await store.init();
    store.onChange(() => reload());
    if (!ok) return loginView();
    await reload();
  } catch (e) {
    $app.innerHTML = `<div class="login"><div class="logo">😿</div><h1>Sin conexión</h1><p>${esc(e.message)}</p><button class="btn" onclick="location.reload()">Reintentar</button></div>`;
  }
  // Al volver a la app (o cambiar de día) refrescamos
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.data) render(); });
})();
