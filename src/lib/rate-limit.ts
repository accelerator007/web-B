import 'server-only';
import { createHash } from 'crypto';
import { headers } from 'next/headers';
import { db } from './supabase';

export async function consumeRateLimit(scope: string, maxRequests: number, windowSeconds: number) {
  const h = headers();
  const raw = h.get('x-nf-client-connection-ip') || h.get('cf-connecting-ip') || h.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const salt = process.env.SESSION_SECRET || 'local-rate-limit';
  const key = `${scope}:${createHash('sha256').update(`${salt}:${raw.trim()}`).digest('hex')}`;
  const { data, error } = await db().rpc('consume_rate_limit', { p_key: key, p_window_seconds: windowSeconds, p_max_requests: maxRequests });
  return !error && data === true;
}

export function isSpam(formData: FormData) {
  return Boolean(String(formData.get('website') ?? '').trim());
}
