import { ALLOWED_MIME, MAX_FILE_BYTES, MIN_PASSWORD_LENGTH } from './constants';

/** الرقم المدني: أرقام إنجليزية فقط (٥ إلى ١٥ خانة) */
export function validateCivilNumber(v: string): string | null {
  const value = (v || '').trim();
  if (!value) return 'الرقم المدني مطلوب';
  if (!/^[0-9]{5,15}$/.test(value))
    return 'الرقم المدني يجب أن يكون أرقاماً إنجليزية فقط (من ٥ إلى ١٥ خانة)';
  return null;
}

/** الاسم الثلاثي بالعربي: ثلاث كلمات عربية على الأقل */
export function validateArabicTripleName(v: string): string | null {
  const value = (v || '').trim().replace(/\s+/g, ' ');
  if (!value) return 'الاسم مطلوب';
  if (!/^[؀-ۿ\s]+$/.test(value)) return 'الاسم يجب أن يكون باللغة العربية فقط';
  if (value.split(' ').filter(Boolean).length < 3) return 'الرجاء إدخال الاسم الثلاثي كاملاً';
  return null;
}

/** رقم الهاتف: ٨ أرقام سلطنة عُمان، مع أو بدون مفتاح +968 */
export function validatePhone(v: string): string | null {
  const value = (v || '').trim().replace(/[\s-]/g, '');
  if (!value) return 'رقم الهاتف مطلوب';
  if (!/^(\+?968)?[79][0-9]{7}$/.test(value)) return 'رقم هاتف غير صحيح (مثال: 91234567)';
  return null;
}

export function normalizePhone(v: string) {
  return (v || '').trim().replace(/[\s-]/g, '').replace(/^\+?968/, '');
}

export function validatePassword(v: string): string | null {
  if (!v) return 'كلمة المرور مطلوبة';
  if (v.length < MIN_PASSWORD_LENGTH) return `كلمة المرور يجب ألا تقل عن ${MIN_PASSWORD_LENGTH} خانات`;
  if (!/^[A-Za-z0-9@#$%&*_.\-!]+$/.test(v)) return 'كلمة المرور تُكتب بأرقام أو حروف إنجليزية';
  return null;
}

export function validateEmail(v: string): string | null {
  if (!v) return 'البريد الإلكتروني مطلوب';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) return 'صيغة البريد الإلكتروني غير صحيحة';
  return null;
}

export function validateEmployeeNumber(v: string): string | null {
  const value = (v || '').trim();
  if (!value) return 'الرقم الوظيفي مطلوب';
  if (!/^[A-Za-z0-9\-]{3,20}$/.test(value)) return 'الرقم الوظيفي يجب أن يكون أرقاماً/حروفاً إنجليزية';
  return null;
}

export function validateFile(file: File | null, label: string, required = true): string | null {
  if (!file || file.size === 0) return required ? `${label}: المرفق مطلوب` : null;
  if (file.size > MAX_FILE_BYTES) return `${label}: حجم الملف يتجاوز ١٠ ميجابايت`;
  if (!ALLOWED_MIME.includes(file.type))
    return `${label}: صيغة غير مدعومة — يُقبل PDF أو صورة (JPG / PNG / WEBP)`;
  return null;
}

export function fileExtension(file: File) {
  const fromName = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  if (fromName) return fromName.replace(/[^a-z0-9]/g, '').slice(0, 5);
  return file.type === 'application/pdf' ? 'pdf' : 'jpg';
}
