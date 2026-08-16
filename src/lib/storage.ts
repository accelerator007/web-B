import 'server-only';
import { db, STORAGE_BUCKET } from './supabase';

/**
 * أين تُحفظ الملفات والصور؟
 * ➜ في Supabase Storage، داخل bucket خاص (غير عام) اسمه "attachments".
 *
 * آلية الرفع:
 *  ١) الخادم يُصدر رابط رفع موقّعاً (Signed Upload URL) لمسار مؤقت تحت pending/
 *  ٢) المتصفح يرفع الملف مباشرة إلى Supabase (لا تمر بايتات الملف عبر الخادم،
 *     وبذلك لا نصطدم بحدود حجم الطلب في منصات الاستضافة مثل Netlify)
 *  ٣) عند حفظ الطلب يتحقق الخادم من الملف (وجوده وحجمه ونوعه) ثم ينقله إلى
 *     requests/<request_id>/... ويحفظ المسار في جدول attachments
 *  ٤) الفتح لاحقاً يتم برابط موقّع مؤقت للموظفين المصرّح لهم فقط
 */

/** إصدار رابط رفع موقّع لمسار مؤقت */
export async function createUploadTicket(fieldKey: string, extension: string) {
  const safeField = fieldKey.replace(/[^a-z_]/gi, '').slice(0, 40) || 'file';
  const safeExt = extension.replace(/[^a-z0-9]/gi, '').slice(0, 5).toLowerCase() || 'bin';
  const path = `pending/${crypto.randomUUID()}/${safeField}.${safeExt}`;

  const { data, error } = await db().storage.from(STORAGE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`تعذّر تجهيز رابط الرفع: ${error?.message ?? ''}`);

  return { path: data.path, token: data.token };
}

/** قراءة بيانات ملف مرفوع للتحقق منه على الخادم */
export async function statObject(path: string) {
  const parts = path.split('/');
  const name = parts.pop()!;
  const dir = parts.join('/');

  const { data } = await db().storage.from(STORAGE_BUCKET).list(dir, { limit: 100, search: name });
  const item = data?.find((f) => f.name === name);
  if (!item) return null;

  const meta = (item.metadata ?? {}) as { size?: number; mimetype?: string };
  return { size: meta.size ?? 0, mime: meta.mimetype ?? '' };
}

/** نقل المرفق من المسار المؤقت إلى مجلد الطلب */
export async function moveAttachment(from: string, to: string) {
  const { error } = await db().storage.from(STORAGE_BUCKET).move(from, to);
  return !error;
}

/** رابط مؤقت لعرض/تحميل المرفق (صالح لمدة ١٠ دقائق افتراضياً) */
export async function signedUrl(path: string, expiresInSeconds = 600) {
  const { data, error } = await db()
    .storage.from(STORAGE_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function deleteAttachments(paths: string[]) {
  if (!paths.length) return;
  await db().storage.from(STORAGE_BUCKET).remove(paths);
}
