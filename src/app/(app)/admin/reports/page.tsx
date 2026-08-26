import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/supabase';
import { REQUEST_TYPE_SHORT, STATUS_LABELS } from '@/lib/constants';
import type { RequestRow } from '@/lib/types';

const LIMITS: Record<string, number> = {
  pending_departments: 3,
  pending_finance: 2,
  pending_investment: 3,
  pending_payment: 3,
};

export default async function ReportsPage() {
  await requireAdmin();
  const { data } = await db()
    .from('requests')
    .select('id,request_number,type,status,created_at,updated_at')
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as RequestRow[];
  const finished = rows.filter((row) => row.status === 'approved' || row.status === 'rejected');
  const average = finished.length
    ? finished.reduce(
        (sum, row) => sum + (Date.parse(row.updated_at) - Date.parse(row.created_at)) / 86_400_000,
        0
      ) / finished.length
    : 0;

  // A single captured value keeps all delay calculations consistent for this server render.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const daysSinceUpdate = (row: RequestRow) => Math.floor((now - Date.parse(row.updated_at)) / 86_400_000);
  const overdue = rows.filter((row) => LIMITS[row.status] && daysSinceUpdate(row) > LIMITS[row.status]);
  const metrics = [
    ['إجمالي الطلبات', rows.length],
    ['المعتمدة', rows.filter((row) => row.status === 'approved').length],
    ['المرفوضة', rows.filter((row) => row.status === 'rejected').length],
    ['متوسط الإنجاز بالأيام', average.toFixed(1)],
  ];

  return (
    <div className="space-y-7 sm:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
            التحليلات
          </div>
          <h1 className="page-title">التقارير والتصدير</h1>
          <p className="page-subtitle">مؤشرات الأداء والطلبات المتأخرة وسجل الوصول للمرفقات.</p>
        </div>
        <a href="/api/admin/reports/export" className="btn-primary">تصدير CSV</a>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div className="card p-5" key={label}>
            <div className="text-xs font-bold text-slate-500">{label}</div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900">{value}</div>
          </div>
        ))}
      </section>

      <section className="card p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">تنبيهات التأخير</h2>
          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
            {overdue.length} متأخر
          </span>
        </div>
        <div className="table-wrap mt-4">
          <table className="responsive-table min-w-full">
            <thead>
              <tr>
                <th className="th">الطلب</th>
                <th className="th">النوع</th>
                <th className="th">المرحلة</th>
                <th className="th">أيام دون تحديث</th>
              </tr>
            </thead>
            <tbody>
              {overdue.map((row) => (
                <tr key={row.id}>
                  <td className="td" dir="ltr" data-label="الطلب">
                    <Link className="font-bold text-brand-700" href={`/admin/requests/${row.id}`}>
                      {row.request_number}
                    </Link>
                  </td>
                  <td className="td" data-label="النوع">{REQUEST_TYPE_SHORT[row.type]}</td>
                  <td className="td" data-label="المرحلة">{STATUS_LABELS[row.status]}</td>
                  <td className="td" data-label="أيام دون تحديث">{daysSinceUpdate(row)}</td>
                </tr>
              ))}
              {!overdue.length && (
                <tr className="empty-row">
                  <td className="td text-slate-500" colSpan={4}>لا توجد طلبات متأخرة حالياً.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
