-- إضافة خدمة «إلغاء عقد استثماري» إلى قاعدة بيانات قائمة.
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor قبل نشر الواجهة الجديدة.

begin;

alter table public.requests
  drop constraint if exists requests_type_check;

alter table public.requests
  add constraint requests_type_check
  check (type in ('new', 'renewal', 'waiver', 'cancellation'));

commit;
