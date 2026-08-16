'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { SubmitButton } from '../submit-button';
import { Alert } from '../ui';
import type { ActionState } from '@/lib/types';

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * زر يفتح نافذة تأكيد تطلب كلمة مرور الأدمن قبل تنفيذ عملية حسّاسة
 * (حذف موظف / حذف طلب / تغيير كلمة مرور).
 */
export function DangerDialog({
  action,
  triggerLabel,
  triggerClass = 'text-sm font-bold text-rose-600 hover:underline',
  title,
  description,
  confirmLabel = 'تأكيد',
  confirmClass = 'btn-danger flex-1',
  hidden = {},
  children,
}: {
  action: Action;
  triggerLabel: string;
  triggerClass?: string;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmClass?: string;
  hidden?: Record<string, string>;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(action, null);

  return (
    <>
      <button type="button" className={triggerClass} onClick={() => setOpen(true)}>
        {triggerLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" role="dialog">
          <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
            {description && <p className="mt-1.5 text-sm leading-7 text-slate-600">{description}</p>}

            <form action={formAction} className="mt-5 space-y-4">
              {Object.entries(hidden).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}

              {state?.error && <Alert kind="error">{state.error}</Alert>}
              {state?.ok && <Alert kind="success">{state.message}</Alert>}

              {children}

              <div>
                <label className="label" htmlFor={`admin_password_${title}`}>
                  كلمة مرور الأدمن للتأكيد
                </label>
                <input
                  id={`admin_password_${title}`}
                  name="admin_password"
                  type="password"
                  dir="ltr"
                  className="input"
                  required
                />
              </div>

              <div className="flex gap-3 pt-1">
                <SubmitButton className={confirmClass}>{confirmLabel}</SubmitButton>
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                  إغلاق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
