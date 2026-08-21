import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { searchRequests, type SearchParams } from '@/lib/queries';
import { RequestsFilter } from '@/components/requests-filter';
import { StatusBadge, formatDate } from '@/components/ui';
import { DangerDialog } from '@/components/admin/danger-dialog';
import { REQUEST_TYPE_SHORT } from '@/lib/constants';
import { deleteRequestAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function AdminRequestsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const query = await searchParams;
  const rows = await searchRequests(query, { limit: 300 });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-slate-900">إدارة الطلبات</h1>
        <p className="mt-1 text-sm text-slate-600">
          بحث بالرقم المدني أو رقم الطلب، مع صلاحية الاطلاع والقرار والحذف.
        </p>
      </header>

      <RequestsFilter action="/admin/requests" defaults={query} showInbox={false} />

      <div className="text-sm font-semibold text-slate-600">النتائج: {rows.length}</div>

      <div className="table-wrap">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">رقم الطلب</th>
              <th className="th">النوع</th>
              <th className="th">مقدّم الطلب</th>
              <th className="th">الرقم المدني</th>
              <th className="th">الحالة</th>
              <th className="th">الدفع</th>
              <th className="th">التاريخ</th>
              <th className="th">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="td font-bold text-brand-700" dir="ltr">
                  {r.request_number}
                </td>
                <td className="td">{REQUEST_TYPE_SHORT[r.type]}</td>
                <td className="td">{r.full_name}</td>
                <td className="td" dir="ltr">
                  {r.civil_number}
                </td>
                <td className="td">
                  <StatusBadge status={r.status} />
                </td>
                <td className="td">
                  {r.payment_status === 'paid'
                    ? 'تم الدفع'
                    : r.payment_status === 'exempt'
                    ? 'معفى'
                    : 'لم يتم'}
                </td>
                <td className="td text-slate-500">{formatDate(r.created_at)}</td>
                <td className="td">
                  <div className="flex items-center gap-4">
                    <Link href={`/admin/requests/${r.id}`} className="font-bold text-brand-700 hover:underline">
                      عرض
                    </Link>
                    <DangerDialog
                      action={deleteRequestAction}
                      triggerLabel="حذف"
                      title={`حذف الطلب ${r.request_number}`}
                      description="سيتم حذف الطلب وجميع مرفقاته نهائياً ولا يمكن التراجع."
                      confirmLabel="حذف نهائي"
                      hidden={{ request_id: r.id }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                  لا توجد طلبات مطابقة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
