import 'server-only';
import { db } from './supabase';
import { sendEmail, emailTemplate } from './mail';
import { DEPARTMENTS, type Department } from './constants';

function appUrl(path = '') {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base}${path}`;
}

/**
 * إشعار كل موظفي قسم معيّن: يُنشئ إشعاراً داخل الموقع + يرسل بريداً إلكترونياً.
 */
export async function notifyDepartment(opts: {
  department: Department;
  title: string;
  body: string;
  requestId?: string;
  link?: string;
}) {
  const supa = db();
  const { data: employees } = await supa
    .from('employees')
    .select('id, email, full_name')
    .eq('department', opts.department)
    .eq('status', 'active');

  if (!employees?.length) return;

  const link = appUrl(opts.link || (opts.requestId ? `/dashboard/requests/${opts.requestId}` : '/dashboard'));

  for (const emp of employees) {
    const mail = await sendEmail({
      to: emp.email,
      subject: `[بلدية السويق] ${opts.title}`,
      html: emailTemplate(
        opts.title,
        [`مرحباً ${emp.full_name},`, opts.body, `الجهة: ${DEPARTMENTS[opts.department]}`],
        { label: 'فتح الطلب', url: link }
      ),
    });

    await supa.from('notifications').insert({
      employee_id: emp.id,
      request_id: opts.requestId ?? null,
      title: opts.title,
      body: opts.body,
      email_sent: mail.ok,
    });
  }
}

/** إشعار موظف واحد بعينه */
export async function notifyEmployee(opts: {
  employeeId: string;
  email?: string;
  title: string;
  body: string;
  requestId?: string;
  link?: string;
  sendMail?: boolean;
}) {
  const supa = db();
  let emailSent = false;

  if (opts.sendMail !== false && opts.email) {
    const res = await sendEmail({
      to: opts.email,
      subject: `[بلدية السويق] ${opts.title}`,
      html: emailTemplate(opts.title, [opts.body], {
        label: 'الدخول إلى البوابة',
        url: appUrl(opts.link || '/dashboard'),
      }),
    });
    emailSent = res.ok;
  }

  await supa.from('notifications').insert({
    employee_id: opts.employeeId,
    request_id: opts.requestId ?? null,
    title: opts.title,
    body: opts.body,
    email_sent: emailSent,
  });
}

/** إشعار جميع مديري النظام */
export async function notifyAdmins(opts: { title: string; body: string; link?: string }) {
  const supa = db();
  const { data: admins } = await supa
    .from('employees')
    .select('id, email, full_name')
    .eq('role', 'admin')
    .eq('status', 'active');

  for (const a of admins ?? []) {
    await notifyEmployee({
      employeeId: a.id,
      email: a.email,
      title: opts.title,
      body: opts.body,
      link: opts.link || '/admin',
    });
  }
}

export async function logAudit(opts: {
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
}) {
  await db().from('audit_log').insert({
    actor_id: opts.actorId ?? null,
    actor_name: opts.actorName ?? null,
    action: opts.action,
    target_type: opts.targetType ?? null,
    target_id: opts.targetId ?? null,
    meta: opts.meta ?? null,
  });
}
