-- ==========================================================================
--  إنشاء حساب مدير النظام (الأدمن) الأول
--  شغّل هذا الملف بعد schema.sql في: Supabase Dashboard > SQL Editor > Run
--
--  بيانات الدخول بعد التشغيل:
--    الرقم الوظيفي : 1001
--    كلمة المرور   : Admin@2026
--
--  ⚠️ غيّر كلمة المرور بعد أول دخول من: لوحة الأدمن ← الموظفون ← «كلمة المرور»
-- ==========================================================================

insert into public.employees (
  employee_number,
  full_name,
  email,
  password_hash,           -- تشفير bcrypt لكلمة المرور: Admin@2026
  department,
  role,
  status,
  approved_at
)
values (
  '1001',
  'مدير النظام العام',
  'sheikhaalmamari4@gmail.com',
  '$2a$10$7j.3JP.QjsDEnzz4JgR1juDBJvT.ALGb5bspLXM9eqbBWvpW6hwK2',
  'admin',
  'admin',
  'active',
  now()
)
on conflict (employee_number) do update
  set full_name      = excluded.full_name,
      email          = excluded.email,
      password_hash  = excluded.password_hash,
      department     = 'admin',
      role           = 'admin',
      status         = 'active',
      approved_at    = now();

-- عرض الحساب للتأكد
select employee_number as "الرقم الوظيفي",
       full_name       as "الاسم",
       email           as "البريد",
       role            as "الصلاحية",
       status          as "الحالة"
from public.employees
where employee_number = '1001';
