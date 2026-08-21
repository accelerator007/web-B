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

export const dynamic = 'force-dynamic';

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
  let query = db().from('employees').select('*').order('created_at', { ascending: false });
  if (term) query = query.or(`employee_number.ilike.%${term}%,full_name.ilike.%${term}%,email.ilike.%${term}%`);

  const { data } = await query;
  const employees = (data ?? []) as EmployeeRow[];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">الموظفون</h1>
          <p className="mt-1 text-sm text-slate-600">
            تعديل البيانات، تغيير كلمة المرور، أو حذف الحساب — كل عملية تتطلب كلمة مرور الأدمن.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/employees/requests" className="btn-ghost !py-2 !text-sm">
            طلبات الحسابات
          </Link>
          <Link href="/admin/employees/new" className="btn-primary !py-2 !text-sm">
            إنشاء حساب موظف
          </Link>
        </div>
      </header>

      <form method="get" className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="label" htmlFor="q">
            بحث بالاسم أو الرقم الوظيفي أو البريد
          </label>
          <input id="q" name="q" defaultValue={term} className="input" />
        </div>
        <button className="btn-primary sm:w-32" type="submit">
          بحث
        </button>
      </form>

      <div className="table-wrap">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
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
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="td font-bold" dir="ltr">
                    {e.employee_number}
                  </td>
                  <td className="td">{e.full_name}</td>
                  <td className="td" dir="ltr">
                    {e.email}
                  </td>
                  <td className="td">{DEPARTMENTS[e.department]}</td>
                  <td className="td">{e.role === 'admin' ? 'مدير النظام' : 'موظف'}</td>
                  <td className="td">
                    <span className={`badge ${s.cls}`}>{s.text}</span>
                  </td>
                  <td className="td text-slate-500">{formatDate(e.last_login_at)}</td>
                  <td className="td">
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
              <tr>
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
