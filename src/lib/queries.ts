import 'server-only';
import { db } from './supabase';
import { inboxFilter } from './workflow';
import type { Department } from './constants';
import type { RequestRow } from './types';

export type SearchParams = {
  q?: string;
  status?: string;
  type?: string;
  scope?: string;
};

/** بحث موحّد في الطلبات — يُستخدم في صفحات الموظفين والأدمن */
export async function searchRequests(
  params: SearchParams,
  opts: { department?: Department; limit?: number } = {}
): Promise<RequestRow[]> {
  let q = db()
    .from('requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 200);

  const term = (params.q ?? '').trim();
  if (term) {
    // البحث بالرقم المدني (الأساسي) أو رقم الطلب أو اسم مقدّم الطلب
    q = q.or(
      `civil_number.eq.${term},request_number.ilike.%${term}%,full_name.ilike.%${term}%,phone.eq.${term}`
    );
  }
  if (params.status) q = q.eq('status', params.status);
  if (params.type) q = q.eq('type', params.type);

  if (params.scope === 'inbox' && opts.department) {
    const f = inboxFilter(opts.department);
    if (f.status) q = q.eq('status', f.status);
    if (f.nullColumn) q = q.is(f.nullColumn, null);
  }

  // الدوائر اللاحقة لا ترى الطلب قبل وصوله الفعلي إلى مرحلتها.
  if (opts.department === 'finance') {
    q = q.or('finance_at.not.is.null,status.in.(pending_finance,pending_investment,approved)');
  } else if (opts.department === 'investment') {
    q = q.or('investment_at.not.is.null,status.in.(pending_investment,approved)');
  }

  const { data } = await q;
  return (data ?? []) as RequestRow[];
}

export async function getRequestBundle(id: string) {
  const supa = db();
  const [{ data: request }, { data: attachments }, { data: reviews }] = await Promise.all([
    supa.from('requests').select('*').eq('id', id).maybeSingle(),
    supa.from('attachments').select('*').eq('request_id', id).order('created_at'),
    supa.from('reviews').select('*').eq('request_id', id).order('created_at'),
  ]);
  return { request: request as RequestRow | null, attachments: attachments ?? [], reviews: reviews ?? [] };
}
