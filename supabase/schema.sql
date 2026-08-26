-- ==========================================================================
--  بوابة استثمار المواقع الحكومية — دائرة البلدية بالسويق
--  مخطط قاعدة البيانات (Supabase / PostgreSQL)
--  شغّل هذا الملف كاملاً في: Supabase Dashboard > SQL Editor > New query
-- ==========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- الموظفون
-- department: technical | health | finance | investment | admin
-- role:       employee | admin
-- status:     pending (بانتظار موافقة الأدمن) | active | rejected | disabled
create table if not exists public.employees (
  id              uuid primary key default gen_random_uuid(),
  employee_number text not null unique,
  full_name       text not null,
  email           text not null unique,
  password_hash   text not null,
  department      text not null check (department in ('technical','health','finance','investment','admin')),
  role            text not null default 'employee' check (role in ('employee','admin')),
  status          text not null default 'pending' check (status in ('pending','active','rejected','disabled')),
  reject_reason   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  approved_at     timestamptz,
  approved_by     uuid references public.employees(id) on delete set null,
  last_login_at   timestamptz
);

create index if not exists employees_department_idx on public.employees(department);
create index if not exists employees_status_idx     on public.employees(status);

-- ---------------------------------------------------------------- الطلبات
-- type:   new (استثمار جديد) | renewal (تجديد عقد) | waiver (تنازل) | cancellation (إلغاء عقد)
-- status: pending_departments | pending_finance | pending_investment | approved | rejected
create table if not exists public.requests (
  id                uuid primary key default gen_random_uuid(),
  request_number    text not null unique,
  type              text not null check (type in ('new','renewal','waiver','cancellation')),

  -- بيانات المواطن
  civil_number      text not null,
  full_name         text not null,
  phone             text not null,
  site_location_url text not null,
  site_latitude     double precision,
  site_longitude    double precision,
  citizen_notes     text,

  status            text not null default 'pending_departments'
                    check (status in ('pending_departments','pending_finance','pending_investment','approved','rejected')),

  -- قرارات الأقسام الفنية والرقابة الصحية والغذائية
  technical_decision   text check (technical_decision in ('approved','rejected')),
  technical_notes      text,
  technical_by_name    text,
  technical_by_number  text,
  technical_at         timestamptz,

  health_decision      text check (health_decision in ('approved','rejected')),
  health_notes         text,
  health_by_name       text,
  health_by_number     text,
  health_at            timestamptz,

  -- الشؤون المالية
  payment_status    text not null default 'unpaid' check (payment_status in ('unpaid','paid','exempt')),
  payment_amount    numeric(12,3),
  payment_reference text,
  finance_notes     text,
  finance_by_name   text,
  finance_by_number text,
  finance_at        timestamptz,

  -- دائرة الاستثمار (القرار النهائي)
  investment_notes     text,
  investment_by_name   text,
  investment_by_number text,
  investment_at        timestamptz,

  -- في حال الرفض: من أي جهة ومن صاحب القرار
  rejected_by_department text check (rejected_by_department in ('technical','health','finance','investment','admin')),
  rejected_by_name       text,
  rejected_by_number     text,
  rejection_notes        text,
  rejected_at            timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists requests_civil_idx   on public.requests(civil_number);
create index if not exists requests_status_idx  on public.requests(status);
create index if not exists requests_type_idx    on public.requests(type);
create index if not exists requests_created_idx on public.requests(created_at desc);

-- ترقية آمنة لقواعد البيانات المنشأة قبل إضافة رابط الموقع.
alter table public.requests add column if not exists site_location_url text;
alter table public.requests add column if not exists site_latitude double precision;
alter table public.requests add column if not exists site_longitude double precision;

-- ---------------------------------------------------------------- المرفقات
create table if not exists public.attachments (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.requests(id) on delete cascade,
  field_key    text not null,           -- request_letter | commercial_registration | ...
  file_name    text not null,
  storage_path text not null,           -- المسار داخل bucket: attachments
  mime_type    text,
  size_bytes   bigint,
  created_at   timestamptz not null default now()
);

create index if not exists attachments_request_idx on public.attachments(request_id);

-- ------------------------------------------------ سجل القرارات (Timeline)
create table if not exists public.reviews (
  id               uuid primary key default gen_random_uuid(),
  request_id       uuid not null references public.requests(id) on delete cascade,
  department       text not null check (department in ('technical','health','finance','investment','admin','citizen')),
  action           text not null,       -- submitted | approved | rejected | paid | unpaid | deleted | reopened
  notes            text,
  employee_id      uuid references public.employees(id) on delete set null,
  employee_name    text,
  employee_number  text,
  created_at       timestamptz not null default now()
);

create index if not exists reviews_request_idx on public.reviews(request_id, created_at);

-- ---------------------------------------------------------------- الإشعارات
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  request_id  uuid references public.requests(id) on delete cascade,
  title       text not null,
  body        text,
  is_read     boolean not null default false,
  email_sent  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_employee_idx on public.notifications(employee_id, is_read, created_at desc);

-- ------------------------------------------------------ رموز إعادة التعيين
create table if not exists public.otp_codes (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  code_hash   text not null,
  purpose     text not null default 'password_reset',
  expires_at  timestamptz not null,
  used_at     timestamptz,
  attempts    int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists otp_employee_idx on public.otp_codes(employee_id, created_at desc);

-- ---------------------------------------------------------------- سجل التدقيق
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.employees(id) on delete set null,
  actor_name  text,
  action      text not null,
  target_type text,
  target_id   text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------- عدّاد رقم الطلب
create sequence if not exists public.request_seq start 1;

create or replace function public.next_request_number()
returns text
language plpgsql
as $$
declare
  n bigint;
begin
  n := nextval('public.request_seq');
  return 'SWQ-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 5, '0');
end;
$$;

-- ------------------------------------------------------- updated_at تلقائي
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists requests_touch on public.requests;
create trigger requests_touch before update on public.requests
  for each row execute function public.touch_updated_at();

drop trigger if exists employees_touch on public.employees;
create trigger employees_touch before update on public.employees
  for each row execute function public.touch_updated_at();

-- ==========================================================================
--  الحماية: كل الوصول يتم من الخادم (Next.js) بمفتاح service_role فقط.
--  نفعّل RLS بدون سياسات عامة => لا يمكن لأي مفتاح anon قراءة أو كتابة شيء.
-- ==========================================================================
alter table public.employees      enable row level security;
alter table public.requests       enable row level security;
alter table public.attachments    enable row level security;
alter table public.reviews        enable row level security;
alter table public.notifications  enable row level security;
alter table public.otp_codes      enable row level security;
alter table public.audit_log      enable row level security;

-- ------------------------------------------------------ تحديد معدل الطلبات
-- يُستخدم من إجراءات الخادم لمنع الإغراق ومحاولات الدخول المتكررة.
create table if not exists public.request_rate_limits (
  key               text primary key,
  window_started_at timestamptz not null default now(),
  hits              integer not null default 0
);

alter table public.request_rate_limits enable row level security;

create or replace function public.consume_rate_limit(
  p_key text,
  p_window_seconds integer,
  p_max_requests integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_hits integer;
begin
  insert into public.request_rate_limits(key, window_started_at, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    window_started_at = case
      when request_rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds)
        then now()
      else request_rate_limits.window_started_at
    end,
    hits = case
      when request_rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds)
        then 1
      else request_rate_limits.hits + 1
    end
  returning hits into current_hits;

  return current_hits <= p_max_requests;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

-- ==========================================================================
--  التخزين: مكان حفظ الملفات والصور  ➜  Supabase Storage (bucket خاص)
--  المسار داخل الـ bucket: requests/<request_id>/<field_key>-<uuid>.<ext>
--  الوصول للملف يتم عبر رابط موقّع مؤقت (Signed URL) يُنشئه الخادم فقط.
-- ==========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments', 'attachments', false, 10485760,
  array['application/pdf','image/jpeg','image/jpg','image/png','image/webp','image/heic']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760,
      allowed_mime_types = array['application/pdf','image/jpeg','image/jpg','image/png','image/webp','image/heic'];

-- Bucket خاص للنسخ الاحتياطية التي تنشئها وظيفة الصيانة الدورية.
insert into storage.buckets (id, name, public, file_size_limit)
values ('database-backups', 'database-backups', false, 52428800)
on conflict (id) do update
  set public = false,
      file_size_limit = 52428800;
