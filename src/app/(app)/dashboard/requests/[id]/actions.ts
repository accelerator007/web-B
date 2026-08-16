'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/supabase';
import { applyDecision, canDecide } from '@/lib/workflow';
import { logAudit } from '@/lib/notify';
import type { Department } from '@/lib/constants';
import type { ActionState, RequestRow } from '@/lib/types';

export async function decideAction(
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

  if (result.error) return { error: result.error };

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
