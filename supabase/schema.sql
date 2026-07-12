-- Run this once against your Supabase Postgres project (SQL editor or `supabase db push`).
-- Requires Supabase Auth (auth.users) — enable Email provider, and optionally
-- Google, under Authentication > Providers in the dashboard.

create table if not exists can_types (
  id serial primary key,
  name text unique not null,
  color text not null,
  sort integer default 0
);

create table if not exists cans (
  id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brand text not null,
  product text,
  type_id integer references can_types(id),
  label_weight double precision,
  default_price double precision,
  protein_per_100 double precision,
  notes text,
  created_at bigint not null
);

create table if not exists meals (
  id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  can_id integer not null references cans(id) on delete cascade,
  drained double precision not null,
  price double precision not null,
  note text,
  eaten_at bigint not null
);

-- can_types is shared reference data (Water, Olive oil, ...), not per-user:
-- any logged-in user can read it, and can add new labels for everyone.
alter table can_types enable row level security;
create policy "authenticated can read types" on can_types for select to authenticated using (true);
create policy "authenticated can insert types" on can_types for insert to authenticated with check (true);

-- cans and meals are strictly per-user: RLS restricts every operation to
-- rows owned by the calling user (auth.uid()). The server queries these
-- tables using a client authenticated as the end user (not service_role),
-- so this is the actual enforcement point, not just defense in depth.
alter table cans enable row level security;
create policy "users manage own cans" on cans for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table meals enable row level security;
create policy "users manage own meals" on meals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
