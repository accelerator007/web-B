export type Department = 'technical' | 'health' | 'finance' | 'investment' | 'admin';
export type RequestType = 'new' | 'renewal' | 'waiver' | 'cancellation';
export type RequestStatus =
  | 'pending_departments'
  | 'pending_finance'
  | 'pending_investment'
  | 'pending_payment'
  | 'approved'
  | 'rejected';

export const DEPARTMENTS: Record<Department, string> = {
  technical: 'قسم الشؤون الفنية',
  health: 'قسم الرقابة الغذائية والصحية',
  finance: 'قسم الشؤون المالية',
  investment: 'دائرة الاستثمار',
  admin: 'إدارة النظام',
};

export const REQUEST_TYPES: Record<RequestType, string> = {
  new: 'طلب استثمار موقع جديد',
  renewal: 'تجديد عقد استثمار سابق',
  waiver: 'تنازل عن موقع استثماري',
  cancellation: 'إلغاء عقد استثماري',
};

export const REQUEST_TYPE_SHORT: Record<RequestType, string> = {
  new: 'استثمار جديد',
  renewal: 'تجديد عقد',
  waiver: 'تنازل',
  cancellation: 'إلغاء عقد',
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  pending_departments: 'قيد الدراسة لدى الشؤون الفنية والرقابة الصحية',
  pending_finance: 'قيد الدراسة لدى الشؤون المالية',
  pending_investment: 'قيد الدراسة لدى دائرة الاستثمار',
  pending_payment: 'بانتظار استكمال الدفع لدى الشؤون المالية',
  approved: 'معتمد ومكتمل',
  rejected: 'مرفوض',
};

export const STATUS_COLORS: Record<RequestStatus, string> = {
  pending_departments: 'bg-amber-50 text-amber-800 ring-amber-200',
  pending_finance: 'bg-sky-50 text-sky-800 ring-sky-200',
  pending_investment: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  pending_payment: 'bg-orange-50 text-orange-800 ring-orange-200',
  approved: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-800 ring-rose-200',
};

export type AttachmentField = {
  key: string;
  label: string;
  hint: string;
  required: boolean;
};

/** المرفقات المطلوبة لكل نوع طلب */
export const ATTACHMENTS: Record<RequestType, AttachmentField[]> = {
  new: [
    { key: 'request_letter', label: 'رسالة الطلب', hint: 'ملف PDF أو صورة', required: true },
    { key: 'commercial_registration', label: 'السجل التجاري', hint: 'ملف PDF أو صورة', required: true },
    { key: 'site_concept', label: 'التصور المبدئي للموقع', hint: 'ملف PDF أو صورة', required: true },
  ],
  renewal: [
    { key: 'renewal_letter', label: 'خطاب طلب التجديد', hint: 'ملف PDF أو صورة', required: true },
    { key: 'previous_contract', label: 'نسخة من العقد السابق', hint: 'ملف PDF أو صورة', required: true },
  ],
  waiver: [
    { key: 'waiver_letter', label: 'رسالة التنازل', hint: 'ملف PDF أو صورة', required: true },
    { key: 'site_photo_after', label: 'صورة الموقع بعد الإخلاء', hint: 'صورة أو ملف PDF', required: true },
    { key: 'clearance', label: 'المخالصة المالية', hint: 'ملف PDF أو صورة', required: true },
  ],
  cancellation: [
    { key: 'cancellation_letter', label: 'رسالة إلغاء العقد', hint: 'ملف PDF أو صورة', required: true },
    { key: 'site_photo_after', label: 'صورة الموقع بعد الإخلاء', hint: 'صورة أو ملف PDF', required: true },
    { key: 'clearance', label: 'المخالصة المالية', hint: 'ملف PDF أو صورة', required: true },
  ],
};

export const ATTACHMENT_LABELS: Record<string, string> = Object.values(ATTACHMENTS)
  .flat()
  .reduce((acc, f) => ({ ...acc, [f.key]: f.label }), { final_contract: 'العقد المعتمد من دائرة الاستثمار' } as Record<string, string>);

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 ميجابايت
export const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
];

export const MIN_PASSWORD_LENGTH = 8;
