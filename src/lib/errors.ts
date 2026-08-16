import 'server-only';

/** أخطاء داخلية من Next (redirect / notFound) يجب تمريرها كما هي */
export function isFrameworkError(e: unknown): boolean {
  const digest = (e as { digest?: unknown })?.digest;
  return (
    typeof digest === 'string' &&
    (digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_NOT_FOUND'))
  );
}

/** تحويل الخطأ التقني إلى رسالة عربية مفهومة للمستخدم */
export function friendlyError(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e);

  if (message.includes('SESSION_SECRET'))
    return 'إعدادات الخادم ناقصة: SESSION_SECRET غير معرّف. راجع متغيّرات البيئة في إعدادات الاستضافة.';
  if (message.includes('Supabase') || message.includes('SUPABASE'))
    return 'تعذّر الاتصال بقاعدة البيانات: متغيّرات Supabase غير مضبوطة في إعدادات الاستضافة.';
  if (message.includes('fetch failed') || message.includes('ENOTFOUND') || message.includes('ETIMEDOUT'))
    return 'تعذّر الوصول إلى قاعدة البيانات، تحقّق من الاتصال ثم حاول مرة أخرى.';

  console.error('[خطأ غير متوقع]', e);
  return `حدث خطأ غير متوقع: ${message}`;
}

/**
 * تغليف إجراءات الخادم: أي خطأ يُعاد كرسالة داخل النموذج
 * بدل أن يسقط الصفحة بشاشة "Application error".
 */
export async function guard<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    if (isFrameworkError(e)) throw e;
    return { error: friendlyError(e) };
  }
}
