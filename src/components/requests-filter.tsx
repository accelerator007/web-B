import { REQUEST_TYPES, STATUS_LABELS, type RequestStatus, type RequestType } from '@/lib/constants';

export function RequestsFilter({
  action,
  defaults,
  showInbox = true,
}: {
  action: string;
  defaults: { q?: string; status?: string; type?: string; scope?: string };
  showInbox?: boolean;
}) {
  return (
    <form method="get" action={action} className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <label className="label" htmlFor="q">
          البحث بالرقم المدني أو رقم الطلب
        </label>
        <input
          id="q"
          name="q"
          dir="ltr"
          defaultValue={defaults.q ?? ''}
          className="input"
          placeholder="12345678 أو SWQ-2026-00001"
        />
      </div>

      <div>
        <label className="label" htmlFor="status">
          الحالة
        </label>
        <select id="status" name="status" defaultValue={defaults.status ?? ''} className="input">
          <option value="">الكل</option>
          {(Object.keys(STATUS_LABELS) as RequestStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="type">
          نوع الطلب
        </label>
        <select id="type" name="type" defaultValue={defaults.type ?? ''} className="input">
          <option value="">الكل</option>
          {(Object.keys(REQUEST_TYPES) as RequestType[]).map((t) => (
            <option key={t} value={t}>
              {REQUEST_TYPES[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end gap-2">
        {showInbox && (
          <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              name="scope"
              value="inbox"
              defaultChecked={defaults.scope === 'inbox'}
              className="h-4 w-4 accent-brand-600"
            />
            وارد قسمي فقط
          </label>
        )}
        <button type="submit" className="btn-primary">
          بحث
        </button>
      </div>
    </form>
  );
}
