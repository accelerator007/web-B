import 'server-only';
import { db } from './supabase';
import type { NotificationRow } from './types';

export async function listNotifications(employeeId: string, limit = 50) {
  const { data } = await db()
    .from('notifications')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as NotificationRow[];
}

export async function countUnread(employeeId: string) {
  const { count } = await db()
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('employee_id', employeeId)
    .eq('is_read', false);
  return count ?? 0;
}

/** عند فتح الطلب تُعتبر إشعاراته مقروءة */
export async function markRequestNotificationsRead(employeeId: string, requestId: string) {
  await db()
    .from('notifications')
    .update({ is_read: true })
    .eq('employee_id', employeeId)
    .eq('request_id', requestId)
    .eq('is_read', false);
}
