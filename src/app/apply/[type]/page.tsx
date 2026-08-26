import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicFooter, PublicHeader } from '@/components/public-header';
import { ApplyForm } from '@/components/apply-form';
import { REQUEST_TYPES, type RequestType } from '@/lib/constants';
import { createUploadTicketAction, submitRequest } from './actions';

const VALID: RequestType[] = ['new', 'renewal', 'waiver', 'cancellation'];

export function generateStaticParams() {
  return VALID.map((type) => ({ type }));
}

export default async function ApplyPage({ params }: { params: Promise<{ type: string }> }) {
  const type = (await params).type as RequestType;
  if (!VALID.includes(type)) notFound();

  const action = submitRequest.bind(null, type);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <nav className="mb-4 text-sm text-slate-500">
          <Link href="/" className="hover:text-brand-700">
            الرئيسية
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-800">{REQUEST_TYPES[type]}</span>
        </nav>

        <h1 className="text-2xl font-extrabold text-slate-900">{REQUEST_TYPES[type]}</h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          يُحال الطلب بعد تقديمه مباشرة إلى قسم الشؤون الفنية وقسم الرقابة الغذائية والصحية للدراسة.
        </p>

        <div className="mt-8">
          <ApplyForm type={type} action={action} ticketAction={createUploadTicketAction} />
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
