import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { CreateEmployeeForm } from '@/components/admin/create-employee-form';

export const dynamic = 'force-dynamic';

export default async function NewEmployeePage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav className="text-sm text-slate-500">
        <Link href="/admin/employees" className="hover:text-brand-700">
          الموظفون
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-800">إنشاء حساب</span>
      </nav>

      <header>
        <h1 className="text-2xl font-extrabold text-slate-900">إنشاء حساب موظف</h1>
        <p className="mt-1 text-sm text-slate-600">
          يُفعّل الحساب مباشرة، وتُرسل رسالة إشعار للموظف على بريده الإلكتروني.
        </p>
      </header>

      <CreateEmployeeForm />
    </div>
  );
}
