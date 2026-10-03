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
  technical: 'قسم الرقابة والتراخيص الصحية',
  health: 'قسم الرقابة والتراخيص الغذائية',
  finance: 'قسم الشؤون الإدارية والمالية',
  investment: 'قسم الاستثمار وتنمية الإيرادات',
  admin: 'إدارة النظام',
};

export const REQUEST_TYPES: Record<RequestType, string> = {
  new: 'طلب إيجار موقع جديد',
  renewal: 'تجديد عقد إيجار سابق',
  waiver: 'تنازل عن موقع مؤجر',
  cancellation: 'إلغاء عقد إيجار',
};

export const REQUEST_TYPE_SHORT: Record<RequestType, string> = {
  new: 'إيجار جديد',
  renewal: 'تجديد عقد',
  waiver: 'تنازل',
  cancellation: 'إلغاء عقد',
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  pending_departments: 'قيد الدراسة لدى الرقابة والتراخيص الصحية والغذائية',
  pending_finance: 'قيد الدراسة لدى الشؤون الإدارية والمالية',
  pending_investment: 'قيد الدراسة لدى قسم الاستثمار وتنمية الإيرادات',
  pending_payment: 'بانتظار استكمال الدفع لدى الشؤون الإدارية والمالية',
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
    { key: 'license', label: 'الترخيص', hint: 'نسخة من الترخيص بصيغة PDF أو صورة', required: true },
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
  .reduce((acc, f) => ({ ...acc, [f.key]: f.label }), { final_contract: 'العقد المعتمد من قسم الاستثمار وتنمية الإيرادات' } as Record<string, string>);

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
