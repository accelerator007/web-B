'use client';

import Link from 'next/link';
import { useFormState } from 'react-dom';
import { SubmitButton } from '../submit-button';
import { Alert, } from '../ui';
import { PasswordPair } from '../auth-forms';
import { DEPARTMENTS, type Department } from '@/lib/constants';
import { createEmployeeAction } from '@/app/(app)/admin/actions';

export function CreateEmployeeForm() {
  const [state, formAction] = useFormState(createEmployeeAction, null);

  return (
    <form action={formAction} className="card space-y-5 p-6">
      {state?.error && <Alert kind="error">{state.error}</Alert>}
      {state?.ok && (
        <Alert kind="success">
          {state.message}{' '}
          <Link href="/admin/employees" className="font-bold underline">
            عرض قائمة الموظفين
          </Link>
        </Alert>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="employee_number">
            الرقم الوظيفي
          </label>
          <input id="employee_number" name="employee_number" dir="ltr" className="input" required />
        </div>

        <div>
          <label className="label" htmlFor="full_name">
            اسم الموظف (ثلاثي بالعربي)
          </label>
          <input id="full_name" name="full_name" className="input" required />
        </div>

        <div>
          <label className="label" htmlFor="email">
            البريد الإلكتروني
          </label>
          <input id="email" name="email" type="email" dir="ltr" className="input" required />
        </div>

        <div>
          <label className="label" htmlFor="department">
            القسم
          </label>
          <select id="department" name="department" className="input" defaultValue="" required>
            <option value="" disabled>
              اختر القسم…
            </option>
            {(Object.keys(DEPARTMENTS) as Department[]).map((d) => (
              <option key={d} value={d}>
                {DEPARTMENTS[d]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="role">
            الصلاحية
          </label>
          <select id="role" name="role" className="input" defaultValue="employee">
            <option value="employee">موظف</option>
            <option value="admin">مدير النظام</option>
          </select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <PasswordPair />
      </div>

      <SubmitButton className="btn-primary">إنشاء الحساب وتفعيله</SubmitButton>
    </form>
  );
}
