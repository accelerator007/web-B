#!/usr/bin/env node
/**
 * إنشاء حساب مدير النظام (الأدمن) الأول.
 *
 * التشغيل:
 *   npm run seed:admin
 * أو مع تمرير القيم مباشرة:
 *   npm run seed:admin -- --number=1001 --name="سعيد محمد الهنائي" --email=admin@suwaiq.gov.om --password=Admin12345
 */
import { readFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// --- تحميل متغيّرات البيئة من .env.local ---
for (const file of ['.env.local', '.env']) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('❌ ضع NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في ملف .env.local أولاً');
  process.exit(1);
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...rest] = a.replace(/^--/, '').split('=');
    return [k, rest.join('=')];
  })
);

const rl = createInterface({ input: stdin, output: stdout });
const ask = async (label, fallback) => (fallback ? fallback : (await rl.question(label)).trim());

const employee_number = await ask('الرقم الوظيفي: ', args.number);
const full_name = await ask('اسم المدير (ثلاثي بالعربي): ', args.name);
const email = await ask('البريد الإلكتروني: ', args.email);
const password = await ask('كلمة المرور (٨ خانات على الأقل): ', args.password);
rl.close();

if (!employee_number || !full_name || !email || password.length < 8) {
  console.error('❌ بيانات ناقصة أو كلمة مرور أقل من ٨ خانات');
  process.exit(1);
}

const supa = createClient(url, key, { auth: { persistSession: false } });

const { data: existing } = await supa
  .from('employees')
  .select('id')
  .or(`employee_number.eq.${employee_number},email.eq.${email.toLowerCase()}`)
  .maybeSingle();

if (existing) {
  const { error } = await supa
    .from('employees')
    .update({
      full_name,
      email: email.toLowerCase(),
      role: 'admin',
      department: 'admin',
      status: 'active',
      password_hash: bcrypt.hashSync(password, 10),
    })
    .eq('id', existing.id);
  if (error) throw error;
  console.log('✅ تم تحديث حساب الأدمن الحالي.');
} else {
  const { error } = await supa.from('employees').insert({
    employee_number,
    full_name,
    email: email.toLowerCase(),
    department: 'admin',
    role: 'admin',
    status: 'active',
    approved_at: new Date().toISOString(),
    password_hash: bcrypt.hashSync(password, 10),
  });
  if (error) throw error;
  console.log('✅ تم إنشاء حساب مدير النظام بنجاح.');
}

console.log(`   الرقم الوظيفي: ${employee_number}`);
console.log('   سجّل الدخول من: /login');
