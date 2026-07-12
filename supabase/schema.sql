-- Run this once against your Supabase Postgres project (SQL editor or `supabase db push`).
create table if not exists can_types (
  id serial primary key,
  name text unique not null,
  color text not null,
  sort integer default 0
);

create table if not exists cans (
  id serial primary key,
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
  can_id integer not null references cans(id) on delete cascade,
  drained double precision not null,
  price double precision not null,
  note text,
  eaten_at bigint not null
);

-- Lock the tables down to server-side (service-role) access only. RLS is
-- enabled with no policies, so anon/authenticated get zero access via the
-- public API; service_role bypasses RLS entirely and keeps full access,
-- which is what server/db.js authenticates as.
alter table can_types enable row level security;
alter table cans enable row level security;
alter table meals enable row level security;
