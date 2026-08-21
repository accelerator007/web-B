'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/supabase';
import { applyDecision, canDecide } from '@/lib/workflow';
import { createUploadTicket, deleteAttachments, inspectObject, moveAttachment } from '@/lib/storage';
import { consumeRateLimit } from '@/lib/rate-limit';
import { logAudit } from '@/lib/notify';
import { MAX_FILE_BYTES, type Department } from '@/lib/constants';
import { guard } from '@/lib/errors';
import type { ActionState, RequestRow } from '@/lib/types';

export async function createContractUploadTicketAction(
  requestId: string,
  input: { fileName: string; mimeType: string; size: number }
): Promise<{ path?: string; token?: string; error?: string }> {
  const user = await requireUser();
  if (!(await consumeRateLimit('contract-upload', 20, 3600))) return { error: 'طلبات رفع كثيرة، حاول لاحقاً' };
  const { data } = await db().from('requests').select('*').eq('id', requestId).maybeSingle();
  const request = data as RequestRow | null;
  if (!request || !canDecide(user, request)) return { error: 'لا يمكنك رفع عقد لهذا الطلب' };
  if (request.status !== 'pending_investment') return { error: 'الطلب ليس في مرحلة دائرة الاستثمار' };
  if (user.role !== 'admin' && user.department !== 'investment') return { error: 'رفع العقد مخصص لدائرة الاستثمار' };
  if (input.mimeType !== 'application/pdf') return { error: 'العقد يجب أن يكون بصيغة PDF فقط' };
  if (input.size <= 0 || input.size > MAX_FILE_BYTES) return { error: 'حجم العقد يتجاوز ١٠ ميجابايت' };

  const ticket = await createUploadTicket('final_contract', 'pdf');
  return ticket;
}

async function decideActionImpl(
  requestId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const { data } = await db().from('requests').select('*').eq('id', requestId).maybeSingle();
  const request = data as RequestRow | null;
  if (!request) return { error: 'الطلب غير موجود' };

  if (!canDecide(user, request)) return { error: 'لا يمكنك اتخاذ قرار على هذا الطلب في مرحلته الحالية' };

  // الأدمن يمكنه اتخاذ القرار نيابة عن الجهة المسؤولة عن المرحلة الحالية
  const actingAs: Department =
    user.role === 'admin'
      ? ((formData.get('acting_as') as Department) ?? stageDepartment(request))
      : user.department;

  const decision = String(formData.get('decision') ?? '') as 'approved' | 'rejected';
  const notes = String(formData.get('notes') ?? '').trim();

  if (decision !== 'approved' && decision !== 'rejected') return { error: 'الرجاء اختيار القرار' };
  if (decision === 'rejected' && notes.length < 5)
    return { error: 'الرجاء كتابة سبب الرفض بشكل واضح (٥ أحرف على الأقل)' };

  const paymentStatus = String(formData.get('payment_status') ?? '') as 'paid' | 'unpaid' | 'exempt';
  const amountRaw = String(formData.get('payment_amount') ?? '').trim();
  const reference = String(formData.get('payment_reference') ?? '').trim();

  let contractPath: string | null = null;
  let contractName = '';
  let contractSize = 0;
  if (actingAs === 'investment' && decision === 'approved') {
    contractPath = String(formData.get('contract__path') ?? '').trim();
    contractName = String(formData.get('contract__name') ?? '').trim() || 'العقد المعتمد.pdf';
    if (!contractPath.startsWith('pending/')) return { error: 'العقد المعتمد بصيغة PDF مطلوب قبل الاعتماد النهائي' };
    const contractInfo = await inspectObject(contractPath);
    if (!contractInfo) return { error: 'لم يكتمل رفع العقد، حاول مرة أخرى' };
    if (contractInfo.mime !== 'application/pdf') return { error: 'العقد يجب أن يكون بصيغة PDF فقط' };
    if (contractInfo.size <= 0 || contractInfo.size > MAX_FILE_BYTES)
      return { error: 'حجم العقد يجب ألا يتجاوز ١٠ ميجابايت' };
    contractSize = contractInfo.size;
  }

  let storedContract: { id: string; path: string } | null = null;
  if (contractPath) {
    const target = `requests/${requestId}/final_contract-${crypto.randomUUID()}.pdf`;
    const moved = await moveAttachment(contractPath, target);
    if (!moved) return { error: 'تعذّر حفظ ملف العقد، حاول رفعه مرة أخرى.' };
    const { data: attachment, error: attachmentError } = await db()
      .from('attachments')
      .insert({
        request_id: requestId,
        field_key: 'final_contract',
        file_name: contractName,
        storage_path: target,
        mime_type: 'application/pdf',
        size_bytes: contractSize,
      })
      .select('id')
      .single();
    if (attachmentError || !attachment) {
      await deleteAttachments([target]);
      return { error: `تعذّر تسجيل العقد: ${attachmentError?.message ?? 'خطأ غير معروف'}` };
    }
    storedContract = { id: attachment.id, path: target };
  }

  const result = await applyDecision({
    request,
    user,
    actingAs,
    decision,
    notes,
    payment:
      actingAs === 'finance'
        ? {
            status: paymentStatus || (decision === 'approved' ? 'paid' : 'unpaid'),
            amount: amountRaw ? Number(amountRaw) : null,
            reference: reference || null,
          }
        : undefined,
  });

  if (result.error) {
    if (storedContract) {
      await db().from('attachments').delete().eq('id', storedContract.id);
      await deleteAttachments([storedContract.path]);
    }
    return { error: result.error };
  }

  await logAudit({
    actorId: user.id,
    actorName: user.full_name,
    action: `decision_${decision}`,
    targetType: 'request',
    targetId: requestId,
    meta: { actingAs, notes },
  });

  revalidatePath(`/dashboard/requests/${requestId}`);
  revalidatePath(`/admin/requests/${requestId}`);
  revalidatePath('/dashboard');

  return { ok: true, message: decision === 'approved' ? 'تم حفظ الموافقة وتحويل الطلب.' : 'تم تسجيل الرفض.' };
}

function stageDepartment(r: RequestRow): Department {
  if (r.status === 'pending_finance') return 'finance';
  if (r.status === 'pending_investment') return 'investment';
  return 'technical';
}


export async function decideAction(
  requestId: string,
  prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  return guard(() => decideActionImpl(requestId, prev, formData));
}
