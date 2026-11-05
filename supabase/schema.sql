-- Body Care Studio: run in the target Supabase SQL Editor.
create table if not exists public.body_care_studio_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.body_care_studio_data enable row level security;
drop policy if exists "body_care_select_own" on public.body_care_studio_data;
create policy "body_care_select_own" on public.body_care_studio_data for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "body_care_insert_own" on public.body_care_studio_data;
create policy "body_care_insert_own" on public.body_care_studio_data for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "body_care_update_own" on public.body_care_studio_data;
create policy "body_care_update_own" on public.body_care_studio_data for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
