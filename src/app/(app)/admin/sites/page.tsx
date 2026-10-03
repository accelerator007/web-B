import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/supabase';
import type { AvailableSiteRow } from '@/lib/types';
import { createAvailableSiteAction, deleteAvailableSiteAction, toggleAvailableSiteAction } from './actions';

export default async function AdminSitesPage() {
  await requireAdmin();
  const { data, error } = await db().from('available_sites').select('*').order('created_at', { ascending: false });
  const sites = (data ?? []) as AvailableSiteRow[];

  return (
    <div className="space-y-7">
      <header>
        <h1 className="page-title">المواقع المعروضة للاستغلال</h1>
        <p className="page-subtitle">أضف المواقع التي ستظهر للمواطنين في صفحة الخريطة.</p>
      </header>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">شغّل ملف الترحيل الجديد في Supabase أولاً.</div>}

      <form action={createAvailableSiteAction} className="card grid gap-4 p-6 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="title">اسم الموقع *</label>
          <input className="input" id="title" name="title" maxLength={120} required />
        </div>
        <div>
          <label className="label" htmlFor="activity_type">نوع النشاط المقترح</label>
          <input className="input" id="activity_type" name="activity_type" maxLength={120} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="location_url">رابط الموقع على الخريطة *</label>
          <input className="input" id="location_url" name="location_url" type="url" dir="ltr" required />
        </div>
        <div>
          <label className="label" htmlFor="latitude">خط العرض (اختياري)</label>
          <input className="input" id="latitude" name="latitude" type="number" dir="ltr" step="any" min="-90" max="90" />
        </div>
        <div>
          <label className="label" htmlFor="longitude">خط الطول (اختياري)</label>
          <input className="input" id="longitude" name="longitude" type="number" dir="ltr" step="any" min="-180" max="180" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="description">وصف الموقع</label>
          <textarea className="input resize-none" id="description" name="description" rows={3} maxLength={1000} />
        </div>
        <div className="sm:col-span-2"><button className="btn-primary" type="submit">إضافة ونشر الموقع</button></div>
      </form>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map((site) => (
          <article className="card p-5" key={site.id}>
            <div className="flex items-start justify-between gap-2">
              <div><h2 className="font-extrabold text-slate-900">{site.title}</h2>{site.activity_type && <p className="mt-1 text-xs font-bold text-brand-700">{site.activity_type}</p>}</div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${site.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{site.is_published ? 'منشور' : 'مخفي'}</span>
            </div>
            {site.description && <p className="mt-3 text-sm leading-7 text-slate-600">{site.description}</p>}
            <a className="mt-3 block text-sm font-bold text-sky-700 hover:underline" href={site.location_url} target="_blank" rel="noreferrer">فتح الخريطة</a>
            <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
              <form action={toggleAvailableSiteAction}>
                <input type="hidden" name="id" value={site.id} />
                <input type="hidden" name="publish" value={String(!site.is_published)} />
                <button className="btn-ghost !py-2 !text-sm" type="submit">{site.is_published ? 'إخفاء' : 'نشر'}</button>
              </form>
              <form action={deleteAvailableSiteAction}>
                <input type="hidden" name="id" value={site.id} />
                <button className="rounded-lg px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50" type="submit">حذف</button>
              </form>
            </div>
          </article>
        ))}
        {!sites.length && !error && <div className="card p-6 text-sm text-slate-500">لم تُضف مواقع بعد.</div>}
      </section>
    </div>
  );
}
