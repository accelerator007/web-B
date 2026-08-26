'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== '/dashboard' && href !== '/admin' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-10 items-center whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-bold transition-colors duration-150 ${
        active
          ? 'bg-brand-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {children}
    </Link>
  );
}
