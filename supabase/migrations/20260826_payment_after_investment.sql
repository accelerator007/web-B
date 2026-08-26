-- تحديث مسار المعاملة:
-- الأقسام الفنية والرقابة -> المالية للدراسة -> الاستثمار للموافقة
-- -> المالية لاستكمال الدفع -> اعتماد نهائي.

begin;

alter table public.requests
  drop constraint if exists requests_status_check;

alter table public.requests
  add constraint requests_status_check
  check (status in (
    'pending_departments',
    'pending_finance',
    'pending_investment',
    'pending_payment',
    'approved',
    'rejected'
  ));

commit;
