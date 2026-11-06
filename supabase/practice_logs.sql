-- Run once in the Body Care v2 Supabase SQL Editor.
-- Additive migration: retains body_care_studio_data and its JSON backups.
create table if not exists public.body_care_practice_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_key text not null,
  practice_date date not null,
  category text not null check (category in ('face','voice')),
  duration_seconds numeric(12,3) not null check (duration_seconds >= 0 and duration_seconds <= 86400),
  created_at timestamptz not null default now(),
  primary key (user_id, entry_key)
);

create index if not exists body_care_practice_logs_user_date
  on public.body_care_practice_logs (user_id, practice_date desc);

alter table public.body_care_practice_logs enable row level security;

drop policy if exists "body_care_practice_select_own" on public.body_care_practice_logs;
create policy "body_care_practice_select_own"
on public.body_care_practice_logs for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "body_care_practice_insert_own" on public.body_care_practice_logs;
create policy "body_care_practice_insert_own"
on public.body_care_practice_logs for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "body_care_practice_update_own" on public.body_care_practice_logs;
create policy "body_care_practice_update_own"
on public.body_care_practice_logs for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Each old JSON daily total is one legacy event. GREATEST makes reruns safe.
create or replace function public.migrate_body_care_practice_logs(p_logs jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_logs) is distinct from 'array' then return; end if;

  insert into public.body_care_practice_logs
     (user_id, entry_key, practice_date, category, duration_seconds)
  select auth.uid(), 'legacy:' || (entry->>'date') || ':' || v.category,
         (entry->>'date')::date, v.category,
         least(86400, greatest(0, (entry->>v.category)::numeric))
  from jsonb_array_elements(p_logs) entry
  cross join (values ('face'),('voice')) v(category)
  where (entry->>'date') ~ '^\\d{4}-\\d{2}-\\d{2}$'
    and coalesce(entry->>v.category,'0') ~ '^\\d+(\\.\\d+)?$'
  on conflict (user_id, entry_key) do update
    set duration_seconds = greatest(
      public.body_care_practice_logs.duration_seconds, excluded.duration_seconds
    );
end;
$$;
revoke all on function public.migrate_body_care_practice_logs(jsonb) from public;
grant execute on function public.migrate_body_care_practice_logs(jsonb) to authenticated;

-- Move existing records already stored in body_care_studio_data.payload.
-- This does NOT delete or modify the original JSON.
insert into public.body_care_practice_logs
     (user_id, entry_key, practice_date, category, duration_seconds)
select d.user_id, 'legacy:' || (entry->>'date') || ':' || v.category,
       (entry->>'date')::date, v.category,
       least(86400, greatest(0, (entry->>v.category)::numeric))
from public.body_care_studio_data d
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(d.payload->'practiceLogs')='array'
  then d.payload->'practiceLogs' else '[]'::jsonb end
) entry
cross join (values ('face'),('voice')) v(category)
where (entry->>'date') ~ '^\\d{4}-\\d{2}-\\d{2}$'
  and coalesce(entry->>v.category,'0') ~ '^\\d+(\\.\\d+)?$'
on conflict (user_id, entry_key) do update
  set duration_seconds = greatest(
    public.body_care_practice_logs.duration_seconds, excluded.duration_seconds
  );

-- For verification in SQL Editor:
-- select category,practice_date,round(sum(duration_seconds)/60,1) as minutes
-- from public.body_care_practice_logs
-- group by category,practice_date order by practice_date desc,category;
