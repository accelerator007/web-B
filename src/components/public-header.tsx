import Link from 'next/link';
import { Logo } from './ui';

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Logo />
        <nav className="flex items-center gap-1 text-sm font-semibold text-slate-600 sm:gap-2">
          <Link href="/" className="rounded-lg px-3 py-2 hover:bg-slate-100">
            الرئيسية
          </Link>
          <Link href="/track" className="rounded-lg px-3 py-2 hover:bg-slate-100">
            تتبّع طلب
          </Link>
          <Link href="/login" className="btn-primary !px-4 !py-2 !text-sm">
            دخول الموظفين
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} دائرة البلدية بالسويق — جميع الحقوق محفوظة</span>
          <span>بوابة استثمار المواقع الحكومية</span>
        </div>
      </div>
    </footer>
  );
}
