import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/supabase';
import { REQUEST_TYPE_SHORT, STATUS_LABELS } from '@/lib/constants';
import type { RequestRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
const LIMITS: Record<string, number> = { pending_departments: 3, pending_finance: 2, pending_investment: 3 };

export default async function ReportsPage() {
  await requireAdmin();
  const { data } = await db().from('requests').select('*').order('created_at', { ascending: false });
  const rows = (data ?? []) as RequestRow[];
  const finished = rows.filter((r) => r.status === 'approved' || r.status === 'rejected');
  const average = finished.length ? finished.reduce((sum, r) => sum + (Date.parse(r.updated_at) - Date.parse(r.created_at)) / 86400000, 0) / finished.length : 0;
  const overdue = rows.filter((r) => LIMITS[r.status] && Date.now() - Date.parse(r.updated_at) > LIMITS[r.status] * 86400000);

  return <div className="space-y-7">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold text-slate-900">التقارير والتصدير</h1><p className="mt-1 text-sm text-slate-600">مؤشرات الأداء والطلبات المتأخرة وسجل الوصول للمرفقات.</p></div>
      <a href="/api/admin/reports/export" className="btn-primary">تصدير CSV</a>
    </header>
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[['إجمالي الطلبات', rows.length], ['المعتمدة', rows.filter(r=>r.status==='approved').length], ['المرفوضة', rows.filter(r=>r.status==='rejected').length], ['متوسط الإنجاز بالأيام', average.toFixed(1)]].map(([label,value]) => <div className="card p-5" key={label}><div className="text-xs font-bold text-slate-500">{label}</div><div className="mt-2 text-3xl font-extrabold text-slate-900">{value}</div></div>)}
    </section>
    <section className="card p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">تنبيهات التأخير</h2><span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">{overdue.length} متأخر</span></div>
      <div className="mt-4 table-wrap"><table className="min-w-full"><thead><tr><th className="th">الطلب</th><th className="th">النوع</th><th className="th">المرحلة</th><th className="th">أيام دون تحديث</th></tr></thead><tbody>{overdue.map(r=><tr key={r.id}><td className="td" dir="ltr"><a className="font-bold text-brand-700" href={`/admin/requests/${r.id}`}>{r.request_number}</a></td><td className="td">{REQUEST_TYPE_SHORT[r.type]}</td><td className="td">{STATUS_LABELS[r.status]}</td><td className="td">{Math.floor((Date.now()-Date.parse(r.updated_at))/86400000)}</td></tr>)}{!overdue.length&&<tr><td className="td text-slate-500" colSpan={4}>لا توجد طلبات متأخرة حالياً.</td></tr>}</tbody></table></div>
    </section>
  </div>;
}
