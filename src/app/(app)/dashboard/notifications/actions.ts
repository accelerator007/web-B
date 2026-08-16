'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/supabase';

export async function markAllReadAction() {
  const user = await requireUser();
  await db()
    .from('notifications')
    .update({ is_read: true })
    .eq('employee_id', user.id)
    .eq('is_read', false);

  revalidatePath('/dashboard/notifications');
  revalidatePath('/dashboard');
}
