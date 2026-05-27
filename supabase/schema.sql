-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

create table if not exists public.mushroom_timers (
    point_name text primary key,
    rebirth_at bigint,  -- Unix epoch milliseconds; null = no active timer
    updated_at timestamptz not null default now()
);

alter table public.mushroom_timers enable row level security;

-- Family tool: open read/write for anon key (keep repo URL private)
create policy "anon_select_mushroom_timers"
    on public.mushroom_timers for select
    to anon
    using (true);

create policy "anon_insert_mushroom_timers"
    on public.mushroom_timers for insert
    to anon
    with check (true);

create policy "anon_update_mushroom_timers"
    on public.mushroom_timers for update
    to anon
    using (true)
    with check (true);

create policy "anon_delete_mushroom_timers"
    on public.mushroom_timers for delete
    to anon
    using (true);

-- Realtime: enable in Dashboard → Database → Replication
-- Add table `mushroom_timers` to supabase_realtime publication if not auto-enabled.
