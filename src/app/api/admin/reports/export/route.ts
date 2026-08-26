import { NextResponse } from 'next/server';
import { getActiveSession } from '@/lib/auth';
import { db } from '@/lib/supabase';
import { REQUEST_TYPE_SHORT, STATUS_LABELS } from '@/lib/constants';
import type { RequestRow } from '@/lib/types';

const csv = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
export async function GET() {
  const user = await getActiveSession();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'غير مصرّح' }, { status: 403 });
  const { data } = await db().from('requests').select('*').order('created_at', { ascending: false });
  const head = ['رقم الطلب','النوع','الاسم','الرقم المدني','الهاتف','الحالة','رابط الموقع','تاريخ التقديم','آخر تحديث'];
  const lines = [head, ...((data ?? []) as RequestRow[]).map(r => [r.request_number,REQUEST_TYPE_SHORT[r.type],r.full_name,r.civil_number,r.phone,STATUS_LABELS[r.status],r.site_location_url,r.created_at,r.updated_at])];
  return new NextResponse('\ufeff'+lines.map(row=>row.map(csv).join(',')).join('\r\n'), { headers: { 'Content-Type':'text/csv; charset=utf-8', 'Content-Disposition':`attachment; filename="requests-${new Date().toISOString().slice(0,10)}.csv"`, 'Cache-Control':'private, no-store' } });
}
