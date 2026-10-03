import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { countInbox, fetchInbox } from '@/lib/workflow';
import { countRequests, searchRequests } from '@/lib/queries';
import { DEPARTMENTS, type RequestStatus } from '@/lib/constants';
import { RequestsTable } from '@/components/requests-table';
import type { RequestRow } from '@/lib/types';

export default async function DashboardPage() {
  const user = await requireUser();
  const statuses: RequestStatus[] = [
    'pending_departments', 'pending_finance', 'pending_investment',
    'pending_payment', 'approved', 'rejected',
  ];
  const department = user.role === 'admin' ? undefined : user.department;
  const [inbox, inboxCount, counts, latest] = await Promise.all([
    user.role === 'admin' ? Promise.resolve([] as RequestRow[]) : fetchInbox(user.department),
    user.role === 'admin' ? Promise.resolve(0) : countInbox(user.department),
    Promise.all(statuses.map((status) => countRequests({ status, department }))),
    searchRequests({}, { department, limit: 8 }),
  ]);

  const stats = [
    { label: 'قيد دراسة الأقسام', value: counts[0], tone: 'text-amber-700 bg-amber-50' },
    { label: 'قيد دراسة الشؤون الإدارية والمالية', value: counts[1], tone: 'text-sky-700 bg-sky-50' },
    { label: 'لدى قسم الاستثمار وتنمية الإيرادات', value: counts[2], tone: 'text-indigo-700 bg-indigo-50' },
    { label: 'بانتظار الدفع', value: counts[3], tone: 'text-orange-700 bg-orange-50' },
    { label: 'معتمدة', value: counts[4], tone: 'text-emerald-700 bg-emerald-50' },
    { label: 'مرفوضة', value: counts[5], tone: 'text-rose-700 bg-rose-50' },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-extrabold text-slate-900">مرحباً {user.full_name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {user.role === 'admin' ? 'إدارة النظام' : DEPARTMENTS[user.department]} — لوحة متابعة الطلبات
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <div className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${s.tone}`}>{s.label}</div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">{s.value}</div>
          </div>
        ))}
      </section>

      {user.role !== 'admin' && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900">
              الطلبات الواردة لقسمك ({inboxCount})
            </h2>
            <Link href="/dashboard/requests" className="text-sm font-bold text-brand-700 hover:underline">
              عرض كل الطلبات
            </Link>
          </div>
          <RequestsTable rows={inbox} />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-extrabold text-slate-900">أحدث الطلبات</h2>
        <RequestsTable
          rows={latest}
          basePath={user.role === 'admin' ? '/admin/requests' : '/dashboard/requests'}
        />
      </section>
    </div>
  );
}
