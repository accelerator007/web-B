import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/supabase';
import { fetchInbox } from '@/lib/workflow';
import { DEPARTMENTS } from '@/lib/constants';
import { RequestsTable } from '@/components/requests-table';
import type { RequestRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireUser();
  const supa = db();

  const inbox = user.role === 'admin' ? [] : await fetchInbox(user.department);

  const counts = await Promise.all(
    (['pending_departments', 'pending_finance', 'pending_investment', 'approved', 'rejected'] as const).map(
      async (status) => {
        const { count } = await supa
          .from('requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', status);
        return count ?? 0;
      }
    )
  );

  const { data: latest } = await supa
    .from('requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(8);

  const stats = [
    { label: 'قيد دراسة الأقسام', value: counts[0], tone: 'text-amber-700 bg-amber-50' },
    { label: 'لدى الشؤون المالية', value: counts[1], tone: 'text-sky-700 bg-sky-50' },
    { label: 'لدى دائرة الاستثمار', value: counts[2], tone: 'text-indigo-700 bg-indigo-50' },
    { label: 'معتمدة', value: counts[3], tone: 'text-emerald-700 bg-emerald-50' },
    { label: 'مرفوضة', value: counts[4], tone: 'text-rose-700 bg-rose-50' },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-extrabold text-slate-900">مرحباً {user.full_name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {user.role === 'admin' ? 'إدارة النظام' : DEPARTMENTS[user.department]} — لوحة متابعة الطلبات
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
              الطلبات الواردة لقسمك ({inbox.length})
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
          rows={(latest ?? []) as RequestRow[]}
          basePath={user.role === 'admin' ? '/admin/requests' : '/dashboard/requests'}
        />
      </section>
    </div>
  );
}
