-- One-time migration: run this in the Supabase SQL editor against your
-- existing tuna-ledger project to bring its live schema in line with the
-- no-auth version of supabase/schema.sql. Safe to run once; drops the
-- user_id columns and all RLS policies (your cans/meals rows and their
-- other columns are untouched).

alter table cans drop column if exists user_id;
alter table meals drop column if exists user_id;

drop policy if exists "users manage own cans" on cans;
drop policy if exists "users manage own meals" on meals;
drop policy if exists "authenticated can read types" on can_types;
drop policy if exists "authenticated can insert types" on can_types;

alter table cans disable row level security;
alter table meals disable row level security;
alter table can_types disable row level security;
