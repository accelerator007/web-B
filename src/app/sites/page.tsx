import Link from 'next/link';
import { PublicFooter, PublicHeader } from '@/components/public-header';
import { db } from '@/lib/supabase';
import type { AvailableSiteRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AvailableSitesPage() {
  const { data, error } = await db()
    .from('available_sites')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  const sites = (data ?? []) as AvailableSiteRow[];

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <nav className="mb-4 text-sm text-slate-500">
          <Link href="/" className="hover:text-brand-700">الرئيسية</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-800">المواقع المعروضة للاستغلال</span>
        </nav>
        <div className="rounded-3xl bg-brand-800 px-6 py-9 text-white sm:px-10">
          <span className="badge bg-white/15 text-white ring-white/25">خريطة الفرص</span>
          <h1 className="mt-4 text-3xl font-extrabold">المواقع المعروضة للاستغلال</h1>
          <p className="mt-3 max-w-2xl text-sm leading-8 text-white/80">
            استعرض المواقع الحكومية المتاحة للإيجار، وتعرّف على النشاط المقترح وافتح الموقع على الخريطة.
          </p>
        </div>

        {error ? (
          <div className="card mt-8 border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            تعذّر تحميل المواقع حالياً. يرجى المحاولة لاحقاً.
          </div>
        ) : sites.length === 0 ? (
          <div className="card mt-8 p-10 text-center">
            <h2 className="text-lg font-extrabold text-slate-900">لا توجد مواقع منشورة حالياً</h2>
            <p className="mt-2 text-sm text-slate-500">ستظهر هنا المواقع التي تطرحها الدائرة للاستغلال.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sites.map((site) => (
              <article key={site.id} className="card flex flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">{site.title}</h2>
                    {site.activity_type && <p className="mt-1 text-sm font-bold text-brand-700">{site.activity_type}</p>}
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">متاح</span>
                </div>
                {site.description && <p className="mt-4 flex-1 whitespace-pre-wrap text-sm leading-7 text-slate-600">{site.description}</p>}
                {site.latitude != null && site.longitude != null && (
                  <p dir="ltr" className="mt-3 text-right text-xs text-slate-400">
                    {site.latitude.toFixed(6)}, {site.longitude.toFixed(6)}
                  </p>
                )}
                <a href={site.location_url} target="_blank" rel="noreferrer" className="btn-primary mt-5 justify-center">
                  فتح الموقع على الخريطة
                </a>
              </article>
            ))}
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
