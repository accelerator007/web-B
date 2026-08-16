import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * فحص جاهزية النظام — افتح /api/health بعد النشر.
 * يعرض حالة الإعدادات (موجود / ناقص) دون كشف أي قيمة سرّية.
 */
export async function GET() {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    SESSION_SECRET: (process.env.SESSION_SECRET ?? '').length >= 16,
    RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
    NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL),
  };

  const missing = Object.entries(env)
    .filter(([key, ok]) => !ok && key !== 'RESEND_API_KEY')
    .map(([key]) => key);

  let database: string;
  let admins = 0;

  try {
    const { count, error } = await db()
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('status', 'active');

    if (error) {
      database = `خطأ: ${error.message}`;
    } else {
      database = 'متصل ✓';
      admins = count ?? 0;
    }
  } catch (e) {
    database = `غير متصل: ${e instanceof Error ? e.message : 'خطأ غير معروف'}`;
  }

  const ready = missing.length === 0 && database === 'متصل ✓' && admins > 0;

  return NextResponse.json(
    {
      ready,
      الحالة: ready
        ? 'النظام جاهز للاستخدام'
        : missing.length
        ? 'متغيّرات بيئة ناقصة في إعدادات الاستضافة'
        : admins === 0
        ? 'قاعدة البيانات متصلة لكن لا يوجد حساب مدير نظام — شغّل supabase/create-admin.sql'
        : 'راجع تفاصيل قاعدة البيانات أدناه',
      المتغيّرات_الناقصة: missing,
      قاعدة_البيانات: database,
      عدد_مديري_النظام: admins,
      الإعدادات: env,
      البريد: env.RESEND_API_KEY ? 'مفعّل' : 'غير مفعّل (الرسائل تُطبع في السجل)',
    },
    { status: ready ? 200 : 503 }
  );
}
