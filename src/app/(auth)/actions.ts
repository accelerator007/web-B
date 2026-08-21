'use server';

import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/supabase';
import { createSession, destroySession, hashPassword, verifyPassword } from '@/lib/auth';
import { notifyAdmins, notifyEmployee, logAudit } from '@/lib/notify';
import { sendEmail, emailTemplate } from '@/lib/mail';
import { DEPARTMENTS, type Department } from '@/lib/constants';
import {
  validateArabicTripleName,
  validateEmail,
  validateEmployeeNumber,
  validatePassword,
} from '@/lib/validation';
import { guard } from '@/lib/errors';
import type { ActionState } from '@/lib/types';
import { consumeRateLimit, isSpam } from '@/lib/rate-limit';

/* ------------------------------------------------------------------ الدخول */
async function loginActionImpl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (isSpam(formData) || !(await consumeRateLimit('login', 10, 900))) return { error: 'محاولات كثيرة، حاول لاحقاً' };
  const employeeNumber = String(formData.get('employee_number') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!employeeNumber || !password) return { error: 'الرجاء إدخال الرقم الوظيفي وكلمة المرور' };

  const { data: emp } = await db()
    .from('employees')
    .select('*')
    .eq('employee_number', employeeNumber)
    .maybeSingle();

  if (!emp) return { error: 'الرقم الوظيفي أو كلمة المرور غير صحيحة' };

  const okPassword = await verifyPassword(password, emp.password_hash);
  if (!okPassword) return { error: 'الرقم الوظيفي أو كلمة المرور غير صحيحة' };

  if (emp.status === 'pending')
    return { error: 'حسابك قيد المراجعة من إدارة النظام، سيصلك إشعار عند اعتماده.' };
  if (emp.status === 'rejected')
    return { error: `تم رفض طلب إنشاء الحساب. ${emp.reject_reason ? `السبب: ${emp.reject_reason}` : ''}` };
  if (emp.status === 'disabled') return { error: 'الحساب موقوف، يرجى مراجعة إدارة النظام.' };

  await createSession({
    id: emp.id,
    employee_number: emp.employee_number,
    full_name: emp.full_name,
    email: emp.email,
    department: emp.department as Department,
    role: emp.role,
  });

  await db().from('employees').update({ last_login_at: new Date().toISOString() }).eq('id', emp.id);

  redirect(emp.role === 'admin' ? '/admin' : '/dashboard');
}

export async function logoutAction() {
  destroySession();
  redirect('/login');
}

/* -------------------------------------------------------- طلب إنشاء حساب */
async function registerActionImpl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (isSpam(formData) || !(await consumeRateLimit('register', 5, 3600))) return { error: 'تعذّر إرسال الطلب، حاول لاحقاً' };
  const employeeNumber = String(formData.get('employee_number') ?? '').trim();
  const fullName = String(formData.get('full_name') ?? '').trim().replace(/\s+/g, ' ');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const department = String(formData.get('department') ?? '') as Department;
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('password_confirm') ?? '');

  const errors = [
    validateEmployeeNumber(employeeNumber),
    validateArabicTripleName(fullName),
    validateEmail(email),
    !['technical', 'health', 'finance', 'investment'].includes(department) ? 'الرجاء اختيار القسم' : null,
    validatePassword(password),
    password !== confirm ? 'كلمتا المرور غير متطابقتين' : null,
  ].filter(Boolean) as string[];

  if (errors.length) return { error: errors[0] };

  const supa = db();
  const { data: existing } = await supa
    .from('employees')
    .select('id, employee_number, email')
    .or(`employee_number.eq.${employeeNumber},email.eq.${email}`)
    .maybeSingle();

  if (existing) return { error: 'الرقم الوظيفي أو البريد الإلكتروني مسجّل مسبقاً' };

  const { data: created, error } = await supa
    .from('employees')
    .insert({
      employee_number: employeeNumber,
      full_name: fullName,
      email,
      department,
      role: 'employee',
      status: 'pending',
      password_hash: await hashPassword(password),
    })
    .select('id')
    .single();

  if (error || !created) return { error: `تعذّر إنشاء الطلب: ${error?.message ?? ''}` };

  await notifyAdmins({
    title: 'طلب إنشاء حساب موظف جديد',
    body: `${fullName} — الرقم الوظيفي ${employeeNumber} — ${DEPARTMENTS[department]} — ${email}`,
    link: '/admin/employees/requests',
  });

  await logAudit({
    actorName: fullName,
    action: 'account_requested',
    targetType: 'employee',
    targetId: created.id,
    meta: { employeeNumber, department },
  });

  return {
    ok: true,
    message:
      'تم إرسال طلب إنشاء الحساب إلى إدارة النظام. سيصلك إشعار على بريدك الإلكتروني فور اعتماد الحساب.',
  };
}

/* ------------------------------------------- نسيت كلمة المرور — إرسال OTP */
async function requestOtpActionImpl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (isSpam(formData) || !(await consumeRateLimit('otp-request', 5, 3600))) return { error: 'محاولات كثيرة، حاول لاحقاً' };
  const identifier = String(formData.get('identifier') ?? '').trim();
  if (!identifier) return { error: 'أدخل الرقم الوظيفي أو البريد الإلكتروني' };

  const supa = db();
  const { data: emp } = await supa
    .from('employees')
    .select('id, full_name, email, employee_number, status')
    .or(`employee_number.eq.${identifier},email.eq.${identifier.toLowerCase()}`)
    .maybeSingle();

  // رسالة موحّدة حتى لا يُكشف وجود الحساب من عدمه
  const generic: ActionState = {
    ok: true,
    message: 'إذا كان الحساب موجوداً فقد أُرسل رمز التحقق (OTP) إلى البريد الإلكتروني المسجّل.',
  };

  if (!emp || emp.status === 'rejected') return generic;

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await bcrypt.hash(code, 8);

  await supa.from('otp_codes').insert({
    employee_id: emp.id,
    code_hash: codeHash,
    purpose: 'password_reset',
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  await sendEmail({
    to: emp.email,
    subject: '[بلدية السويق] رمز إعادة تعيين كلمة المرور',
    html: emailTemplate('رمز إعادة تعيين كلمة المرور', [
      `مرحباً ${emp.full_name},`,
      'رمز التحقق الخاص بك هو:',
      `<div style="font-size:30px;font-weight:bold;letter-spacing:8px;direction:ltr;text-align:center;background:#f1f5f9;padding:14px;border-radius:10px;margin:10px 0">${code}</div>`,
      'الرمز صالح لمدة ١٠ دقائق. إذا لم تطلب ذلك، تجاهل هذه الرسالة.',
    ]),
  });

  return { ...generic, ok: true };
}

/* ------------------------------------- التحقق من OTP وتعيين كلمة مرور جديدة */
async function resetPasswordActionImpl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await consumeRateLimit('otp-verify', 10, 900))) return { error: 'محاولات كثيرة، حاول لاحقاً' };
  const identifier = String(formData.get('identifier') ?? '').trim();
  const code = String(formData.get('code') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('password_confirm') ?? '');

  const errors = [
    !identifier ? 'أدخل الرقم الوظيفي أو البريد الإلكتروني' : null,
    !/^[0-9]{6}$/.test(code) ? 'رمز التحقق يتكون من ٦ أرقام' : null,
    validatePassword(password),
    password !== confirm ? 'كلمتا المرور غير متطابقتين' : null,
  ].filter(Boolean) as string[];
  if (errors.length) return { error: errors[0] };

  const supa = db();
  const { data: emp } = await supa
    .from('employees')
    .select('id, email, full_name')
    .or(`employee_number.eq.${identifier},email.eq.${identifier.toLowerCase()}`)
    .maybeSingle();

  if (!emp) return { error: 'رمز التحقق غير صحيح أو منتهي الصلاحية' };

  const { data: otp } = await supa
    .from('otp_codes')
    .select('*')
    .eq('employee_id', emp.id)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp || new Date(otp.expires_at) < new Date())
    return { error: 'رمز التحقق غير صحيح أو منتهي الصلاحية' };
  if (otp.attempts >= 5) return { error: 'تم تجاوز عدد المحاولات، اطلب رمزاً جديداً' };

  const match = await bcrypt.compare(code, otp.code_hash);
  if (!match) {
    await supa.from('otp_codes').update({ attempts: otp.attempts + 1 }).eq('id', otp.id);
    return { error: 'رمز التحقق غير صحيح' };
  }

  await supa.from('employees').update({ password_hash: await hashPassword(password) }).eq('id', emp.id);
  await supa.from('otp_codes').update({ used_at: new Date().toISOString() }).eq('id', otp.id);

  await notifyEmployee({
    employeeId: emp.id,
    email: emp.email,
    title: 'تم تغيير كلمة المرور',
    body: 'تم تغيير كلمة مرور حسابك بنجاح. إذا لم تقم بذلك، راجع إدارة النظام فوراً.',
    link: '/login',
  });

  await logAudit({ actorId: emp.id, actorName: emp.full_name, action: 'password_reset_otp' });

  return { ok: true, message: 'تم تعيين كلمة المرور الجديدة بنجاح، يمكنك الآن تسجيل الدخول.' };
}


/* ------------------------------------------------------------------------
   تغليف الإجراءات: أي خطأ (إعدادات ناقصة، انقطاع اتصال…) يظهر كرسالة
   عربية داخل النموذج بدل شاشة الخطأ البيضاء.
------------------------------------------------------------------------ */
export async function loginAction(prev: ActionState, formData: FormData): Promise<ActionState> {
  return guard(() => loginActionImpl(prev, formData));
}

export async function registerAction(prev: ActionState, formData: FormData): Promise<ActionState> {
  return guard(() => registerActionImpl(prev, formData));
}

export async function requestOtpAction(prev: ActionState, formData: FormData): Promise<ActionState> {
  return guard(() => requestOtpActionImpl(prev, formData));
}

export async function resetPasswordAction(prev: ActionState, formData: FormData): Promise<ActionState> {
  return guard(() => resetPasswordActionImpl(prev, formData));
}
