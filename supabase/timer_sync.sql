-- Body Care v2: shared Face / Voice timer state.
-- Execute in the SAME Supabase project as practice_logs.sql.
-- Safe to run again; existing practice logs and routines are unchanged.

create table if not exists public.body_care_timer_sessions (
 user_id uuid not null references auth.users(id) on delete cascade,
 area text not null,
 category text not null check(category in ('face','voice')),
 state jsonb not null default '{}'::jsonb,
 owner_token text,
 lease_until timestamptz,
 revision bigint not null default 0,
 updated_at timestamptz not null default now(),
 primary key(user_id,area,category)
);
alter table public.body_care_timer_sessions enable row level security;
grant select on public.body_care_timer_sessions to authenticated;
drop policy if exists "timer_read_own" on public.body_care_timer_sessions;
create policy "timer_read_own" on public.body_care_timer_sessions
 for select to authenticated using ((select auth.uid())=user_id);

-- Claim and update are serialized via row locks. Only one device may run.
-- Command: claim, save, or release. Caller must be signed in.
create or replace function public.body_care_timer_command(
 p_area text,
 p_category text,
 p_command text,
 p_device text,
 p_state jsonb default null
)
returns public.body_care_timer_sessions
language plpgsql security definer set search_path = public as $$
declare
 v_user uuid := (select auth.uid());
 v_row public.body_care_timer_sessions%rowtype;
 v_time timestamptz := clock_timestamp();
begin
 if v_user is null then raise exception 'Login required'; end if;
 if p_area not in ('face','lower','upper')
    or p_category not in ('face','voice')
    or length(p_device) < 8 or length(p_device) > 128
    or p_command not in ('claim','save','release') then
  raise exception 'Invalid timer command';
 end if;
 if p_state is not null and (jsonb_typeof(p_state) <> 'object'
    or pg_column_size(p_state)>200000) then
  raise exception 'Invalid timer state';
 end if;

 insert into public.body_care_timer_sessions(user_id,area,category)
 values(v_user,p_area,p_category)
 on conflict(user_id,area,category) do nothing;

 select * into v_row from public.body_care_timer_sessions
 where user_id=v_user and area=p_area and category=p_category for update;

 if p_command='claim' then
   -- Explicit handoff: the new device takes control immediately.
   update public.body_care_timer_sessions
   set owner_token=p_device,
       lease_until=v_time+interval '15 seconds',
       state=coalesce(p_state,v_row.state),
       revision=revision+1, updated_at=v_time
   where user_id=v_user and area=p_area and category=p_category;
 elsif p_command='save' then
   if v_row.owner_token is distinct from p_device
      or v_row.lease_until is null or v_row.lease_until<v_time then
     raise exception 'Timer owned by another device or lease expired';
   end if;
   update public.body_care_timer_sessions
   set state=coalesce(p_state,v_row.state),
       lease_until=v_time+interval '15 seconds',
       revision=revision+1, updated_at=v_time
   where user_id=v_user and area=p_area and category=p_category;
 else
   if v_row.owner_token=p_device then
     update public.body_care_timer_sessions
     set state=coalesce(p_state,v_row.state),
         owner_token=null,lease_until=null,
         revision=revision+1,updated_at=v_time
     where user_id=v_user and area=p_area and category=p_category;
   end if;
 end if;
 select * into v_row from public.body_care_timer_sessions
 where user_id=v_user and area=p_area and category=p_category;
 return v_row;
end;
$$;
revoke all on function public.body_care_timer_command(text,text,text,text,jsonb) from public;
grant execute on function public.body_care_timer_command(text,text,text,text,jsonb) to authenticated;

-- Optional verification:
-- select area,category,revision,updated_at from public.body_care_timer_sessions;
