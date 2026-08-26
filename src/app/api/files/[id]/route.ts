import { NextResponse } from 'next/server';
import { getActiveSession } from '@/lib/auth';
import { db } from '@/lib/supabase';
import { signedUrl } from '@/lib/storage';
import { canViewRequest } from '@/lib/workflow';
import { logAudit } from '@/lib/notify';

/**
 * فتح مرفق: متاح للموظفين المسجّلين فقط.
 * يُنشئ رابطاً موقّعاً مؤقتاً من Supabase Storage ثم يحوّل المستخدم إليه.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
  }

  const { data: attachment } = await db()
    .from('attachments')
    .select('id, request_id, storage_path, file_name, mime_type, requests(*)')
    .eq('id', id)
    .maybeSingle();

  if (!attachment) {
    return NextResponse.json({ error: 'المرفق غير موجود' }, { status: 404 });
  }
  const requestRow = Array.isArray(attachment.requests) ? attachment.requests[0] : attachment.requests;
  if (!requestRow || !canViewRequest(session, requestRow)) {
    return NextResponse.json({ error: 'غير مصرّح بفتح هذا المرفق' }, { status: 403 });
  }

  const download = new URL(req.url).searchParams.get('download') === '1';
  await logAudit({
    actorId: session.id,
    actorName: session.full_name,
    action: download ? 'attachment_downloaded' : 'attachment_opened',
    targetType: 'attachment',
    targetId: attachment.id,
    meta: { requestId: attachment.request_id, fileName: attachment.file_name, employeeNumber: session.employee_number },
  });

  const url = await signedUrl(attachment.storage_path, 300);
  if (!url) {
    return NextResponse.json({ error: 'تعذّر إنشاء رابط الملف' }, { status: 500 });
  }

  if (!download) return NextResponse.redirect(url);
  const file = await fetch(url);
  if (!file.ok || !file.body) return NextResponse.json({ error: 'تعذّر تنزيل الملف' }, { status: 502 });
  return new NextResponse(file.body, {
    headers: {
      'Content-Type': attachment.mime_type || file.headers.get('content-type') || 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(attachment.file_name)}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
