import Link from 'next/link';
import { STATUS_COLORS, STATUS_LABELS, type RequestStatus } from '@/lib/constants';

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`badge ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</span>;
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-extrabold text-slate-900">دائرة البلدية بالسويق</span>
        {!compact && (
          <span className="block text-xs text-slate-500">بوابة استثمار المواقع الحكومية</span>
        )}
      </span>
    </Link>
  );
}

export function Alert({
  kind = 'info',
  children,
}: {
  kind?: 'info' | 'error' | 'success' | 'warn';
  children: React.ReactNode;
}) {
  const styles = {
    info: 'bg-sky-50 text-sky-900 border-sky-200',
    error: 'bg-rose-50 text-rose-900 border-rose-200',
    success: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    warn: 'bg-amber-50 text-amber-900 border-amber-200',
  }[kind];
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm font-medium leading-7 ${styles}`}>{children}</div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <div className="text-slate-800">{title}</div>
      {hint && <div className="mt-1 text-sm text-slate-500">{hint}</div>}
    </div>
  );
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  const date = d.toLocaleDateString('ar-OM-u-nu-latn', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const time = d.toLocaleTimeString('ar-OM-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
  return `${date} — ${time}`;
}
