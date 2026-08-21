'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { createUploadTicket, deleteAttachments, inspectObject } from '@/lib/storage';
import { moveAttachment } from '@/lib/storage';
import { notifyDepartment } from '@/lib/notify';
import {
  ALLOWED_MIME,
  ATTACHMENTS,
  MAX_FILE_BYTES,
  REQUEST_TYPES,
  type RequestType,
} from '@/lib/constants';
import {
  normalizePhone,
  validateArabicTripleName,
  validateCivilNumber,
  validatePhone,
} from '@/lib/validation';
import { guard } from '@/lib/errors';
import type { ActionState } from '@/lib/types';
import { consumeRateLimit, isSpam } from '@/lib/rate-limit';

/**
 * الخطوة ١ من الرفع: المتصفح يطلب رابط رفع موقّعاً لملف واحد.
 * الملف نفسه يذهب مباشرة إلى Supabase Storage ولا يمر عبر الخادم.
 */
export async function createUploadTicketAction(input: {
  type: RequestType;
  fieldKey: string;
  fileName: string;
  mimeType: string;
  size: number;
}): Promise<{ path?: string; token?: string; error?: string }> {
  if (!(await consumeRateLimit('upload-ticket', 30, 3600))) return { error: 'طلبات رفع كثيرة، حاول لاحقاً' };
  const fields = ATTACHMENTS[input.type];
  if (!fields?.some((f) => f.key === input.fieldKey)) return { error: 'حقل مرفق غير معروف' };
  if (!ALLOWED_MIME.includes(input.mimeType))
    return { error: 'صيغة غير مدعومة — يُقبل PDF أو صورة (JPG / PNG / WEBP)' };
  if (input.size <= 0 || input.size > MAX_FILE_BYTES) return { error: 'حجم الملف يتجاوز ١٠ ميجابايت' };

  const ext = input.fileName.includes('.')
    ? input.fileName.split('.').pop()!
    : input.mimeType === 'application/pdf'
    ? 'pdf'
    : 'jpg';

  try {
    const ticket = await createUploadTicket(input.fieldKey, ext);
    return ticket;
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'تعذّر تجهيز رابط الرفع' };
  }
}

/** الخطوة ٢: حفظ الطلب بعد اكتمال رفع المرفقات */
async function submitRequestImpl(
  type: RequestType,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (isSpam(formData) || !(await consumeRateLimit('public-application', 5, 3600))) return { error: 'تعذّر تقديم الطلب الآن، حاول لاحقاً' };
  const civil = String(formData.get('civil_number') ?? '').trim();
  const name = String(formData.get('full_name') ?? '').trim().replace(/\s+/g, ' ');
  const phoneRaw = String(formData.get('phone') ?? '');
  const locationUrl = String(formData.get('site_location_url') ?? '').trim();
  const latitude = Number(formData.get('site_latitude'));
  const longitude = Number(formData.get('site_longitude'));
  const notes = String(formData.get('citizen_notes') ?? '').trim();

  const fields = ATTACHMENTS[type];
  if (!fields) return { error: 'نوع الطلب غير معروف' };

  const errors = [
    validateCivilNumber(civil),
    validateArabicTripleName(name),
    validatePhone(phoneRaw),
  ].filter(Boolean) as string[];
  if (errors.length) return { error: errors[0] };
  try {
    const parsed = new URL(locationUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error();
  } catch {
    return { error: 'الرجاء إدخال رابط صحيح لموقع المكان' };
  }

  // التحقق من كل مرفق فعلياً في التخزين (لا نثق ببيانات المتصفح)
  const uploads: { fieldKey: string; path: string; fileName: string; size: number; mime: string }[] = [];

  for (const f of fields) {
    const path = String(formData.get(`${f.key}__path`) ?? '').trim();
    const fileName = String(formData.get(`${f.key}__name`) ?? '').trim() || 'attachment';

    if (!path) return { error: `${f.label}: المرفق مطلوب` };
    if (!path.startsWith('pending/')) return { error: `${f.label}: مسار المرفق غير صالح` };

    const info = await inspectObject(path);
    if (!info) return { error: `${f.label}: لم يكتمل رفع الملف، حاول مرة أخرى` };
    if (info.size > MAX_FILE_BYTES) return { error: `${f.label}: حجم الملف يتجاوز ١٠ ميجابايت` };
    if (!info.mime || !ALLOWED_MIME.includes(info.mime))
      return { error: `${f.label}: محتوى الملف لا يطابق PDF أو صورة مسموحة` };

    uploads.push({ fieldKey: f.key, path, fileName, size: info.size, mime: info.mime });
  }

  const supa = db();

  const { data: numberData, error: numberError } = await supa.rpc('next_request_number');
  if (numberError || !numberData) return { error: 'تعذّر إنشاء رقم الطلب، حاول مرة أخرى.' };
  const requestNumber = String(numberData);

  const { data: inserted, error: insertError } = await supa
    .from('requests')
    .insert({
      request_number: requestNumber,
      type,
      civil_number: civil,
      full_name: name,
      phone: normalizePhone(phoneRaw),
      site_location_url: locationUrl,
      site_latitude: Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 ? latitude : null,
      site_longitude: Number.isFinite(longitude) && longitude >= -180 && longitude <= 180 ? longitude : null,
      citizen_notes: notes || null,
      status: 'pending_departments',
    })
    .select('id, request_number')
    .single();

  if (insertError || !inserted) {
    return { error: `تعذّر حفظ الطلب: ${insertError?.message ?? 'خطأ غير معروف'}` };
  }

  // نقل المرفقات من المسار المؤقت إلى مجلد الطلب وتسجيلها
  try {
    for (const u of uploads) {
      const ext = u.path.split('.').pop() ?? 'bin';
      const target = `requests/${inserted.id}/${u.fieldKey}-${crypto.randomUUID()}.${ext}`;
      const moved = await moveAttachment(u.path, target);

      await supa.from('attachments').insert({
        request_id: inserted.id,
        field_key: u.fieldKey,
        file_name: u.fileName,
        storage_path: moved ? target : u.path,
        mime_type: u.mime || null,
        size_bytes: u.size,
      });
    }
  } catch (e) {
    await supa.from('requests').delete().eq('id', inserted.id);
    await deleteAttachments(uploads.map((u) => u.path));
    return { error: e instanceof Error ? e.message : 'تعذّر حفظ المرفقات' };
  }

  await supa.from('reviews').insert({
    request_id: inserted.id,
    department: 'citizen',
    action: 'submitted',
    notes: `تم تقديم ${REQUEST_TYPES[type]} من المواطن`,
    employee_name: name,
    employee_number: civil,
  });

  // إشعار القسمين داخل الموقع + بريد إلكتروني
  const body = `وصل طلب جديد (${REQUEST_TYPES[type]}) برقم ${requestNumber} من ${name} — الرقم المدني ${civil}.`;
  await notifyDepartment({
    department: 'technical',
    title: 'طلب جديد بانتظار الدراسة',
    body,
    requestId: inserted.id,
  });
  await notifyDepartment({
    department: 'health',
    title: 'طلب جديد بانتظار الدراسة',
    body,
    requestId: inserted.id,
  });

  redirect(`/apply/success?no=${encodeURIComponent(requestNumber)}&civil=${encodeURIComponent(civil)}`);
}


export async function submitRequest(
  type: RequestType,
  prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  return guard(() => submitRequestImpl(type, prev, formData));
}
