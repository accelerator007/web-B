import { createClient } from '@supabase/supabase-js';
import { gzipSync } from 'node:zlib';

const TABLES = [
  'employees', 'requests', 'attachments', 'reviews', 'notifications',
  'otp_codes', 'audit_log', 'available_sites', 'request_rate_limits',
];
const PAGE_SIZE = 1000;
const FILE_BATCH_SIZE = 4;
const LIMITS = { pending_departments: 3, pending_finance: 2, pending_investment: 3, pending_payment: 3 };
const DEPARTMENTS = {
  pending_departments: ['technical', 'health'],
  pending_finance: ['finance'],
  pending_investment: ['investment'],
  pending_payment: ['finance'],
};

async function fetchAllRows(supa, table, configure = (query) => query) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const query = configure(supa.from(table).select('*')).range(from, from + PAGE_SIZE - 1);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) return rows;
  }
}

function safeBackupFileName(storagePath) {
  const parts = storagePath.split('/').filter(Boolean);
  if (!parts.length || parts.some((part) => part === '.' || part === '..')) {
    throw new Error(`Invalid attachment storage path: ${storagePath}`);
  }
  return parts.map(encodeURIComponent).join('/');
}

async function backupAttachment(supa, attachment, backupRoot) {
  const { data, error } = await supa.storage.from('attachments').download(attachment.storage_path);
  if (error) throw new Error(`Could not download ${attachment.storage_path}: ${error.message}`);

  const backupPath = `${backupRoot}/attachments/${safeBackupFileName(attachment.storage_path)}`;
  const bytes = Buffer.from(await data.arrayBuffer());
  const { error: uploadError } = await supa.storage
    .from('database-backups')
    .upload(backupPath, bytes, {
      contentType: attachment.mime_type || data.type || 'application/octet-stream',
      upsert: false,
    });
  if (uploadError) throw new Error(`Could not back up ${attachment.storage_path}: ${uploadError.message}`);

  return {
    attachment_id: attachment.id,
    source_path: attachment.storage_path,
    backup_path: backupPath,
    size_bytes: bytes.byteLength,
  };
}

async function backupAttachmentFiles(supa, attachments, backupRoot) {
  const unique = [...new Map(attachments.map((item) => [item.storage_path, item])).values()];
  const manifest = [];
  for (let index = 0; index < unique.length; index += FILE_BATCH_SIZE) {
    const batch = unique.slice(index, index + FILE_BATCH_SIZE);
    manifest.push(...(await Promise.all(batch.map((item) => backupAttachment(supa, item, backupRoot)))));
  }
  return manifest;
}

async function createBackup(supa, now) {
  const day = now.toISOString().slice(0, 10);
  const backupRoot = `${day}/${now.getTime()}`;
  const backup = { created_at: now.toISOString(), tables: {}, files: [] };

  for (const table of TABLES) backup.tables[table] = await fetchAllRows(supa, table);
  backup.files = await backupAttachmentFiles(supa, backup.tables.attachments, backupRoot);

  const content = gzipSync(Buffer.from(JSON.stringify(backup)));
  const { error } = await supa.storage
    .from('database-backups')
    .upload(`${backupRoot}/database.json.gz`, content, {
      contentType: 'application/gzip',
      upsert: false,
    });
  if (error) throw error;
}

async function sendOverdueNotifications(supa, now) {
  const day = now.toISOString().slice(0, 10);
  const requests = await fetchAllRows(
    supa,
    'requests',
    (query) => query.in('status', Object.keys(LIMITS))
  );
  const employeeCache = new Map();

  for (const request of requests) {
    const days = (now.getTime() - Date.parse(request.updated_at)) / 86_400_000;
    if (days <= LIMITS[request.status]) continue;
    for (const department of DEPARTMENTS[request.status]) {
      if (!employeeCache.has(department)) {
        employeeCache.set(
          department,
          await fetchAllRows(
            supa,
            'employees',
            (query) => query.eq('department', department).eq('status', 'active')
          )
        );
      }
      for (const employee of employeeCache.get(department)) {
        const title = `تنبيه تأخر: ${request.request_number}`;
        const { count, error: countError } = await supa
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('employee_id', employee.id)
          .eq('request_id', request.id)
          .eq('title', title)
          .gte('created_at', `${day}T00:00:00.000Z`);
        if (countError) throw countError;
        if (!count) {
          const { error } = await supa.from('notifications').insert({
            employee_id: employee.id,
            request_id: request.id,
            title,
            body: `لم يُحدّث الطلب منذ ${Math.floor(days)} أيام. يرجى مراجعته.`,
            email_sent: false,
          });
          if (error) throw error;
        }
      }
    }
  }
}

const dailyMaintenance = async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase environment is missing');
  const supa = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date();

  await createBackup(supa, now);
  await sendOverdueNotifications(supa, now);
  const { error } = await supa
    .from('request_rate_limits')
    .delete()
    .lt('window_started_at', new Date(now.getTime() - 2 * 86_400_000).toISOString());
  if (error) throw error;
  return new Response(null, { status: 204 });
};

export default dailyMaintenance;

export const config = { schedule: '0 22 * * *' }; // 02:00 صباحاً بتوقيت عُمان
