'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * عميل Supabase في المتصفح — يُستخدم فقط لرفع المرفقات مباشرة إلى التخزين
 * عبر رابط رفع موقّع (Signed Upload URL) يُصدره الخادم.
 *
 * المفتاح المستخدم هنا هو المفتاح العام (anon) وهو غير حسّاس:
 * كل الجداول عليها RLS بدون سياسات، والـ bucket خاص — فلا يمنح هذا المفتاح
 * أي صلاحية قراءة أو كتابة بدون رابط موقّع من الخادم.
 */
let cached: SupabaseClient | null = null;

export function browserStorage(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error('إعدادات Supabase العامة ناقصة (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  }

  cached = createClient(url, anon, { auth: { persistSession: false } });
  return cached;
}
