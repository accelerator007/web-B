'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { PUBLIC_SITES_CACHE_TAG } from '@/lib/public-sites';
import { db } from '@/lib/supabase';
import { logAudit } from '@/lib/notify';

function optionalCoordinate(value: FormDataEntryValue | null, min: number, max: number) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw new Error('الإحداثيات غير صحيحة');
  return parsed;
}

export async function createAvailableSiteAction(formData: FormData) {
  const admin = await requireAdmin();
  const title = String(formData.get('title') ?? '').trim();
  const activityType = String(formData.get('activity_type') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const locationUrl = String(formData.get('location_url') ?? '').trim();
  if (title.length < 2 || title.length > 120) throw new Error('اسم الموقع غير صحيح');
  if (activityType.length > 120) throw new Error('نوع النشاط طويل جداً');
  if (description.length > 1000) throw new Error('وصف الموقع طويل جداً');
  const parsedUrl = new URL(locationUrl);
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('رابط الموقع غير صحيح');

  const { data, error } = await db().from('available_sites').insert({
    title,
    activity_type: activityType || null,
    description: description || null,
    location_url: locationUrl,
    latitude: optionalCoordinate(formData.get('latitude'), -90, 90),
    longitude: optionalCoordinate(formData.get('longitude'), -180, 180),
    is_published: true,
  }).select('id').single();
  if (error || !data) throw new Error(`تعذّر إضافة الموقع: ${error?.message ?? ''}`);
  await logAudit({ actorId: admin.id, actorName: admin.full_name, action: 'available_site_created', targetType: 'available_site', targetId: data.id });
  updateTag(PUBLIC_SITES_CACHE_TAG);
  revalidatePath('/sites');
  revalidatePath('/admin/sites');
}

export async function toggleAvailableSiteAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const publish = String(formData.get('publish') ?? '') === 'true';
  const { error } = await db().from('available_sites').update({ is_published: publish }).eq('id', id);
  if (error) throw new Error(`تعذّر تحديث الموقع: ${error.message}`);
  await logAudit({ actorId: admin.id, actorName: admin.full_name, action: publish ? 'available_site_published' : 'available_site_hidden', targetType: 'available_site', targetId: id });
  updateTag(PUBLIC_SITES_CACHE_TAG);
  revalidatePath('/sites');
  revalidatePath('/admin/sites');
}

export async function deleteAvailableSiteAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const { error } = await db().from('available_sites').delete().eq('id', id);
  if (error) throw new Error(`تعذّر حذف الموقع: ${error.message}`);
  await logAudit({ actorId: admin.id, actorName: admin.full_name, action: 'available_site_deleted', targetType: 'available_site', targetId: id });
  updateTag(PUBLIC_SITES_CACHE_TAG);
  revalidatePath('/sites');
  revalidatePath('/admin/sites');
}
