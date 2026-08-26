'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { confirmAdminPassword, hashPassword, requireAdmin } from '@/lib/auth';
import { db } from '@/lib/supabase';
import { deleteAttachments } from '@/lib/storage';
import { logAudit, notifyEmployee } from '@/lib/notify';
import { DEPARTMENTS, type Department } from '@/lib/constants';
import {
  validateArabicTripleName,
  validateEmail,
  validateEmployeeNumber,
  validatePassword,
} from '@/lib/validation';
import { guard } from '@/lib/errors';
import type { ActionState } from '@/lib/types';

const DEPTS = ['technical', 'health', 'finance', 'investment', 'admin'];
const ROLES = ['employee', 'admin'];
const STATUSES = ['active', 'disabled'];

/* ------------------------------------------------ اعتماد / رفض طلب حساب */
async function decideAccountActionImpl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = String(formData.get('employee_id') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();

  const { data: emp } = await db().from('employees').select('*').eq('id', id).maybeSingle();
  if (!emp) return { error: 'الطلب غير موجود' };
  if (emp.status !== 'pending') return { error: 'تمت معالجة هذا الطلب مسبقاً' };

  if (decision === 'approve') {
    const { error } = await db()
      .from('employees')
      .update({ status: 'active', approved_at: new Date().toISOString(), approved_by: admin.id })
      .eq('id', id);
    if (error) return { error: `تعذّر اعتماد الحساب: ${error.message}` };

    await notifyEmployee({
      employeeId: id,
      email: emp.email,
      title: 'تم اعتماد حسابك',
      body: `تم اعتماد حسابك في بوابة استثمار المواقع الحكومية — ${DEPARTMENTS[emp.department as Department]}. يمكنك الآن تسجيل الدخول برقمك الوظيفي.`,
      link: '/login',
    });
  } else if (decision === 'reject') {
    if (reason.length < 3) return { error: 'الرجاء كتابة سبب الرفض' };
    const { error } = await db().from('employees').update({ status: 'rejected', reject_reason: reason }).eq('id', id);
    if (error) return { error: `تعذّر رفض الحساب: ${error.message}` };

    await notifyEmployee({
      employeeId: id,
      email: emp.email,
      title: 'تم رفض طلب إنشاء الحساب',
      body: `تم رفض طلب إنشاء حسابك. السبب: ${reason}`,
      link: '/login',
    });
  } else {
    return { error: 'قرار غير معروف' };
  }

  await logAudit({
    actorId: admin.id,
    actorName: admin.full_name,
    action: decision === 'approve' ? 'account_approved' : 'account_rejected',
    targetType: 'employee',
    targetId: id,
    meta: { reason: reason || null },
  });

  revalidatePath('/admin/employees/requests');
  revalidatePath('/admin/employees');
  return { ok: true, message: decision === 'approve' ? 'تم اعتماد الحساب.' : 'تم رفض الطلب.' };
}

/* ------------------------------------------------------ إنشاء موظف مباشرة */
async function createEmployeeActionImpl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const employeeNumber = String(formData.get('employee_number') ?? '').trim();
  const fullName = String(formData.get('full_name') ?? '').trim().replace(/\s+/g, ' ');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const department = String(formData.get('department') ?? '') as Department;
  const role = String(formData.get('role') ?? 'employee') as 'employee' | 'admin';
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('password_confirm') ?? '');

  const errors = [
    validateEmployeeNumber(employeeNumber),
    validateArabicTripleName(fullName),
    validateEmail(email),
    !DEPTS.includes(department) ? 'الرجاء اختيار القسم' : null,
    !ROLES.includes(role) ? 'الصلاحية غير معروفة' : null,
    role === 'admin' && department !== 'admin' ? 'مدير النظام يجب أن يكون ضمن إدارة النظام' : null,
    role === 'employee' && department === 'admin' ? 'موظف إدارة النظام يجب أن يحمل صلاحية مدير' : null,
    validatePassword(password),
    password !== confirm ? 'كلمتا المرور غير متطابقتين' : null,
  ].filter(Boolean) as string[];
  if (errors.length) return { error: errors[0] };

  const { data: existing } = await db()
    .from('employees')
    .select('id')
    .or(`employee_number.eq.${employeeNumber},email.eq.${email}`)
    .maybeSingle();
  if (existing) return { error: 'الرقم الوظيفي أو البريد الإلكتروني مسجّل مسبقاً' };

  const { data: created, error } = await db()
    .from('employees')
    .insert({
      employee_number: employeeNumber,
      full_name: fullName,
      email,
      department,
      role,
      status: 'active',
      approved_at: new Date().toISOString(),
      approved_by: admin.id,
      password_hash: await hashPassword(password),
    })
    .select('id')
    .single();

  if (error || !created) return { error: `تعذّر إنشاء الحساب: ${error?.message ?? ''}` };

  await notifyEmployee({
    employeeId: created.id,
    email,
    title: 'تم إنشاء حسابك',
    body: `تم إنشاء حساب لك في بوابة استثمار المواقع الحكومية — الرقم الوظيفي ${employeeNumber}. يمكنك تسجيل الدخول وتغيير كلمة المرور من خيار "نسيت كلمة المرور".`,
    link: '/login',
  });

  await logAudit({
    actorId: admin.id,
    actorName: admin.full_name,
    action: 'employee_created',
    targetType: 'employee',
    targetId: created.id,
    meta: { employeeNumber, department, role },
  });

  revalidatePath('/admin/employees');
  return { ok: true, message: 'تم إنشاء حساب الموظف وتفعيله.' };
}

/* --------------------------------------------------- تعديل بيانات الموظف */
async function updateEmployeeActionImpl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = String(formData.get('employee_id') ?? '');
  const adminPassword = String(formData.get('admin_password') ?? '');

  if (!(await confirmAdminPassword(admin.id, adminPassword)))
    return { error: 'كلمة مرور الأدمن غير صحيحة' };

  const fullName = String(formData.get('full_name') ?? '').trim().replace(/\s+/g, ' ');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const employeeNumber = String(formData.get('employee_number') ?? '').trim();
  const department = String(formData.get('department') ?? '') as Department;
  const role = String(formData.get('role') ?? 'employee') as 'employee' | 'admin';
  const status = String(formData.get('status') ?? 'active') as 'active' | 'disabled';

  const errors = [
    validateEmployeeNumber(employeeNumber),
    validateArabicTripleName(fullName),
    validateEmail(email),
    !DEPTS.includes(department) ? 'الرجاء اختيار القسم' : null,
    !ROLES.includes(role) ? 'الصلاحية غير معروفة' : null,
    role === 'admin' && department !== 'admin' ? 'مدير النظام يجب أن يكون ضمن إدارة النظام' : null,
    role === 'employee' && department === 'admin' ? 'موظف إدارة النظام يجب أن يحمل صلاحية مدير' : null,
    !STATUSES.includes(status) ? 'حالة الحساب غير معروفة' : null,
  ].filter(Boolean) as string[];
  if (errors.length) return { error: errors[0] };

  if (id === admin.id && (role !== 'admin' || status !== 'active'))
    return { error: 'لا يمكنك إزالة صلاحياتك أو إيقاف حسابك بنفسك' };

  const { error } = await db()
    .from('employees')
    .update({
      full_name: fullName,
      email,
      employee_number: employeeNumber,
      department,
      role,
      status,
    })
    .eq('id', id);

  if (error) return { error: `تعذّر التعديل: ${error.message}` };

  await logAudit({
    actorId: admin.id,
    actorName: admin.full_name,
    action: 'employee_updated',
    targetType: 'employee',
    targetId: id,
  });

  revalidatePath('/admin/employees');
  return { ok: true, message: 'تم حفظ بيانات الموظف.' };
}

/* ------------------------------------------------ تغيير كلمة مرور الموظف */
async function changeEmployeePasswordActionImpl(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = String(formData.get('employee_id') ?? '');
  const adminPassword = String(formData.get('admin_password') ?? '');
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('password_confirm') ?? '');

  if (!(await confirmAdminPassword(admin.id, adminPassword)))
    return { error: 'كلمة مرور الأدمن غير صحيحة' };

  const err = validatePassword(password) ?? (password !== confirm ? 'كلمتا المرور غير متطابقتين' : null);
  if (err) return { error: err };

  const { data: emp } = await db().from('employees').select('email').eq('id', id).maybeSingle();
  if (!emp) return { error: 'الموظف غير موجود' };

  const { error: updateError } = await db()
    .from('employees')
    .update({ password_hash: await hashPassword(password) })
    .eq('id', id);
  if (updateError) return { error: `تعذّر تغيير كلمة المرور: ${updateError.message}` };

  await notifyEmployee({
    employeeId: id,
    email: emp.email,
    title: 'تم تغيير كلمة المرور',
    body: 'قامت إدارة النظام بتغيير كلمة مرور حسابك. يُرجى تسجيل الدخول بكلمة المرور الجديدة.',
    link: '/login',
  });

  await logAudit({
    actorId: admin.id,
    actorName: admin.full_name,
    action: 'employee_password_changed',
    targetType: 'employee',
    targetId: id,
  });

  revalidatePath('/admin/employees');
  return { ok: true, message: 'تم تغيير كلمة المرور.' };
}

/* --------------------------------------------------------- حذف الموظف */
async function deleteEmployeeActionImpl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = String(formData.get('employee_id') ?? '');
  const adminPassword = String(formData.get('admin_password') ?? '');

  if (!(await confirmAdminPassword(admin.id, adminPassword)))
    return { error: 'كلمة مرور الأدمن غير صحيحة' };
  if (id === admin.id) return { error: 'لا يمكنك حذف حسابك الخاص' };

  const { data: emp } = await db()
    .from('employees')
    .select('full_name, employee_number')
    .eq('id', id)
    .maybeSingle();

  const { error } = await db().from('employees').delete().eq('id', id);
  if (error) return { error: `تعذّر الحذف: ${error.message}` };

  await logAudit({
    actorId: admin.id,
    actorName: admin.full_name,
    action: 'employee_deleted',
    targetType: 'employee',
    targetId: id,
    meta: emp ?? undefined,
  });

  revalidatePath('/admin/employees');
  return { ok: true, message: 'تم حذف الموظف.' };
}

/* --------------------------------------------------------- حذف طلب */
async function deleteRequestActionImpl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = String(formData.get('request_id') ?? '');
  const adminPassword = String(formData.get('admin_password') ?? '');

  if (!(await confirmAdminPassword(admin.id, adminPassword)))
    return { error: 'كلمة مرور الأدمن غير صحيحة' };

  const supa = db();
  const { data: request } = await supa
    .from('requests')
    .select('request_number, civil_number')
    .eq('id', id)
    .maybeSingle();
  if (!request) return { error: 'الطلب غير موجود' };

  const { data: files } = await supa.from('attachments').select('storage_path').eq('request_id', id);
  const { error } = await supa.from('requests').delete().eq('id', id);
  if (error) return { error: `تعذّر حذف الطلب: ${error.message}` };
  await deleteAttachments((files ?? []).map((f) => f.storage_path));

  await logAudit({
    actorId: admin.id,
    actorName: admin.full_name,
    action: 'request_deleted',
    targetType: 'request',
    targetId: id,
    meta: request,
  });

  revalidatePath('/admin/requests');

  const redirectTo = String(formData.get('redirect_to') ?? '');
  if (redirectTo.startsWith('/') && !redirectTo.startsWith('//')) redirect(redirectTo);

  return { ok: true, message: `تم حذف الطلب ${request.request_number} ومرفقاته.` };
}

/* تغليف إجراءات الأدمن برسائل خطأ واضحة */

export async function decideAccountAction(prev: ActionState, formData: FormData): Promise<ActionState> {
  return guard(() => decideAccountActionImpl(prev, formData));
}

export async function createEmployeeAction(prev: ActionState, formData: FormData): Promise<ActionState> {
  return guard(() => createEmployeeActionImpl(prev, formData));
}

export async function updateEmployeeAction(prev: ActionState, formData: FormData): Promise<ActionState> {
  return guard(() => updateEmployeeActionImpl(prev, formData));
}

export async function changeEmployeePasswordAction(prev: ActionState, formData: FormData): Promise<ActionState> {
  return guard(() => changeEmployeePasswordActionImpl(prev, formData));
}

export async function deleteEmployeeAction(prev: ActionState, formData: FormData): Promise<ActionState> {
  return guard(() => deleteEmployeeActionImpl(prev, formData));
}

export async function deleteRequestAction(prev: ActionState, formData: FormData): Promise<ActionState> {
  return guard(() => deleteRequestActionImpl(prev, formData));
}
