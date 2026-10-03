import 'server-only';
import { db } from './supabase';
import { inboxFilter } from './workflow';
import type { Department, RequestStatus, RequestType } from './constants';
import type { RequestRow } from './types';

export type SearchParams = {
  q?: string;
  status?: string;
  type?: string;
  scope?: string;
};

const REPORT_PAGE_SIZE = 1000;

function applyDepartmentVisibility<T>(query: T, department?: Department): T {
  if (department === 'finance') {
    return (query as T & { or: (filter: string) => T }).or(
      'finance_at.not.is.null,status.in.(pending_finance,pending_investment,pending_payment,approved)'
    );
  }
  if (department === 'investment') {
    return (query as T & { or: (filter: string) => T }).or(
      'investment_at.not.is.null,status.in.(pending_investment,approved)'
    );
  }
  return query;
}

/** عدّ دقيق من قاعدة البيانات، دون التأثر بحد Supabase الافتراضي للصفوف. */
export async function countRequests(filters: {
  status?: RequestStatus;
  type?: RequestType;
  department?: Department;
} = {}) {
  let query = db().from('requests').select('id', { count: 'exact', head: true });
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.type) query = query.eq('type', filters.type);
  query = applyDepartmentVisibility(query, filters.department);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/** يجلب كل صفوف التقرير على دفعات صريحة. */
export async function fetchAllRequestsForReport(columns = '*'): Promise<RequestRow[]> {
  const rows: RequestRow[] = [];
  for (let from = 0; ; from += REPORT_PAGE_SIZE) {
    const { data, error } = await db()
      .from('requests')
      .select(columns)
      .order('created_at', { ascending: false })
      .range(from, from + REPORT_PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as unknown as RequestRow[];
    rows.push(...page);
    if (page.length < REPORT_PAGE_SIZE) return rows;
  }
}

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
    if (f.statuses.length === 1) q = q.eq('status', f.statuses[0]);
    else if (f.statuses.length > 1) q = q.in('status', f.statuses);
    if (f.nullColumn) q = q.is(f.nullColumn, null);
  }

  // الدوائر اللاحقة لا ترى الطلب قبل وصوله الفعلي إلى مرحلتها.
  q = applyDepartmentVisibility(q, opts.department);

  const { data, error } = await q;
  if (error) throw error;
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
