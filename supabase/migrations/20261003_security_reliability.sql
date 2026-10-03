-- إبطال الجلسات بعد تغيير كلمة المرور، وإغلاق أي حساب ما زال يستخدم
-- كلمة مرور المدير الافتراضية التي نُشرت سابقاً في المستودع.
alter table public.employees
  add column if not exists session_version integer not null default 1;

alter table public.employees
  drop constraint if exists employees_session_version_check;
alter table public.employees
  add constraint employees_session_version_check check (session_version > 0);

create or replace function public.set_employee_password(
  p_employee_id uuid,
  p_password_hash text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_version integer;
begin
  update public.employees
  set password_hash = p_password_hash,
      session_version = session_version + 1,
      updated_at = now()
  where id = p_employee_id
  returning session_version into next_version;

  if next_version is null then
    raise exception 'employee not found';
  end if;
  return next_version;
end;
$$;

revoke all on function public.set_employee_password(uuid, text) from public, anon, authenticated;
grant execute on function public.set_employee_password(uuid, text) to service_role;

update public.employees
set status = 'disabled',
    session_version = session_version + 1,
    updated_at = now()
where employee_number = '1001'
  and password_hash = '$2a$10$7j.3JP.QjsDEnzz4JgR1juDBJvT.ALGb5bspLXM9eqbBWvpW6hwK2';
