import Link from 'next/link';
import { StatusBadge, formatDate } from './ui';
import { REQUEST_TYPE_SHORT } from '@/lib/constants';
import type { RequestRow } from '@/lib/types';

export function RequestsTable({
  rows,
  basePath = '/dashboard/requests',
}: {
  rows: RequestRow[];
  basePath?: string;
}) {
  return (
    <div className="table-wrap">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="th">رقم الطلب</th>
            <th className="th">نوع الطلب</th>
            <th className="th">مقدّم الطلب</th>
            <th className="th">الرقم المدني</th>
            <th className="th">الهاتف</th>
            <th className="th">الحالة</th>
            <th className="th">تاريخ التقديم</th>
            <th className="th"></th>
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
              <td className="td" dir="ltr">
                {r.phone}
              </td>
              <td className="td">
                <StatusBadge status={r.status} />
              </td>
              <td className="td text-slate-500">{formatDate(r.created_at)}</td>
              <td className="td">
                <Link href={`${basePath}/${r.id}`} className="font-bold text-brand-700 hover:underline">
                  عرض
                </Link>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                لا توجد طلبات لعرضها
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
