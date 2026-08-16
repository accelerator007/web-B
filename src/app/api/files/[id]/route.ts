import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/supabase';
import { signedUrl } from '@/lib/storage';

/**
 * فتح مرفق: متاح للموظفين المسجّلين فقط.
 * يُنشئ رابطاً موقّعاً مؤقتاً من Supabase Storage ثم يحوّل المستخدم إليه.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
  }

  const { data: attachment } = await db()
    .from('attachments')
    .select('storage_path')
    .eq('id', params.id)
    .maybeSingle();

  if (!attachment) {
    return NextResponse.json({ error: 'المرفق غير موجود' }, { status: 404 });
  }

  const url = await signedUrl(attachment.storage_path, 300);
  if (!url) {
    return NextResponse.json({ error: 'تعذّر إنشاء رابط الملف' }, { status: 500 });
  }

  return NextResponse.redirect(url);
}
