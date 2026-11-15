-- ============================================================
--  Casa Limpia — esquema de base de datos (Supabase)
--  Pega TODO este archivo en Supabase → SQL Editor → Run.
--  Luego pega supabase/seed.sql para cargar las tareas.
-- ============================================================

-- 1) Quiénes pueden usar la app.
--    ⚠️ CAMBIA LOS EMAILS por los que usarán Vicho y Cami para entrar.
create table if not exists members (
  slug  text primary key,           -- 'vicho' | 'cami'
  name  text not null,
  email text unique not null,
  color text
);
insert into members (slug, name, email, color) values
  ('vicho', 'Vicho', 'EMAIL_DE_VICHO@ejemplo.com', '#2f7d6d'),
  ('cami',  'Cami',  'EMAIL_DE_CAMI@ejemplo.com',  '#d4644a')
on conflict (slug) do update set email = excluded.email, name = excluded.name;

-- 2) Habitaciones y tareas
create table if not exists rooms (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  sort             int  not null default 0,
  default_assignee text references members(slug) on delete set null, -- p.ej. Cocina → vicho
  created_at       timestamptz default now()
);

create table if not exists tasks (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references rooms(id) on delete cascade,
  name       text not null,
  every_n    int  not null default 1 check (every_n > 0),
  every_unit text not null default 'week' check (every_unit in ('day','week','month')),
  next_due   date not null default current_date,
  last_done  timestamptz,
  assignee   text references members(slug) on delete set null, -- asignación puntual del finde
  points     int  not null default 10,
  created_at timestamptz default now()
);

-- 3) Historial, victorias contra Dusty y suscripciones a avisos
create table if not exists completions (
  id        uuid primary key default gen_random_uuid(),
  task_id   uuid references tasks(id) on delete set null,
  task_name text,
  room_name text,
  done_by   text references members(slug) on delete set null,
  done_at   timestamptz not null default now(),
  points    int not null default 10
);

create table if not exists victories (
  week_start date primary key,
  created_at timestamptz default now()
);

create table if not exists push_subscriptions (
  endpoint     text primary key,
  member_slug  text not null references members(slug) on delete cascade,
  subscription jsonb not null,
  created_at   timestamptz default now()
);

-- 4) Seguridad: solo los emails de la tabla members pueden leer/escribir
create or replace function is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

alter table members            enable row level security;
alter table rooms              enable row level security;
alter table tasks              enable row level security;
alter table completions        enable row level security;
alter table victories          enable row level security;
alter table push_subscriptions enable row level security;

drop policy if exists "miembros leen" on members;
create policy "miembros leen" on members for select to authenticated using (is_member());

do $$
declare t text;
begin
  foreach t in array array['rooms','tasks','completions','victories','push_subscriptions'] loop
    execute format('drop policy if exists "miembros" on %I', t);
    execute format('create policy "miembros" on %I for all to authenticated using (is_member()) with check (is_member())', t);
  end loop;
end $$;

grant select on members to authenticated;
grant select, insert, update, delete on rooms, tasks, completions, victories, push_subscriptions to authenticated;

-- 5) Tiempo real: que al otro le aparezcan los cambios al instante
do $$
begin
  begin alter publication supabase_realtime add table rooms;       exception when others then null; end;
  begin alter publication supabase_realtime add table tasks;       exception when others then null; end;
  begin alter publication supabase_realtime add table completions; exception when others then null; end;
  begin alter publication supabase_realtime add table victories;   exception when others then null; end;
end $$;
