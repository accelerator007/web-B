import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/supabase';
import { DEPARTMENTS } from '@/lib/constants';
import { logoutAction } from '@/app/(auth)/actions';
import { Logo } from '@/components/ui';
import { NavLink } from '@/components/nav-link';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const { count } = await db()
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('employee_id', user.id)
    .eq('is_read', false);

  const unread = count ?? 0;
  const isAdmin = user.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Logo compact />
            <span className="hidden rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 md:block">
              {isAdmin ? 'إدارة النظام' : DEPARTMENTS[user.department]}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/notifications"
              className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="الإشعارات"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {unread > 0 && (
                <span className="absolute -left-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white">
                  {unread}
                </span>
              )}
            </Link>

            <div className="hidden text-left sm:block">
              <div className="text-sm font-bold text-slate-800">{user.full_name}</div>
              <div dir="ltr" className="text-xs text-slate-500">
                {user.employee_number}
              </div>
            </div>

            <form action={logoutAction}>
              <button className="btn-ghost !px-3 !py-2 !text-sm" type="submit">
                خروج
              </button>
            </form>
          </div>
        </div>

        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 pb-2 text-sm font-semibold">
          <NavLink href="/dashboard">الرئيسية</NavLink>
          <NavLink href="/dashboard/requests">الطلبات</NavLink>
          <NavLink href="/dashboard/notifications">
            الإشعارات{unread > 0 ? ` (${unread})` : ''}
          </NavLink>
          {isAdmin && (
            <>
              <span className="mx-2 my-1 w-px bg-slate-200" />
              <NavLink href="/admin">لوحة الأدمن</NavLink>
              <NavLink href="/admin/requests">إدارة الطلبات</NavLink>
              <NavLink href="/admin/reports">التقارير والتصدير</NavLink>
              <NavLink href="/admin/employees">الموظفون</NavLink>
              <NavLink href="/admin/employees/requests">طلبات الحسابات</NavLink>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
