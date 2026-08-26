import 'server-only';

/**
 * إرسال البريد الإلكتروني.
 * - إذا وُجد RESEND_API_KEY يُرسل فعلياً عبر Resend.
 * - إذا لم يوجد، يستمر النظام دون إرسال. في التطوير فقط يُطبع المحتوى للمساعدة
 *   في اختبار رموز OTP، ولا يُطبع المحتوى الحساس في سجل الإنتاج.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || 'بلدية السويق <onboarding@resend.dev>';

  if (!key) {
    console.log('\n📧 [بريد غير مُرسل — RESEND_API_KEY غير معرّف]');
    console.log('   إلى:', opts.to);
    console.log('   الموضوع:', opts.subject);
    if (process.env.NODE_ENV !== 'production') {
      console.log('   المحتوى:', opts.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), '\n');
    }
    return { ok: false, error: 'mail_not_configured' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('فشل إرسال البريد:', text);
      return { ok: false, error: text };
    }
    return { ok: true };
  } catch (e) {
    console.error('خطأ في إرسال البريد:', e);
    return { ok: false, error: String(e) };
  }
}

export function emailTemplate(title: string, lines: string[], cta?: { label: string; url: string }) {
  return `
  <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;background:#f4f6f5;padding:24px">
    <div style="max-width:560px;margin:auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:#1e553b;color:#fff;padding:18px 22px">
        <div style="font-size:17px;font-weight:bold">دائرة البلدية بالسويق</div>
        <div style="font-size:12px;opacity:.85">بوابة استثمار المواقع الحكومية</div>
      </div>
      <div style="padding:22px;color:#111827">
        <h2 style="margin:0 0 12px;font-size:18px">${title}</h2>
        ${lines.map((l) => `<p style="margin:6px 0;font-size:14px;line-height:1.9;color:#374151">${l}</p>`).join('')}
        ${
          cta
            ? `<p style="margin-top:20px"><a href="${cta.url}" style="background:#2f855a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;display:inline-block">${cta.label}</a></p>`
            : ''
        }
      </div>
      <div style="padding:14px 22px;background:#f9fafb;color:#6b7280;font-size:11px;border-top:1px solid #e5e7eb">
        هذه رسالة آلية من نظام بوابة الاستثمار، الرجاء عدم الرد عليها.
      </div>
    </div>
  </div>`;
}
