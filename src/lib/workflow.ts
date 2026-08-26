import 'server-only';
import { db } from './supabase';
import { notifyAdmins, notifyDepartment } from './notify';
import { DEPARTMENTS, REQUEST_TYPES, type Department } from './constants';
import type { RequestRow } from './types';
import type { SessionUser } from './auth';

/** الطلبات التي تخص قسم الموظف حالياً (صندوق الوارد) */
export function inboxFilter(department: Department) {
  switch (department) {
    case 'technical':
      return { status: 'pending_departments', nullColumn: 'technical_decision' as const };
    case 'health':
      return { status: 'pending_departments', nullColumn: 'health_decision' as const };
    case 'finance':
      return { status: 'pending_finance', nullColumn: null };
    case 'investment':
      return { status: 'pending_investment', nullColumn: null };
    default:
      return { status: null, nullColumn: null };
  }
}

export async function fetchInbox(department: Department, limit = 100) {
  const f = inboxFilter(department);
  let q = db().from('requests').select('*').order('created_at', { ascending: true }).limit(limit);
  if (f.status) q = q.eq('status', f.status);
  if (f.nullColumn) q = q.is(f.nullColumn, null);
  const { data } = await q;
  return (data ?? []) as RequestRow[];
}

/** هل يستطيع هذا الموظف اتخاذ قرار على هذا الطلب الآن؟ */
export function canDecide(user: SessionUser, r: RequestRow): boolean {
  if (user.role === 'admin') return r.status !== 'approved' && r.status !== 'rejected';
  switch (user.department) {
    case 'technical':
      return r.status === 'pending_departments' && !r.technical_decision;
    case 'health':
      return r.status === 'pending_departments' && !r.health_decision;
    case 'finance':
      return r.status === 'pending_finance';
    case 'investment':
      return r.status === 'pending_investment';
    default:
      return false;
  }
}

/** يمنع موظفاً من فتح طلب لم يصل إلى دائرته بعد. */
export function canViewRequest(user: SessionUser, r: RequestRow): boolean {
  if (user.role === 'admin') return true;
  switch (user.department) {
    case 'technical':
    case 'health':
      return true;
    case 'finance':
      return Boolean(r.finance_at) || ['pending_finance', 'pending_investment', 'approved'].includes(r.status);
    case 'investment':
      return Boolean(r.investment_at) || ['pending_investment', 'approved'].includes(r.status);
    default:
      return false;
  }
}

type DecisionInput = {
  request: RequestRow;
  user: SessionUser;
  /** القسم الذي يُتخذ القرار باسمه (للأدمن يُحدَّد يدوياً) */
  actingAs: Department;
  decision: 'approved' | 'rejected';
  notes: string;
  payment?: { status: 'paid' | 'unpaid' | 'exempt'; amount?: number | null; reference?: string | null };
};

/**
 * تطبيق قرار قسم على الطلب وتحريكه إلى المرحلة التالية.
 * المسار: (الفنية + الرقابة الصحية) ← المالية ← دائرة الاستثمار.
 */
export async function applyDecision(input: DecisionInput): Promise<{ error?: string; ok?: boolean }> {
  const { request: r, user, actingAs, decision, notes } = input;
  const supa = db();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {};

  const rejectPatch = () => ({
    status: 'rejected',
    rejected_by_department: actingAs,
    rejected_by_name: user.full_name,
    rejected_by_number: user.employee_number,
    rejection_notes: notes || null,
    rejected_at: now,
  });

  if (actingAs === 'technical' || actingAs === 'health') {
    if (r.status !== 'pending_departments') return { error: 'لم يعد الطلب في مرحلة دراسة الأقسام' };

    const prefix = actingAs;
    patch[`${prefix}_decision`] = decision;
    patch[`${prefix}_notes`] = notes || null;
    patch[`${prefix}_by_name`] = user.full_name;
    patch[`${prefix}_by_number`] = user.employee_number;
    patch[`${prefix}_at`] = now;

    if (decision === 'rejected') {
      Object.assign(patch, rejectPatch());
    } else {
      const otherDecision =
        actingAs === 'technical' ? r.health_decision : r.technical_decision;
      if (otherDecision === 'approved') patch.status = 'pending_finance';
    }
  } else if (actingAs === 'finance') {
    if (r.status !== 'pending_finance') return { error: 'الطلب ليس في مرحلة الشؤون المالية' };

    patch.finance_notes = notes || null;
    patch.finance_by_name = user.full_name;
    patch.finance_by_number = user.employee_number;
    patch.finance_at = now;
    patch.payment_status = input.payment?.status ?? (decision === 'approved' ? 'paid' : 'unpaid');
    patch.payment_amount = input.payment?.amount ?? null;
    patch.payment_reference = input.payment?.reference ?? null;

    if (decision === 'rejected') {
      Object.assign(patch, rejectPatch());
    } else {
      if (patch.payment_status === 'unpaid')
        return { error: 'لا يمكن تحويل الطلب لدائرة الاستثمار قبل تأكيد الدفع أو الإعفاء' };
      patch.status = 'pending_investment';
    }
  } else if (actingAs === 'investment') {
    if (r.status !== 'pending_investment') return { error: 'الطلب ليس في مرحلة دائرة الاستثمار' };

    patch.investment_notes = notes || null;
    patch.investment_by_name = user.full_name;
    patch.investment_by_number = user.employee_number;
    patch.investment_at = now;
    patch.status = decision === 'approved' ? 'approved' : 'rejected';
    if (decision === 'rejected') Object.assign(patch, rejectPatch());
  } else {
    return { error: 'قسم غير مصرّح له باتخاذ قرار' };
  }

  let update = supa.from('requests').update(patch).eq('id', r.id).eq('status', r.status);
  if (actingAs === 'technical') update = update.is('technical_decision', null);
  if (actingAs === 'health') update = update.is('health_decision', null);

  const { data: updated, error } = await update.select('id').maybeSingle();
  if (error) return { error: `تعذّر حفظ القرار: ${error.message}` };
  if (!updated) return { error: 'تم تحديث الطلب من موظف آخر. حدّث الصفحة لمشاهدة الحالة الحالية.' };

  // إذا وافق القسمان في اللحظة نفسها فقد يقرأ كل منهما موافقة الآخر قبل حفظها.
  // إعادة الفحص مع تحديث شرطي تضمن انتقال الطلب مرة واحدة فقط إلى المالية.
  let nextStatus = patch.status ?? r.status;
  let ownsTransition = Boolean(patch.status);
  if ((actingAs === 'technical' || actingAs === 'health') && decision === 'approved' && !patch.status) {
    const { data: latest } = await supa
      .from('requests')
      .select('status,technical_decision,health_decision')
      .eq('id', r.id)
      .maybeSingle();

    if (
      latest?.status === 'pending_departments' &&
      latest.technical_decision === 'approved' &&
      latest.health_decision === 'approved'
    ) {
      const { data: advanced } = await supa
        .from('requests')
        .update({ status: 'pending_finance' })
        .eq('id', r.id)
        .eq('status', 'pending_departments')
        .select('id')
        .maybeSingle();
      if (advanced) {
        nextStatus = 'pending_finance';
        ownsTransition = true;
      }
    }
  }

  await supa.from('reviews').insert({
    request_id: r.id,
    department: actingAs,
    action:
      actingAs === 'finance' && decision === 'approved'
        ? String(patch.payment_status) === 'exempt'
          ? 'exempt'
          : 'paid'
        : decision,
    notes: notes || null,
    employee_id: user.id,
    employee_name: user.full_name,
    employee_number: user.employee_number,
  });

  // إشعار المرحلة التالية
  const summary = `الطلب ${r.request_number} (${REQUEST_TYPES[r.type]}) — الرقم المدني ${r.civil_number}`;

  if (nextStatus === 'pending_finance' && ownsTransition) {
    await notifyDepartment({
      department: 'finance',
      title: 'طلب محوّل إلى الشؤون المالية',
      body: `${summary}: اعتمدته الشؤون الفنية والرقابة الغذائية والصحية، وينتظر إجراءات الدفع.`,
      requestId: r.id,
    });
  } else if (nextStatus === 'pending_investment' && ownsTransition) {
    await notifyDepartment({
      department: 'investment',
      title: 'طلب محوّل إلى دائرة الاستثمار',
      body: `${summary}: اكتملت الإجراءات المالية (${
        patch.payment_status === 'exempt' ? 'معفى من الرسوم' : 'تم الدفع'
      })، وينتظر الاعتماد النهائي.`,
      requestId: r.id,
    });
  } else if (nextStatus === 'rejected' && ownsTransition) {
    await notifyAdmins({
      title: 'طلب مرفوض',
      body: `${summary}: تم رفضه من ${DEPARTMENTS[actingAs]} بواسطة ${user.full_name}${
        notes ? ` — الملاحظات: ${notes}` : ''
      }.`,
      link: `/admin/requests/${r.id}`,
    });
  } else if (nextStatus === 'approved' && ownsTransition) {
    await notifyAdmins({
      title: 'اعتماد نهائي لطلب',
      body: `${summary}: تم اعتماده نهائياً من دائرة الاستثمار بواسطة ${user.full_name}.`,
      link: `/admin/requests/${r.id}`,
    });
  }

  return { ok: true };
}
