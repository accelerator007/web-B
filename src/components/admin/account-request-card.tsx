'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { SubmitButton } from '../submit-button';
import { Alert } from '../ui';
import { DEPARTMENTS } from '@/lib/constants';
import { decideAccountAction } from '@/app/(app)/admin/actions';
import type { EmployeeRow } from '@/lib/types';

export function AccountRequestCard({ employee, createdAt }: { employee: EmployeeRow; createdAt: string }) {
  const [state, formAction] = useFormState(decideAccountAction, null);
  const [rejecting, setRejecting] = useState(false);

  if (state?.ok) {
    return (
      <li className="card p-5">
        <Alert kind="success">{state.message}</Alert>
      </li>
    );
  }

  return (
    <li className="card p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="اسم الموظف" value={employee.full_name} />
        <Info label="الرقم الوظيفي" value={employee.employee_number} ltr />
        <Info label="البريد الإلكتروني" value={employee.email} ltr />
        <Info label="القسم" value={DEPARTMENTS[employee.department]} />
      </div>

      <div className="mt-2 text-xs text-slate-400">تاريخ الطلب: {createdAt}</div>

      <form action={formAction} className="mt-5 space-y-4">
        {state?.error && <Alert kind="error">{state.error}</Alert>}
        <input type="hidden" name="employee_id" value={employee.id} />

        {rejecting && (
          <div>
            <label className="label">سبب الرفض</label>
            <textarea name="reason" rows={2} className="input resize-none" required />
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {!rejecting ? (
            <>
              <button type="submit" name="decision" value="approve" className="btn-primary">
                اعتماد الحساب
              </button>
              <button type="button" className="btn-ghost" onClick={() => setRejecting(true)}>
                رفض الطلب
              </button>
            </>
          ) : (
            <>
              <input type="hidden" name="decision" value="reject" />
              <SubmitButton className="btn-danger">تأكيد الرفض</SubmitButton>
              <button type="button" className="btn-ghost" onClick={() => setRejecting(false)}>
                إلغاء
              </button>
            </>
          )}
        </div>
      </form>
    </li>
  );
}

function Info({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div>
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div dir={ltr ? 'ltr' : undefined} className={`mt-1 text-sm font-semibold text-slate-800 ${ltr ? 'text-right' : ''}`}>
        {value}
      </div>
    </div>
  );
}
