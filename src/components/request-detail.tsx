import Link from 'next/link';
import { StatusBadge, formatDate } from './ui';
import {
  ATTACHMENT_LABELS,
  DEPARTMENTS,
  REQUEST_TYPES,
  type Department,
} from '@/lib/constants';
import type { AttachmentRow, RequestRow, ReviewRow } from '@/lib/types';

export function RequestHeader({ r }: { r: RequestRow }) {
  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div dir="ltr" className="text-2xl font-extrabold text-brand-700">
            {r.request_number}
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-700">{REQUEST_TYPES[r.type]}</div>
          <div className="mt-1 text-xs text-slate-400">قُدّم في {formatDate(r.created_at)}</div>
        </div>
        <StatusBadge status={r.status} />
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="اسم مقدّم الطلب" value={r.full_name} />
        <Field label="الرقم المدني" value={r.civil_number} ltr />
        <Field label="رقم الهاتف" value={r.phone} ltr />
        <Field
          label="حالة الدفع"
          value={
            r.payment_status === 'paid'
              ? `تم الدفع${r.payment_amount ? ` — ${r.payment_amount} ر.ع` : ''}`
              : r.payment_status === 'exempt'
              ? 'معفى من الرسوم'
              : 'لم يتم الدفع'
          }
        />
      </dl>

      {r.site_location_url && (
        <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4">
          <div className="text-xs font-bold text-sky-700">موقع المكان</div>
          <a
            href={r.site_location_url}
            target="_blank"
            rel="noreferrer"
            dir="ltr"
            className="mt-1 inline-flex break-all text-sm font-semibold text-sky-800 underline decoration-sky-300 underline-offset-4 hover:text-sky-950"
          >
            فتح الموقع على الخريطة
          </a>
        </div>
      )}

      {r.citizen_notes && (
        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <div className="text-xs font-bold text-slate-500">ملاحظات مقدّم الطلب</div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-700">{r.citizen_notes}</p>
        </div>
      )}

      {r.status === 'rejected' && (
        <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-extrabold text-rose-900">
            الطلب مرفوض من: {r.rejected_by_department ? DEPARTMENTS[r.rejected_by_department] : '—'}
          </div>
          <div className="mt-1 text-sm text-rose-800">
            صاحب القرار: {r.rejected_by_name ?? '—'}
            {r.rejected_by_number ? ` — الرقم الوظيفي ${r.rejected_by_number}` : ''}
          </div>
          <div className="text-xs text-rose-600">{formatDate(r.rejected_at)}</div>
          {r.rejection_notes && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-rose-900">{r.rejection_notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-bold text-slate-500">{label}</dt>
      <dd dir={ltr ? 'ltr' : undefined} className={`mt-1 text-sm font-semibold text-slate-800 ${ltr ? 'text-right' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

export function AttachmentsCard({ attachments }: { attachments: AttachmentRow[] }) {
  return (
    <div className="card p-6">
      <h2 className="text-lg font-extrabold text-slate-900">المرفقات</h2>
      <ul className="mt-4 space-y-3">
        {attachments.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-600">
                {a.mime_type === 'application/pdf' ? (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <div>
                <div className="text-sm font-bold text-slate-800">
                  {ATTACHMENT_LABELS[a.field_key] ?? a.field_key}
                </div>
                <div dir="ltr" className="text-xs text-slate-500">
                  {a.file_name}
                  {a.size_bytes ? ` — ${(a.size_bytes / 1024 / 1024).toFixed(2)} م.ب` : ''}
                </div>
              </div>
            </div>

            <Link href={`/api/files/${a.id}`} target="_blank" className="btn-ghost !py-2 !text-sm">
              فتح المرفق
            </Link>
          </li>
        ))}
        {attachments.length === 0 && <li className="text-sm text-slate-500">لا توجد مرفقات.</li>}
      </ul>
    </div>
  );
}

export function DecisionsCard({ r }: { r: RequestRow }) {
  const stages: {
    dep: Department;
    decision: 'approved' | 'rejected' | null;
    label?: string;
    notes: string | null;
    by: string | null;
    number: string | null;
    at: string | null;
  }[] = [
    {
      dep: 'technical',
      decision: r.technical_decision,
      notes: r.technical_notes,
      by: r.technical_by_name,
      number: r.technical_by_number,
      at: r.technical_at,
    },
    {
      dep: 'health',
      decision: r.health_decision,
      notes: r.health_notes,
      by: r.health_by_name,
      number: r.health_by_number,
      at: r.health_at,
    },
    {
      dep: 'finance',
      decision:
        r.payment_status === 'paid' || r.payment_status === 'exempt'
          ? 'approved'
          : r.rejected_by_department === 'finance'
          ? 'rejected'
          : null,
      label:
        r.payment_status === 'paid'
          ? 'تم الدفع'
          : r.payment_status === 'exempt'
          ? 'معفى من الرسوم'
          : r.rejected_by_department === 'finance'
          ? 'مرفوض'
          : 'بانتظار الدفع',
      notes: r.finance_notes,
      by: r.finance_by_name,
      number: r.finance_by_number,
      at: r.finance_at,
    },
    {
      dep: 'investment',
      decision:
        r.status === 'approved' ? 'approved' : r.rejected_by_department === 'investment' ? 'rejected' : null,
      notes: r.investment_notes,
      by: r.investment_by_name,
      number: r.investment_by_number,
      at: r.investment_at,
    },
  ];

  return (
    <div className="card p-6">
      <h2 className="text-lg font-extrabold text-slate-900">قرارات الجهات</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {stages.map((s) => {
          const tone =
            s.decision === 'approved'
              ? 'border-emerald-200 bg-emerald-50'
              : s.decision === 'rejected'
              ? 'border-rose-200 bg-rose-50'
              : 'border-slate-200 bg-slate-50';
          const label =
            s.label ??
            (s.decision === 'approved' ? 'موافقة' : s.decision === 'rejected' ? 'رفض' : 'قيد الانتظار');

          return (
            <div key={s.dep} className={`rounded-xl border p-4 ${tone}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-extrabold text-slate-800">{DEPARTMENTS[s.dep]}</div>
                <span className="text-xs font-bold text-slate-700">{label}</span>
              </div>
              {s.by && (
                <div className="mt-1 text-xs text-slate-600">
                  {s.by}
                  {s.number ? ` — ${s.number}` : ''}
                </div>
              )}
              {s.at && <div className="text-xs text-slate-400">{formatDate(s.at)}</div>}
              {s.notes && (
                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-7 text-slate-700">{s.notes}</p>
              )}
            </div>
          );
        })}
      </div>

      {r.payment_reference && (
        <div className="mt-4 text-xs text-slate-500">
          مرجع الدفع: <span dir="ltr">{r.payment_reference}</span>
        </div>
      )}
    </div>
  );
}

const ACTION_LABELS: Record<string, string> = {
  submitted: 'تقديم الطلب',
  approved: 'موافقة',
  rejected: 'رفض',
  paid: 'تأكيد الدفع',
  exempt: 'إعفاء من الرسوم',
  unpaid: 'تحديث حالة الدفع',
  deleted: 'حذف الطلب',
};

export function TimelineCard({ reviews }: { reviews: ReviewRow[] }) {
  return (
    <div className="card p-6">
      <h2 className="text-lg font-extrabold text-slate-900">سجل الإجراءات</h2>
      <ol className="mt-5 space-y-5 border-r-2 border-slate-100 pr-5">
        {reviews.map((v) => (
          <li key={v.id} className="relative">
            <span
              className={`absolute -right-[27px] top-1.5 h-3.5 w-3.5 rounded-full ring-4 ring-white ${
                v.action === 'rejected' ? 'bg-rose-500' : v.action === 'submitted' ? 'bg-slate-400' : 'bg-emerald-500'
              }`}
            />
            <div className="text-sm font-bold text-slate-800">
              {ACTION_LABELS[v.action] ?? v.action} —{' '}
              {v.department === 'citizen' ? 'مقدّم الطلب' : DEPARTMENTS[v.department as Department]}
            </div>
            <div className="text-xs text-slate-500">
              {v.employee_name ?? '—'}
              {v.employee_number ? ` (${v.employee_number})` : ''} — {formatDate(v.created_at)}
            </div>
            {v.notes && (
              <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-[13px] leading-7 text-slate-700">
                {v.notes}
              </p>
            )}
          </li>
        ))}
        {reviews.length === 0 && <li className="text-sm text-slate-500">لا توجد إجراءات بعد.</li>}
      </ol>
    </div>
  );
}
