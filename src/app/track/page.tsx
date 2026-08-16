import Link from 'next/link';
import { PublicFooter, PublicHeader } from '@/components/public-header';
import { Alert, EmptyState, StatusBadge, formatDate } from '@/components/ui';
import { db } from '@/lib/supabase';
import { DEPARTMENTS, REQUEST_TYPES } from '@/lib/constants';
import { validateCivilNumber } from '@/lib/validation';
import type { RequestRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function TrackPage({ searchParams }: { searchParams: { civil?: string } }) {
  const civil = (searchParams.civil ?? '').trim();
  let error: string | null = null;
  let rows: RequestRow[] = [];

  if (civil) {
    error = validateCivilNumber(civil);
    if (!error) {
      const { data } = await db()
        .from('requests')
        .select('*')
        .eq('civil_number', civil)
        .order('created_at', { ascending: false });
      rows = (data ?? []) as RequestRow[];
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-extrabold text-slate-900">تتبّع الطلبات</h1>
        <p className="mt-2 text-sm text-slate-600">
          أدخل الرقم المدني لعرض جميع طلباتك وحالتها الحالية.
        </p>

        <form className="card mt-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-end" method="get">
          <div className="flex-1">
            <label className="label" htmlFor="civil">
              الرقم المدني
            </label>
            <input
              id="civil"
              name="civil"
              defaultValue={civil}
              dir="ltr"
              inputMode="numeric"
              className="input"
              placeholder="12345678"
              required
            />
          </div>
          <button type="submit" className="btn-primary sm:w-40">
            بحث
          </button>
        </form>

        <div className="mt-8 space-y-5">
          {error && <Alert kind="error">{error}</Alert>}

          {civil && !error && rows.length === 0 && (
            <EmptyState title="لا توجد طلبات مرتبطة بهذا الرقم المدني" hint="تأكد من صحة الرقم المدني المُدخل." />
          )}

          {rows.map((r) => (
            <CitizenRequestCard key={r.id} r={r} />
          ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

function CitizenRequestCard({ r }: { r: RequestRow }) {
  return (
    <article className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div dir="ltr" className="text-lg font-extrabold text-brand-700">
            {r.request_number}
          </div>
          <div className="mt-1 text-sm text-slate-600">{REQUEST_TYPES[r.type]}</div>
          <div className="mt-1 text-xs text-slate-400">قُدّم في {formatDate(r.created_at)}</div>
        </div>
        <StatusBadge status={r.status} />
      </div>

      {r.status === 'rejected' && (
        <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-bold text-rose-900">
            تم رفض الطلب من: {r.rejected_by_department ? DEPARTMENTS[r.rejected_by_department] : '—'}
          </div>
          <div className="mt-1 text-sm text-rose-800">
            صاحب القرار: {r.rejected_by_name ?? '—'}
            {r.rejected_by_number ? ` (الرقم الوظيفي: ${r.rejected_by_number})` : ''}
          </div>
          {r.rejection_notes && (
            <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-rose-900">
              <span className="font-bold">الملاحظات: </span>
              {r.rejection_notes}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <StageRow
          title={DEPARTMENTS.technical}
          decision={r.technical_decision}
          notes={r.technical_notes}
          by={r.technical_by_name}
          at={r.technical_at}
        />
        <StageRow
          title={DEPARTMENTS.health}
          decision={r.health_decision}
          notes={r.health_notes}
          by={r.health_by_name}
          at={r.health_at}
        />
        <StageRow
          title={DEPARTMENTS.finance}
          decision={
            r.payment_status === 'paid' || r.payment_status === 'exempt'
              ? 'approved'
              : r.rejected_by_department === 'finance'
              ? 'rejected'
              : null
          }
          decisionLabel={
            r.payment_status === 'paid'
              ? 'تم الدفع'
              : r.payment_status === 'exempt'
              ? 'معفى من الرسوم'
              : undefined
          }
          notes={r.finance_notes}
          by={r.finance_by_name}
          at={r.finance_at}
        />
        <StageRow
          title={DEPARTMENTS.investment}
          decision={r.status === 'approved' ? 'approved' : r.rejected_by_department === 'investment' ? 'rejected' : null}
          notes={r.investment_notes}
          by={r.investment_by_name}
          at={r.investment_at}
        />
      </div>

      <div className="mt-5 text-xs text-slate-400">
        لأي استفسار يُرجى مراجعة الدائرة مع ذكر رقم الطلب.{' '}
        <Link href="/" className="font-semibold text-brand-700">
          تقديم طلب جديد
        </Link>
      </div>
    </article>
  );
}

function StageRow({
  title,
  decision,
  decisionLabel,
  notes,
  by,
  at,
}: {
  title: string;
  decision: 'approved' | 'rejected' | null;
  decisionLabel?: string;
  notes: string | null;
  by: string | null;
  at: string | null;
}) {
  const tone =
    decision === 'approved'
      ? 'border-emerald-200 bg-emerald-50'
      : decision === 'rejected'
      ? 'border-rose-200 bg-rose-50'
      : 'border-slate-200 bg-slate-50';

  const label =
    decisionLabel ??
    (decision === 'approved' ? 'موافقة' : decision === 'rejected' ? 'رفض' : 'قيد الانتظار');

  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-bold text-slate-800">{title}</div>
        <span className="text-xs font-bold text-slate-600">{label}</span>
      </div>
      {by && <div className="mt-1 text-xs text-slate-500">بواسطة: {by}</div>}
      {at && <div className="text-xs text-slate-400">{formatDate(at)}</div>}
      {notes && <div className="mt-2 whitespace-pre-wrap text-[13px] leading-7 text-slate-700">{notes}</div>}
    </div>
  );
}
