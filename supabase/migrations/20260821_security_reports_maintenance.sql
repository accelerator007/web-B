alter table public.requests add column if not exists site_latitude double precision;
alter table public.requests add column if not exists site_longitude double precision;

create table if not exists public.request_rate_limits (
  key text primary key,
  window_started_at timestamptz not null default now(),
  hits integer not null default 0
);
alter table public.request_rate_limits enable row level security;

create or replace function public.consume_rate_limit(p_key text, p_window_seconds integer, p_max_requests integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare current_hits integer;
begin
  insert into public.request_rate_limits(key, window_started_at, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    window_started_at = case when request_rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds) then now() else request_rate_limits.window_started_at end,
    hits = case when request_rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds) then 1 else request_rate_limits.hits + 1 end
  returning hits into current_hits;
  return current_hits <= p_max_requests;
end; $$;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

insert into storage.buckets (id, name, public, file_size_limit)
values ('database-backups', 'database-backups', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;
