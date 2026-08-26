import Link from 'next/link';
import { PublicFooter, PublicHeader } from '@/components/public-header';
import { ATTACHMENTS, REQUEST_TYPES } from '@/lib/constants';

const SERVICES = [
  {
    type: 'new' as const,
    icon: (
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    ),
    desc: 'تقديم طلب جديد لاستثمار موقع حكومي تابع لدائرة البلدية بالسويق.',
    color: 'bg-brand-600',
  },
  {
    type: 'renewal' as const,
    icon: (
      <path d="M4 12a8 8 0 0 1 13.7-5.7L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.7L4 16m0 4v-4h4" strokeLinecap="round" strokeLinejoin="round" />
    ),
    desc: 'تجديد عقد استثمار قائم قبل انتهاء مدته مع إرفاق العقد السابق.',
    color: 'bg-sky-700',
  },
  {
    type: 'waiver' as const,
    icon: (
      <path d="M8 7h8M8 12h5M4 5.5A2.5 2.5 0 0 1 6.5 3H15l5 5v10.5A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5z" strokeLinecap="round" strokeLinejoin="round" />
    ),
    desc: 'التنازل عن موقع استثماري بعد إخلائه وتقديم المخالصة المالية.',
    color: 'bg-gold-600',
  },
  {
    type: 'cancellation' as const,
    icon: (
      <>
        <path d="M8 7h8M8 12h5M4 5.5A2.5 2.5 0 0 1 6.5 3H15l5 5v10.5A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m10 15 4 4m0-4-4 4" strokeLinecap="round" />
      </>
    ),
    desc: 'إلغاء عقد استثماري قائم بعد إخلاء الموقع وتقديم المخالصة المالية.',
    color: 'bg-rose-700',
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="flex-1">
        {/* الواجهة الرئيسية */}
        <section className="relative overflow-hidden bg-brand-800 text-white">
          <div className="absolute inset-0 opacity-10">
            <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0 70 L20 50 L40 65 L60 40 L80 58 L100 35 L100 100 L0 100 Z" fill="white" />
            </svg>
          </div>
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-20">
            <span className="badge bg-white/15 text-white ring-white/25">خدمات إلكترونية</span>
            <h1 className="mt-4 text-3xl font-extrabold leading-snug sm:text-4xl">
              بوابة استثمار المواقع الحكومية
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-8 text-white/85">
              قدّم طلبك إلكترونياً وتابع مساره خطوة بخطوة بين قسم الشؤون الفنية، وقسم الرقابة الغذائية
              والصحية، والشؤون المالية، ودائرة الاستثمار — دون الحاجة لمراجعة الدائرة.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="#services" className="btn bg-white text-brand-800 hover:bg-white/90">
                تقديم طلب
              </Link>
              <Link href="/track" className="btn border border-white/40 text-white hover:bg-white/10">
                تتبّع طلب سابق
              </Link>
            </div>
          </div>
        </section>

        {/* الخدمات المتاحة */}
        <section id="services" className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-xl font-extrabold text-slate-900">الخدمات المتاحة للمواطن</h2>
          <p className="mt-1 text-sm text-slate-500">اختر الخدمة المطلوبة لبدء تعبئة النموذج.</p>

          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((s) => (
              <Link
                key={s.type}
                href={`/apply/${s.type}`}
                className="card group flex flex-col p-5 transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg sm:p-6"
              >
                <span className={`grid h-12 w-12 place-items-center rounded-xl text-white ${s.color}`}>
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                    {s.icon}
                  </svg>
                </span>
                <h3 className="mt-4 text-[17px] font-bold text-slate-900">{REQUEST_TYPES[s.type]}</h3>
                <p className="mt-2 flex-1 text-sm leading-7 text-slate-600">{s.desc}</p>

                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="text-xs font-bold text-slate-500">المرفقات المطلوبة</div>
                  <ul className="mt-2 space-y-1.5">
                    {ATTACHMENTS[s.type].map((f) => (
                      <li key={f.key} className="flex items-center gap-2 text-[13px] text-slate-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                        {f.label}
                      </li>
                    ))}
                  </ul>
                </div>

                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-700">
                  بدء الطلب
                  <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-1" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M11 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* مسار الطلب */}
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="text-xl font-extrabold text-slate-900">مسار دراسة الطلب</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { n: '١', t: 'الشؤون الفنية والرقابة الصحية', d: 'يُحال الطلب فور تقديمه إلى القسمين لدراسته، ولكل قسم قبول أو رفض مع الملاحظات.' },
                { n: '٢', t: 'دراسة الشؤون المالية', d: 'بعد موافقة القسمين تدرس المالية الطلب ثم تحوّله إلى دائرة الاستثمار.' },
                { n: '٣', t: 'دائرة الاستثمار', d: 'تراجع الدائرة الطلب وتوافق عليه قبل إعادته إلى الشؤون المالية.' },
                { n: '٤', t: 'استكمال الدفع', d: 'تؤكد المالية الدفع أو الإعفاء، وعندها تُعتمد المعاملة نهائياً.' },
                { n: '٥', t: 'إشعار المواطن', d: 'يمكن تتبّع النتيجة في أي وقت باستخدام الرقم المدني ورقم الطلب.' },
              ].map((step) => (
                <div key={step.n} className="rounded-2xl border border-slate-200 p-5">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 font-bold text-brand-700">
                    {step.n}
                  </span>
                  <h3 className="mt-3 font-bold text-slate-900">{step.t}</h3>
                  <p className="mt-1.5 text-[13px] leading-7 text-slate-600">{step.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
