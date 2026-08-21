-- إضافة رابط الموقع إلى الطلبات الحالية والجديدة.
alter table public.requests
  add column if not exists site_location_url text;

comment on column public.requests.site_location_url is
  'رابط موقع المكان على خرائط Google أو أي خدمة خرائط';
