import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/supabase';
import { DEPARTMENTS } from '@/lib/constants';
import { formatDate } from '@/components/ui';
import { EmployeeRowActions } from '@/components/admin/employee-row-actions';
import {
  changeEmployeePasswordAction,
  deleteEmployeeAction,
  updateEmployeeAction,
} from '../actions';
import type { EmployeeRow } from '@/lib/types';

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  active: { text: 'مفعّل', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  pending: { text: 'بانتظار الاعتماد', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  rejected: { text: 'مرفوض', cls: 'bg-rose-50 text-rose-800 ring-rose-200' },
  disabled: { text: 'موقوف', cls: 'bg-slate-100 text-slate-700 ring-slate-200' },
};

export default async function AdminEmployeesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const queryParams = await searchParams;
  const term = (queryParams.q ?? '').trim();
  let query = db()
    .from('employees')
    .select('id,employee_number,full_name,email,department,role,status,reject_reason,created_at,approved_at,last_login_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (term) query = query.or(`employee_number.ilike.%${term}%,full_name.ilike.%${term}%,email.ilike.%${term}%`);

  const { data } = await query;
  const employees = (data ?? []) as EmployeeRow[];
  const activeCount = employees.filter((employee) => employee.status === 'active').length;
  const adminCount = employees.filter((employee) => employee.role === 'admin').length;
  const departmentCount = new Set(employees.map((employee) => employee.department).filter((d) => d !== 'admin')).size;

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
            إدارة المستخدمين
          </div>
          <h1 className="page-title">الموظفون</h1>
          <p className="page-subtitle">
            إدارة الحسابات والصلاحيات وحالة الوصول من مكان واحد.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Link href="/admin/employees/requests" className="btn-ghost !px-4 !py-2.5 !text-sm">
            طلبات الحسابات
          </Link>
          <Link href="/admin/employees/new" className="btn-primary !px-4 !py-2.5 !text-sm">
            <span aria-hidden="true" className="text-lg leading-none">+</span>
            إنشاء حساب موظف
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4" aria-label="ملخص الموظفين">
        <div className="stat-card col-span-2 sm:col-span-1">
          <div className="text-xs font-bold text-slate-500">إجمالي الحسابات</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-950 sm:text-3xl">{employees.length}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs font-bold text-slate-500">الحسابات المفعّلة</div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-700 sm:text-3xl">{activeCount}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs font-bold text-slate-500">الأقسام النشطة</div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-2xl font-extrabold text-brand-700 sm:text-3xl">{departmentCount}</span>
            <span className="mb-1 hidden text-xs text-slate-400 sm:inline">• {adminCount} مدير</span>
          </div>
        </div>
      </section>

      <form method="get" className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:p-5">
        <div className="flex-1">
          <label className="label" htmlFor="q">
            بحث بالاسم أو الرقم الوظيفي أو البريد
          </label>
          <div className="relative">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" strokeLinecap="round" />
            </svg>
            <input id="q" name="q" defaultValue={term} className="input !pr-11" placeholder="اكتب الاسم، الرقم الوظيفي أو البريد…" />
          </div>
        </div>
        <button className="btn-primary sm:w-28" type="submit">
          بحث
        </button>
      </form>

      <div className="table-wrap">
        <table className="responsive-table min-w-full divide-y divide-slate-200">
          <thead className="sticky top-[132px] z-10 bg-slate-50/95 backdrop-blur">
            <tr>
              <th className="th">الرقم الوظيفي</th>
              <th className="th">الاسم</th>
              <th className="th">البريد الإلكتروني</th>
              <th className="th">القسم</th>
              <th className="th">الصلاحية</th>
              <th className="th">الحالة</th>
              <th className="th">آخر دخول</th>
              <th className="th">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map((e) => {
              const s = STATUS_LABEL[e.status] ?? STATUS_LABEL.disabled;
              return (
                <tr key={e.id} className="transition-colors duration-150 hover:bg-slate-50">
                  <td className="td font-bold text-slate-950" dir="ltr" data-label="الرقم الوظيفي">
                    {e.employee_number}
                  </td>
                  <td className="td font-semibold" data-label="الاسم">{e.full_name}</td>
                  <td className="td" dir="ltr" data-label="البريد الإلكتروني">
                    {e.email}
                  </td>
                  <td className="td" data-label="القسم">{DEPARTMENTS[e.department]}</td>
                  <td className="td" data-label="الصلاحية">{e.role === 'admin' ? 'مدير النظام' : 'موظف'}</td>
                  <td className="td" data-label="الحالة">
                    <span className={`badge ${s.cls}`}>{s.text}</span>
                  </td>
                  <td className="td text-slate-500" data-label="آخر دخول">{formatDate(e.last_login_at)}</td>
                  <td className="td" data-label="">
                    <EmployeeRowActions
                      employee={e}
                      updateAction={updateEmployeeAction}
                      passwordAction={changeEmployeePasswordAction}
                      deleteAction={deleteEmployeeAction}
                    />
                  </td>
                </tr>
              );
            })}
            {employees.length === 0 && (
              <tr className="empty-row">
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                  لا يوجد موظفون
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
