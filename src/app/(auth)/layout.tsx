import Link from 'next/link';
import { Logo } from '@/components/ui';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-brand-700">
            العودة للموقع
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-500">
        دائرة البلدية بالسويق — بوابة استثمار المواقع الحكومية
      </footer>
    </div>
  );
}
