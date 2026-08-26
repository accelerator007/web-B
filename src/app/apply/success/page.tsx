import Link from 'next/link';
import { PublicFooter, PublicHeader } from '@/components/public-header';

export default function SuccessPage({
  searchParams,
}: {
  searchParams: { no?: string; civil?: string };
}) {
  const number = searchParams.no ?? '';
  const civil = searchParams.civil ?? '';

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-16">
        <div className="card p-8 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>

          <h1 className="mt-5 text-xl font-extrabold text-slate-900">تم استلام طلبك بنجاح</h1>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            تمت إحالة الطلب إلى قسم الشؤون الفنية وقسم الرقابة الغذائية والصحية للدراسة.
          </p>

          <div className="mt-6 rounded-xl bg-slate-50 p-5">
            <div className="text-xs font-bold text-slate-500">رقم الطلب</div>
            <div dir="ltr" className="mt-1 text-2xl font-extrabold tracking-wider text-brand-700">
              {number || '—'}
            </div>
          </div>

          <p className="mt-5 text-sm text-slate-600">
            احتفظ برقم الطلب، ويمكنك متابعة حالته في أي وقت باستخدامه مع الرقم المدني.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={`/track?civil=${encodeURIComponent(civil)}&request=${encodeURIComponent(number)}`}
              className="btn-primary"
            >
              تتبّع الطلب الآن
            </Link>
            <Link href="/" className="btn-ghost">
              العودة للرئيسية
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
