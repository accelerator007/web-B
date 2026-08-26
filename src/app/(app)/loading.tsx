export default function AppLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="جارٍ تحميل الصفحة" className="space-y-6">
      <div className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-brand-100">
        <div className="route-progress h-full w-full bg-brand-600" />
      </div>
      <div className="space-y-2">
        <div className="h-8 w-52 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-200/80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="card h-28 animate-pulse bg-white p-5">
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="mt-4 h-8 w-14 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="card h-72 animate-pulse bg-white" />
      <span className="sr-only">جارٍ التحميل…</span>
    </div>
  );
}
