import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/supabase';
import { RequestsTable } from '@/components/requests-table';
import { formatDate } from '@/components/ui';
import { DEPARTMENTS, REQUEST_TYPES, type RequestType } from '@/lib/constants';
import type { RequestRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function countWhere(column: string, value: string) {
  const { count } = await db()
    .from('requests')
    .select('id', { count: 'exact', head: true })
    .eq(column, value);
  return count ?? 0;
}

export default async function AdminHome() {
  await requireAdmin();
  const supa = db();

  const [
    total,
    pendingDepartments,
    pendingFinance,
    pendingInvestment,
    approved,
    rejected,
    typeNew,
    typeRenewal,
    typeWaiver,
  ] = await Promise.all([
    supa.from('requests').select('id', { count: 'exact', head: true }).then((r) => r.count ?? 0),
    countWhere('status', 'pending_departments'),
    countWhere('status', 'pending_finance'),
    countWhere('status', 'pending_investment'),
    countWhere('status', 'approved'),
    countWhere('status', 'rejected'),
    countWhere('type', 'new'),
    countWhere('type', 'renewal'),
    countWhere('type', 'waiver'),
  ]);

  const [{ count: employeesCount }, { count: pendingAccounts }, { data: latest }, { data: audit }] =
    await Promise.all([
      supa.from('employees').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supa.from('employees').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supa.from('requests').select('*').order('created_at', { ascending: false }).limit(10),
      supa.from('audit_log').select('*').order('created_at', { ascending: false }).limit(8),
    ]);

  const byType: { type: RequestType; value: number }[] = [
    { type: 'new', value: typeNew },
    { type: 'renewal', value: typeRenewal },
    { type: 'waiver', value: typeWaiver },
  ];

  const cards = [
    { label: 'إجمالي الطلبات', value: total, tone: 'bg-slate-900 text-white' },
    { label: 'قيد دراسة الأقسام', value: pendingDepartments, tone: 'bg-amber-50 text-amber-800' },
    { label: 'لدى الشؤون المالية', value: pendingFinance, tone: 'bg-sky-50 text-sky-800' },
    { label: 'لدى دائرة الاستثمار', value: pendingInvestment, tone: 'bg-indigo-50 text-indigo-800' },
    { label: 'معتمدة', value: approved, tone: 'bg-emerald-50 text-emerald-800' },
    { label: 'مرفوضة', value: rejected, tone: 'bg-rose-50 text-rose-800' },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">لوحة تحكم إدارة النظام</h1>
          <p className="mt-1 text-sm text-slate-600">نظرة شاملة على الطلبات والموظفين.</p>
        </div>
        {(pendingAccounts ?? 0) > 0 && (
          <Link href="/admin/employees/requests" className="btn-primary !py-2 !text-sm">
            طلبات حسابات بانتظار الاعتماد ({pendingAccounts})
          </Link>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className={`card p-5 ${c.tone === 'bg-slate-900 text-white' ? 'bg-slate-900' : ''}`}>
            <div
              className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${
                c.tone === 'bg-slate-900 text-white' ? 'bg-white/10 text-white' : c.tone
              }`}
            >
              {c.label}
            </div>
            <div
              className={`mt-3 text-3xl font-extrabold ${
                c.tone === 'bg-slate-900 text-white' ? 'text-white' : 'text-slate-900'
              }`}
            >
              {c.value}
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-6">
          <h2 className="text-lg font-extrabold text-slate-900">الطلبات حسب النوع</h2>
          <ul className="mt-4 space-y-4">
            {byType.map((t) => {
              const pct = total ? Math.round((t.value / total) * 100) : 0;
              return (
                <li key={t.type}>
                  <div className="flex justify-between text-sm font-semibold text-slate-700">
                    <span>{REQUEST_TYPES[t.type]}</span>
                    <span>
                      {t.value} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">الموظفون المفعّلون</span>
              <span className="font-bold text-slate-800">{employeesCount ?? 0}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-slate-500">طلبات حسابات معلّقة</span>
              <span className="font-bold text-slate-800">{pendingAccounts ?? 0}</span>
            </div>
          </div>
        </section>

        <section className="card p-6 lg:col-span-2">
          <h2 className="text-lg font-extrabold text-slate-900">آخر العمليات على النظام</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {(audit ?? []).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="font-semibold text-slate-700">{auditLabel(a.action)}</span>
                <span className="text-slate-500">{a.actor_name ?? '—'}</span>
                <span className="text-xs text-slate-400">{formatDate(a.created_at)}</span>
              </li>
            ))}
            {(audit ?? []).length === 0 && <li className="py-6 text-sm text-slate-500">لا توجد عمليات بعد.</li>}
          </ul>
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-900">أحدث الطلبات</h2>
          <Link href="/admin/requests" className="text-sm font-bold text-brand-700 hover:underline">
            إدارة كل الطلبات
          </Link>
        </div>
        <RequestsTable rows={(latest ?? []) as RequestRow[]} basePath="/admin/requests" />
      </section>

      <p className="text-xs text-slate-400">
        الأقسام في النظام: {Object.values(DEPARTMENTS).join(' • ')}
      </p>
    </div>
  );
}

function auditLabel(action: string) {
  const map: Record<string, string> = {
    account_requested: 'طلب إنشاء حساب جديد',
    account_approved: 'اعتماد حساب موظف',
    account_rejected: 'رفض طلب حساب',
    employee_created: 'إنشاء حساب موظف',
    employee_updated: 'تعديل بيانات موظف',
    employee_deleted: 'حذف موظف',
    employee_password_changed: 'تغيير كلمة مرور موظف',
    password_reset_otp: 'إعادة تعيين كلمة المرور عبر OTP',
    request_deleted: 'حذف طلب',
    decision_approved: 'موافقة على طلب',
    decision_rejected: 'رفض طلب',
  };
  return map[action] ?? action;
}
