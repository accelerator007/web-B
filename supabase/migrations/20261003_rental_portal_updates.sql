-- تحديثات بوابة الإيجار: حفظ نوع النشاط وإتاحة نشر المواقع المعروضة للاستغلال.
alter table public.requests add column if not exists activity_type text;

create table if not exists public.available_sites (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  activity_type text,
  description   text,
  location_url  text not null,
  latitude      double precision,
  longitude     double precision,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists available_sites_published_idx
  on public.available_sites(is_published, created_at desc);

drop trigger if exists available_sites_touch on public.available_sites;
create trigger available_sites_touch before update on public.available_sites
  for each row execute function public.touch_updated_at();

alter table public.available_sites enable row level security;
