import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * عميل Supabase بصلاحية service_role — يعمل على الخادم فقط.
 * كل الجداول مفعّل عليها RLS بدون سياسات عامة، لذلك لا يمكن الوصول
 * للبيانات إلا من خلال هذا العميل داخل الخادم.
 */
let cached: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'إعدادات Supabase ناقصة: تأكد من NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في ملف .env.local'
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export const STORAGE_BUCKET = 'attachments';
