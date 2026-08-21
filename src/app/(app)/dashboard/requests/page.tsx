import { requireUser } from '@/lib/auth';
import { searchRequests, type SearchParams } from '@/lib/queries';
import { RequestsFilter } from '@/components/requests-filter';
import { RequestsTable } from '@/components/requests-table';

export const dynamic = 'force-dynamic';

export default async function RequestsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const query = await searchParams;
  const rows = await searchRequests(query, { department: user.department });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-slate-900">الطلبات</h1>
        <p className="mt-1 text-sm text-slate-600">
          يمكن البحث عن أي طلب باستخدام الرقم المدني لمقدّم الطلب.
        </p>
      </header>

      <RequestsFilter
        action="/dashboard/requests"
        defaults={query}
        showInbox={user.role !== 'admin'}
      />

      <div className="text-sm font-semibold text-slate-600">النتائج: {rows.length}</div>
      <RequestsTable rows={rows} />
    </div>
  );
}
