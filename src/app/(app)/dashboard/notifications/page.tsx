import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { listNotifications } from '@/lib/notifications';
import { formatDate } from '@/components/ui';
import { SubmitButton } from '@/components/submit-button';
import { markAllReadAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await listNotifications(user.id);
  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">الإشعارات</h1>
          <p className="mt-1 text-sm text-slate-600">
            {unread > 0 ? `لديك ${unread} إشعاراً غير مقروء` : 'لا توجد إشعارات جديدة'}
          </p>
        </div>

        {unread > 0 && (
          <form action={markAllReadAction}>
            <SubmitButton className="btn-ghost !py-2 !text-sm">تعليم الكل كمقروء</SubmitButton>
          </form>
        )}
      </header>

      <ul className="space-y-3">
        {items.map((n) => (
          <li
            key={n.id}
            className={`card p-5 ${n.is_read ? '' : 'border-r-4 border-r-brand-500 bg-brand-50/40'}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-slate-900">{n.title}</div>
                {n.body && <p className="mt-1 text-sm leading-7 text-slate-600">{n.body}</p>}
                <div className="mt-1 text-xs text-slate-400">{formatDate(n.created_at)}</div>
              </div>

              {n.request_id && (
                <Link
                  href={`/dashboard/requests/${n.request_id}`}
                  className="btn-ghost !py-2 !text-sm shrink-0"
                >
                  فتح الطلب
                </Link>
              )}
            </div>
          </li>
        ))}

        {items.length === 0 && (
          <li className="grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-sm text-slate-500">
            لا توجد إشعارات
          </li>
        )}
      </ul>
    </div>
  );
}
