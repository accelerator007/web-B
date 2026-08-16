#!/usr/bin/env node
/**
 * توليد تشفير bcrypt لكلمة مرور — لاستخدامه في SQL مباشرة.
 *
 * الاستخدام:
 *   npm run hash -- "كلمة المرور الجديدة"
 */
import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password || password.length < 8) {
  console.error('❌ اكتب كلمة المرور (٨ خانات على الأقل):');
  console.error('   npm run hash -- MyPass1234');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);

console.log('\n✅ التشفير:');
console.log(hash);
console.log('\nلتغيير كلمة مرور الأدمن، شغّل في Supabase SQL Editor:');
console.log(`
update public.employees
   set password_hash = '${hash}'
 where employee_number = '1001';
`);
