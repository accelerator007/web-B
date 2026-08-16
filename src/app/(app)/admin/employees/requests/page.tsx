import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/supabase';
import { AccountRequestCard } from '@/components/admin/account-request-card';
import { EmptyState, formatDate } from '@/components/ui';
import type { EmployeeRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AccountRequestsPage() {
  await requireAdmin();

  const { data } = await db()
    .from('employees')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  const requests = (data ?? []) as EmployeeRow[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-slate-900">طلبات إنشاء الحسابات</h1>
        <p className="mt-1 text-sm text-slate-600">
          مراجعة تفاصيل كل طلب واعتماده أو رفضه مع بيان السبب — يصل القرار للموظف بالبريد الإلكتروني.
        </p>
      </header>

      {requests.length === 0 ? (
        <EmptyState title="لا توجد طلبات حسابات معلّقة" />
      ) : (
        <ul className="space-y-4">
          {requests.map((e) => (
            <AccountRequestCard key={e.id} employee={e} createdAt={formatDate(e.created_at)} />
          ))}
        </ul>
      )}
    </div>
  );
}
