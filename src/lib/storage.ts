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

/** يفحص بصمة الملف الحقيقية؛ لا يثق بالامتداد أو Content-Type المرسل من المتصفح. */
export async function inspectObject(path: string) {
  const stat = await statObject(path);
  if (!stat) return null;
  const { data, error } = await db().storage.from(STORAGE_BUCKET).download(path);
  if (error || !data) return null;
  const bytes = new Uint8Array(await data.slice(0, 32).arrayBuffer());
  const ascii = String.fromCharCode(...Array.from(bytes));
  let mime = '';
  if (ascii.startsWith('%PDF-')) mime = 'application/pdf';
  else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) mime = 'image/jpeg';
  else if ([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((v, i) => bytes[i] === v)) mime = 'image/png';
  else if (ascii.slice(0, 4) === 'RIFF' && ascii.slice(8, 12) === 'WEBP') mime = 'image/webp';
  else if (ascii.slice(4, 8) === 'ftyp' && /heic|heix|hevc|hevx|mif1|msf1/.test(ascii.slice(8, 24))) mime = 'image/heic';
  return { size: data.size || stat.size, mime };
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
