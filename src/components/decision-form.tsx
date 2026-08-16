'use client';

import { useFormState } from 'react-dom';
import { useState } from 'react';
import { SubmitButton } from './submit-button';
import { Alert } from './ui';
import { DEPARTMENTS, type Department } from '@/lib/constants';
import type { ActionState } from '@/lib/types';

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function DecisionForm({
  action,
  actingAs,
  isAdmin = false,
}: {
  action: Action;
  actingAs: Department;
  isAdmin?: boolean;
}) {
  const [state, formAction] = useFormState(action, null);
  const [decision, setDecision] = useState<'approved' | 'rejected' | ''>('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'exempt' | 'unpaid'>('paid');

  return (
    <form action={formAction} className="card p-6">
      <h2 className="text-lg font-extrabold text-slate-900">
        القرار — {DEPARTMENTS[actingAs]}
        {isAdmin && <span className="mr-2 text-xs font-bold text-amber-700">(نيابةً عن الجهة)</span>}
      </h2>

      <input type="hidden" name="acting_as" value={actingAs} />

      <div className="mt-5 space-y-5">
        {state?.error && <Alert kind="error">{state.error}</Alert>}
        {state?.ok && <Alert kind="success">{state.message}</Alert>}

        <div className="grid gap-3 sm:grid-cols-2">
          <label
            className={`cursor-pointer rounded-xl border-2 p-4 transition ${
              decision === 'approved' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name="decision"
              value="approved"
              className="sr-only"
              onChange={() => setDecision('approved')}
              required
            />
            <div className="font-bold text-slate-800">
              {actingAs === 'finance' ? 'اعتماد الإجراء المالي' : 'موافقة'}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {actingAs === 'technical' || actingAs === 'health'
                ? 'تحويل الطلب للمرحلة التالية بعد موافقة القسمين'
                : actingAs === 'finance'
                ? 'تحويل الطلب إلى دائرة الاستثمار'
                : 'اعتماد الطلب نهائياً'}
            </div>
          </label>

          <label
            className={`cursor-pointer rounded-xl border-2 p-4 transition ${
              decision === 'rejected' ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name="decision"
              value="rejected"
              className="sr-only"
              onChange={() => setDecision('rejected')}
            />
            <div className="font-bold text-slate-800">رفض الطلب</div>
            <div className="mt-1 text-xs text-slate-500">يُغلق الطلب مع بيان الجهة الرافضة وصاحب القرار</div>
          </label>
        </div>

        {actingAs === 'finance' && decision !== 'rejected' && (
          <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="payment_status">
                حالة الدفع
              </label>
              <select
                id="payment_status"
                name="payment_status"
                className="input"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as 'paid' | 'exempt' | 'unpaid')}
              >
                <option value="paid">تم الدفع</option>
                <option value="exempt">معفى من الرسوم</option>
                <option value="unpaid">لم يتم الدفع</option>
              </select>
              {paymentStatus === 'unpaid' && (
                <p className="mt-1.5 text-xs text-amber-700">
                  لن يُحوّل الطلب لدائرة الاستثمار قبل تأكيد الدفع أو الإعفاء.
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="payment_amount">
                المبلغ (ر.ع)
              </label>
              <input
                id="payment_amount"
                name="payment_amount"
                dir="ltr"
                inputMode="decimal"
                className="input"
                placeholder="0.000"
              />
            </div>

            <div>
              <label className="label" htmlFor="payment_reference">
                رقم الإيصال / المرجع
              </label>
              <input id="payment_reference" name="payment_reference" dir="ltr" className="input" />
            </div>
          </div>
        )}

        <div>
          <label className="label" htmlFor="notes">
            الملاحظات {decision === 'rejected' && <span className="text-rose-600">(إلزامية عند الرفض)</span>}
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            className="input resize-none"
            placeholder="اكتب ملاحظات الجهة على الطلب…"
            required={decision === 'rejected'}
          />
        </div>

        <SubmitButton
          className={decision === 'rejected' ? 'btn-danger' : 'btn-primary'}
          pendingLabel="جارٍ حفظ القرار…"
          confirm={
            decision === 'rejected'
              ? 'هل أنت متأكد من رفض الطلب؟ سيتم إغلاقه وإظهار الجهة الرافضة للمواطن.'
              : undefined
          }
        >
          حفظ القرار
        </SubmitButton>
      </div>
    </form>
  );
}
