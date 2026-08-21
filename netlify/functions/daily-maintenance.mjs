import { createClient } from '@supabase/supabase-js';
import { gzipSync } from 'node:zlib';

const TABLES = ['employees','requests','attachments','reviews','notifications','otp_codes','audit_log'];
const LIMITS = { pending_departments: 3, pending_finance: 2, pending_investment: 3 };
const DEPARTMENTS = { pending_departments: ['technical','health'], pending_finance: ['finance'], pending_investment: ['investment'] };

export default async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase environment is missing');
  const supa = createClient(url, key, { auth: { persistSession: false } });

  const backup = { created_at: new Date().toISOString(), tables: {} };
  for (const table of TABLES) {
    const { data, error } = await supa.from(table).select('*');
    if (error) throw error;
    backup.tables[table] = data ?? [];
  }
  const day = new Date().toISOString().slice(0, 10);
  const content = gzipSync(Buffer.from(JSON.stringify(backup)));
  const { error: backupError } = await supa.storage.from('database-backups').upload(`${day}/database-${Date.now()}.json.gz`, content, { contentType: 'application/gzip', upsert: false });
  if (backupError) throw backupError;

  const { data: requests } = await supa.from('requests').select('id,request_number,status,updated_at').in('status', Object.keys(LIMITS));
  for (const request of requests ?? []) {
    const days = (Date.now() - Date.parse(request.updated_at)) / 86400000;
    if (days <= LIMITS[request.status]) continue;
    for (const department of DEPARTMENTS[request.status]) {
      const { data: employees } = await supa.from('employees').select('id').eq('department', department).eq('status', 'active');
      for (const employee of employees ?? []) {
        const title = `تنبيه تأخر: ${request.request_number}`;
        const { count } = await supa.from('notifications').select('id', { count: 'exact', head: true }).eq('employee_id', employee.id).eq('request_id', request.id).eq('title', title).gte('created_at', `${day}T00:00:00.000Z`);
        if (!count) await supa.from('notifications').insert({ employee_id: employee.id, request_id: request.id, title, body: `لم يُحدّث الطلب منذ ${Math.floor(days)} أيام. يرجى مراجعته.`, email_sent: false });
      }
    }
  }

  await supa.from('request_rate_limits').delete().lt('window_started_at', new Date(Date.now() - 2 * 86400000).toISOString());
  return new Response(null, { status: 204 });
};

export const config = { schedule: '0 22 * * *' }; // 02:00 صباحاً بتوقيت عُمان
