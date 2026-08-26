import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { DEPARTMENTS } from '@/lib/constants';
import { countUnread } from '@/lib/notifications';
import { logoutAction } from '@/app/(auth)/actions';
import { Logo } from '@/components/ui';
import { NavLink } from '@/components/nav-link';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unread = await countUnread(user.id);
  const isAdmin = user.role === 'admin';

  return (
    <div className="app-backdrop min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,.02)] backdrop-blur-lg">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo compact />
            <span className="hidden rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 lg:block">
              {isAdmin ? 'إدارة النظام' : DEPARTMENTS[user.department]}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/notifications"
              className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
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

            <div className="hidden border-r border-slate-200 pr-3 text-right sm:block">
              <div className="max-w-40 truncate text-sm font-bold text-slate-800">{user.full_name}</div>
              <div dir="ltr" className="text-xs text-slate-500">
                {user.employee_number}
              </div>
            </div>

            <form action={logoutAction}>
              <button className="btn-ghost !h-10 !px-3 !py-2 !text-sm" type="submit">
                <span className="hidden sm:inline">تسجيل الخروج</span>
                <span className="sm:hidden">خروج</span>
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-slate-100">
          <nav className="mx-auto flex max-w-[1440px] gap-1.5 overflow-x-auto px-4 py-2 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <NavLink href="/dashboard">الرئيسية</NavLink>
            <NavLink href="/dashboard/requests">الطلبات</NavLink>
            <NavLink href="/dashboard/notifications">
              الإشعارات{unread > 0 ? ` (${unread})` : ''}
            </NavLink>
            {isAdmin && (
              <>
                <span className="mx-1 my-1 hidden w-px shrink-0 bg-slate-200 sm:block" />
                <NavLink href="/admin">لوحة الإدارة</NavLink>
                <NavLink href="/admin/requests">إدارة الطلبات</NavLink>
                <NavLink href="/admin/reports">التقارير</NavLink>
                <NavLink href="/admin/employees">الموظفون</NavLink>
                <NavLink href="/admin/employees/requests">طلبات الحسابات</NavLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <div className="page-enter">{children}</div>
      </main>
    </div>
  );
}
