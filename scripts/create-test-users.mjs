#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

for (const file of ['.env.local', '.env']) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('إعدادات Supabase ناقصة في .env.local');

const password = process.argv.find((value) => value.startsWith('--password='))?.split('=').slice(1).join('=') || 'Test@2026';
if (password.length < 8) throw new Error('كلمة المرور التجريبية يجب أن تكون ٨ خانات على الأقل');

const users = [
  { employee_number: '2001', full_name: 'موظف الشؤون الفنية', email: 'technical.test@suwaiq.local', department: 'technical' },
  { employee_number: '2002', full_name: 'موظف الرقابة الصحية', email: 'health.test@suwaiq.local', department: 'health' },
  { employee_number: '2003', full_name: 'موظف الشؤون المالية', email: 'finance.test@suwaiq.local', department: 'finance' },
  { employee_number: '2004', full_name: 'موظف دائرة الاستثمار', email: 'investment.test@suwaiq.local', department: 'investment' },
];

const supa = createClient(url, key, { auth: { persistSession: false } });
for (const user of users) {
  const { data: existing, error: findError } = await supa
    .from('employees')
    .select('id')
    .eq('employee_number', user.employee_number)
    .maybeSingle();
  if (findError) throw findError;

  const values = {
    ...user,
    password_hash: bcrypt.hashSync(password, 10),
    role: 'employee',
    status: 'active',
    approved_at: new Date().toISOString(),
    reject_reason: null,
  };
  const { error } = existing
    ? await supa.from('employees').update(values).eq('id', existing.id)
    : await supa.from('employees').insert(values);
  if (error) throw error;
  console.log(`✅ ${user.employee_number} — ${user.full_name}`);
}

console.log(`\nكلمة المرور المشتركة: ${password}`);
