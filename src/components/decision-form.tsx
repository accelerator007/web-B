'use client';

import { useFormState } from 'react-dom';
import { useState } from 'react';
import { SubmitButton } from './submit-button';
import { Alert } from './ui';
import { DEPARTMENTS, type Department, type RequestStatus } from '@/lib/constants';
import { MAX_FILE_BYTES } from '@/lib/constants';
import { browserStorage } from '@/lib/supabase-browser';
import type { ActionState } from '@/lib/types';

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;
type ContractTicketAction = (input: {
  fileName: string;
  mimeType: string;
  size: number;
}) => Promise<{ path?: string; token?: string; error?: string }>;

export function DecisionForm({
  action,
  actingAs,
  requestStatus,
  isAdmin = false,
  contractTicketAction,
}: {
  action: Action;
  actingAs: Department;
  requestStatus: RequestStatus;
  isAdmin?: boolean;
  contractTicketAction?: ContractTicketAction;
}) {
  const [state, formAction] = useFormState(action, null);
  const [decision, setDecision] = useState<'approved' | 'rejected' | ''>('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'exempt' | 'unpaid'>('unpaid');
  const [contract, setContract] = useState<{ path: string; name: string; size: number } | null>(null);
  const [contractStatus, setContractStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [contractError, setContractError] = useState<string | null>(null);
  const isPaymentStage = actingAs === 'finance' && requestStatus === 'pending_payment';
  const isFinanceStudy = actingAs === 'finance' && requestStatus === 'pending_finance';

  async function uploadContract(file: File | undefined, reset: () => void) {
    if (!file || !contractTicketAction) return;
    if (file.type !== 'application/pdf') {
      setContractStatus('error');
      setContractError('العقد يجب أن يكون بصيغة PDF فقط');
      setContract(null);
      reset();
      return;
    }
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
      setContractStatus('error');
      setContractError('حجم العقد يجب ألا يتجاوز ١٠ ميجابايت');
      setContract(null);
      reset();
      return;
    }

    setContractStatus('uploading');
    setContractError(null);
    try {
      const ticket = await contractTicketAction({ fileName: file.name, mimeType: file.type, size: file.size });
      if (ticket.error || !ticket.path || !ticket.token) throw new Error(ticket.error ?? 'تعذّر تجهيز رفع العقد');
      const { error } = await browserStorage()
        .storage.from('attachments')
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (error) throw error;
      setContract({ path: ticket.path, name: file.name, size: file.size });
      setContractStatus('done');
    } catch (error) {
      setContract(null);
      setContractStatus('error');
      setContractError(error instanceof Error ? error.message : 'تعذّر رفع العقد');
      reset();
    }
  }

  return (
    <form action={formAction} className="card p-6">
      <h2 className="text-lg font-extrabold text-slate-900">
        {isPaymentStage ? 'استكمال الدفع' : 'القرار'} — {DEPARTMENTS[actingAs]}
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
              {isPaymentStage ? 'حفظ حالة الدفع' : isFinanceStudy ? 'الموافقة والتحويل للاستثمار' : 'موافقة'}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {actingAs === 'technical' || actingAs === 'health'
                ? 'تحويل الطلب للمرحلة التالية بعد موافقة القسمين'
                : isFinanceStudy
                ? 'اعتماد الدراسة وتحويل الطلب إلى دائرة الاستثمار'
                : isPaymentStage
                ? 'إذا تم الدفع أو الإعفاء تُعتمد المعاملة نهائياً'
                : 'إعادة الطلب للشؤون المالية لاستكمال الدفع'}
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

        {isPaymentStage && decision !== 'rejected' && (
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
                  ستبقى المعاملة بانتظار الدفع ولن تُعتمد نهائياً.
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
                required={paymentStatus === 'paid'}
                disabled={paymentStatus !== 'paid'}
              />
            </div>

            <div>
              <label className="label" htmlFor="payment_reference">
                رقم الإيصال / المرجع
              </label>
              <input
                id="payment_reference"
                name="payment_reference"
                dir="ltr"
                className="input"
                required={paymentStatus === 'paid'}
                disabled={paymentStatus !== 'paid'}
              />
            </div>
          </div>
        )}

        {actingAs === 'investment' && decision === 'approved' && (
          <div className={`rounded-xl border p-4 ${contractStatus === 'done' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-800">
                  العقد المعتمد <span className="text-rose-600">*</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">ملف PDF فقط — بحد أقصى ١٠ ميجابايت.</div>
              </div>
              <label className={`btn-ghost !py-2 !text-sm ${contractStatus === 'uploading' ? 'opacity-60' : 'cursor-pointer'}`}>
                {contractStatus === 'uploading' ? 'جارٍ الرفع…' : contractStatus === 'done' ? 'تغيير العقد' : 'اختيار العقد'}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  disabled={contractStatus === 'uploading'}
                  onChange={(event) => {
                    const element = event.target;
                    uploadContract(element.files?.[0], () => { element.value = ''; });
                  }}
                />
              </label>
            </div>
            {contract && (
              <>
                <input type="hidden" name="contract__path" value={contract.path} />
                <input type="hidden" name="contract__name" value={contract.name} />
                <input type="hidden" name="contract__size" value={String(contract.size)} />
                <div className="mt-3 text-xs font-semibold text-emerald-800">✓ {contract.name}</div>
              </>
            )}
            {contractError && <div className="field-error">{contractError}</div>}
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
          disabled={contractStatus === 'uploading' || (actingAs === 'investment' && decision === 'approved' && !contract)}
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
