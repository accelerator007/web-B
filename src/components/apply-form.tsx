'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { Alert } from './ui';
import { browserStorage } from '@/lib/supabase-browser';
import { ATTACHMENTS, MAX_FILE_BYTES, ALLOWED_MIME, type RequestType } from '@/lib/constants';
import type { ActionState } from '@/lib/types';

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;
type TicketAction = (input: {
  type: RequestType;
  fieldKey: string;
  fileName: string;
  mimeType: string;
  size: number;
}) => Promise<{ path?: string; token?: string; error?: string }>;

export function ApplyForm({
  type,
  action,
  ticketAction,
}: {
  type: RequestType;
  action: Action;
  ticketAction: TicketAction;
}) {
  const [state, formAction] = useFormState(action, null);
  const fields = ATTACHMENTS[type];

  // المرفقات المكتملة: مفتاح الحقل ⇒ مسار الملف في التخزين
  const [uploaded, setUploaded] = useState<Record<string, { path: string; name: string }>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [location, setLocation] = useState<{ url: string; lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const missing = fields.filter((f) => !uploaded[f.key]);
  const busy = Object.values(uploading).some(Boolean);

  return (
    <form action={formAction} className="space-y-8">
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {state?.error && <Alert kind="error">{state.error}</Alert>}

      {/* بيانات مقدّم الطلب */}
      <section className="card p-6">
        <h2 className="text-[17px] font-bold text-slate-900">بيانات مقدّم الطلب</h2>
        <p className="mt-1 text-sm text-slate-500">جميع الحقول التالية إلزامية.</p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="civil_number">
              الرقم المدني <span className="text-rose-600">*</span>
            </label>
            <input
              id="civil_number"
              name="civil_number"
              className="input"
              dir="ltr"
              inputMode="numeric"
              placeholder="12345678"
              maxLength={15}
              required
            />
            <p className="mt-1.5 text-xs text-slate-500">يُكتب بالأرقام الإنجليزية فقط.</p>
          </div>

          <div>
            <label className="label" htmlFor="phone">
              رقم الهاتف <span className="text-rose-600">*</span>
            </label>
            <input
              id="phone"
              name="phone"
              className="input"
              dir="ltr"
              inputMode="tel"
              placeholder="91234567"
              required
            />
            <p className="mt-1.5 text-xs text-slate-500">رقم عُماني مكوّن من ٨ أرقام.</p>
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="full_name">
              الاسم الثلاثي بالعربي <span className="text-rose-600">*</span>
            </label>
            <input
              id="full_name"
              name="full_name"
              className="input"
              placeholder="مثال: محمد سالم الهنائي"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="site_location_url">
              رابط موقع المكان <span className="text-rose-600">*</span>
            </label>
            <input
              id="site_location_url"
              name="site_location_url"
              type="url"
              className="input"
              dir="ltr"
              placeholder="https://maps.google.com/..."
              required
              value={location?.url ?? undefined}
              onChange={(e) => setLocation((old) => old ? { ...old, url: e.target.value } : null)}
            />
            <input type="hidden" name="site_latitude" value={location?.lat ?? ''} />
            <input type="hidden" name="site_longitude" value={location?.lng ?? ''} />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn-ghost !py-2 !text-sm"
                disabled={locating}
                onClick={() => {
                  setLocationError('');
                  if (!navigator.geolocation) return setLocationError('المتصفح لا يدعم تحديد الموقع');
                  setLocating(true);
                  navigator.geolocation.getCurrentPosition(
                    ({ coords }) => {
                      const lat = Number(coords.latitude.toFixed(6));
                      const lng = Number(coords.longitude.toFixed(6));
                      setLocation({ lat, lng, url: `https://www.google.com/maps?q=${lat},${lng}` });
                      setLocating(false);
                    },
                    () => { setLocationError('تعذّر تحديد الموقع. اسمح للموقع بالوصول أو الصق رابط الخريطة.'); setLocating(false); },
                    { enableHighAccuracy: true, timeout: 15000 }
                  );
                }}
              >
                {locating ? 'جارٍ تحديد الموقع…' : 'تحديد موقعي الحالي بدقة'}
              </button>
              <span className="text-xs text-slate-500">أو الصق رابط الموقع من تطبيق الخرائط.</span>
            </div>
            {locationError && <p className="mt-1.5 text-xs font-semibold text-rose-600">{locationError}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="citizen_notes">
              ملاحظات إضافية (اختياري)
            </label>
            <textarea id="citizen_notes" name="citizen_notes" rows={3} className="input resize-none" />
          </div>
        </div>
      </section>

      {/* المرفقات */}
      <section className="card p-6">
        <h2 className="text-[17px] font-bold text-slate-900">المرفقات المطلوبة</h2>
        <p className="mt-1 text-sm text-slate-500">
          الصيغ المقبولة: PDF أو صورة (JPG / PNG / WEBP) — بحد أقصى ١٠ ميجابايت للملف الواحد.
          يبدأ رفع الملف فور اختياره.
        </p>

        <div className="mt-6 space-y-4">
          {fields.map((f) => (
            <FileField
              key={f.key}
              type={type}
              fieldKey={f.key}
              label={f.label}
              hint={f.hint}
              ticketAction={ticketAction}
              onStart={() => setUploading((u) => ({ ...u, [f.key]: true }))}
              onDone={(info) => {
                setUploading((u) => ({ ...u, [f.key]: false }));
                setUploaded((s) => {
                  const next = { ...s };
                  if (info) next[f.key] = info;
                  else delete next[f.key];
                  return next;
                });
              }}
            />
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitApply disabled={busy || missing.length > 0} />
        {missing.length > 0 && (
          <span className="text-xs font-semibold text-amber-700">
            بانتظار رفع: {missing.map((f) => f.label).join('، ')}
          </span>
        )}
        {missing.length === 0 && !busy && (
          <span className="text-xs text-slate-500">
            بعد التقديم سيصلك رقم طلب يمكنك تتبّعه عبر الرقم المدني.
          </span>
        )}
      </div>
    </form>
  );
}

function SubmitApply({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="btn-primary">
      {pending ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          جارٍ حفظ الطلب…
        </>
      ) : (
        'تقديم الطلب'
      )}
    </button>
  );
}

function FileField({
  type,
  fieldKey,
  label,
  hint,
  ticketAction,
  onStart,
  onDone,
}: {
  type: RequestType;
  fieldKey: string;
  label: string;
  hint: string;
  ticketAction: TicketAction;
  onStart: () => void;
  onDone: (info: { path: string; name: string } | null) => void;
}) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [file, setFile] = useState<{ name: string; size: string; path: string; mime: string; bytes: number } | null>(
    null
  );

  async function handleFile(picked: File | undefined, reset: () => void) {
    if (!picked) return;

    if (picked.size > MAX_FILE_BYTES) {
      setStatus('error');
      setMessage('حجم الملف يتجاوز ١٠ ميجابايت');
      setFile(null);
      onDone(null);
      reset();
      return;
    }
    if (!ALLOWED_MIME.includes(picked.type)) {
      setStatus('error');
      setMessage('صيغة غير مدعومة — يُقبل PDF أو صورة (JPG / PNG / WEBP)');
      setFile(null);
      onDone(null);
      reset();
      return;
    }

    setStatus('uploading');
    setMessage(null);
    onStart();

    try {
      const ticket = await ticketAction({
        type,
        fieldKey,
        fileName: picked.name,
        mimeType: picked.type,
        size: picked.size,
      });

      if (ticket.error || !ticket.path || !ticket.token) {
        throw new Error(ticket.error ?? 'تعذّر تجهيز رابط الرفع');
      }

      const { error } = await browserStorage()
        .storage.from('attachments')
        .uploadToSignedUrl(ticket.path, ticket.token, picked, { contentType: picked.type });

      if (error) throw new Error(`تعذّر رفع الملف: ${error.message}`);

      setFile({
        name: picked.name,
        size: `${(picked.size / 1024 / 1024).toFixed(2)} م.ب`,
        path: ticket.path,
        mime: picked.type,
        bytes: picked.size,
      });
      setStatus('done');
      onDone({ path: ticket.path, name: picked.name });
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'تعذّر رفع الملف');
      setFile(null);
      onDone(null);
      reset();
    }
  }

  return (
    <div
      className={`rounded-xl border p-4 ${
        status === 'done' ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-800">
            {label} <span className="text-rose-600">*</span>
          </div>
          <div className="text-xs text-slate-500">{hint}</div>
        </div>

        <label className={`btn-ghost !py-2 !text-sm ${status === 'uploading' ? 'opacity-60' : 'cursor-pointer'}`}>
          {status === 'uploading' ? 'جارٍ الرفع…' : status === 'done' ? 'تغيير الملف' : 'اختيار ملف'}
          <input
            type="file"
            className="hidden"
            disabled={status === 'uploading'}
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
            onChange={(e) => {
              const picked = e.target.files?.[0];
              const el = e.target;
              handleFile(picked, () => {
                el.value = '';
              });
            }}
          />
        </label>
      </div>

      {/* بيانات المرفق تُرسل مع النموذج — الملف نفسه مرفوع مسبقاً */}
      {file && (
        <>
          <input type="hidden" name={`${fieldKey}__path`} value={file.path} />
          <input type="hidden" name={`${fieldKey}__name`} value={file.name} />
          <input type="hidden" name={`${fieldKey}__type`} value={file.mime} />
          <input type="hidden" name={`${fieldKey}__size`} value={String(file.bytes)} />
        </>
      )}

      {status === 'uploading' && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          جارٍ رفع الملف إلى الخادم…
        </div>
      )}

      {status === 'done' && file && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span dir="ltr" className="truncate">
            {file.name}
          </span>
          <span className="text-emerald-600">({file.size})</span>
        </div>
      )}

      {status === 'error' && message && <div className="field-error">{message}</div>}
    </div>
  );
}
