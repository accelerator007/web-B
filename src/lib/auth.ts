import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cache } from 'react';
import { db } from './supabase';
import type { Department } from './constants';

const COOKIE = 'swq_session';
const MAX_AGE = 60 * 60 * 8; // 8 ساعات

export type SessionUser = {
  id: string;
  employee_number: string;
  full_name: string;
  email: string;
  department: Department;
  role: 'employee' | 'admin';
};

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error('SESSION_SECRET غير معرّف أو قصير جداً (32 حرفاً على الأقل) في .env.local');
  }
  return new TextEncoder().encode(s);
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: payload.id as string,
      employee_number: payload.employee_number as string,
      full_name: payload.full_name as string,
      email: payload.email as string,
      department: payload.department as Department,
      role: payload.role as 'employee' | 'admin',
    };
  } catch {
    return null;
  }
}

/** يعيد بيانات جلسة محدثة من قاعدة البيانات، ويرفض الحسابات المحذوفة أو الموقوفة. */
async function refreshSessionUser(session: SessionUser): Promise<SessionUser | null> {
  const { data } = await db()
    .from('employees')
    .select('id, status, role, department, full_name, employee_number, email')
    .eq('id', session.id)
    .maybeSingle();

  if (!data || data.status !== 'active') return null;

  return {
    id: data.id,
    employee_number: data.employee_number,
    full_name: data.full_name,
    email: data.email,
    department: data.department as Department,
    role: data.role as 'employee' | 'admin',
  };
}

export async function getActiveSession(): Promise<SessionUser | null> {
  const session = await getSession();
  return session ? refreshSessionUser(session) : null;
}

/** يتحقق من الجلسة ومن أن الحساب ما زال مفعّلاً في قاعدة البيانات */
/**
 * React cache prevents the layout and the page from validating the same session
 * with two identical Supabase round-trips during a single render.
 */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const session = await getSession();
  if (!session) redirect('/login');
  const user = await refreshSessionUser(session);
  if (!user) redirect('/login?error=disabled');
  return user;
});

export const requireAdmin = cache(async (): Promise<SessionUser> => {
  const user = await requireUser();
  if (user.role !== 'admin') redirect('/dashboard?error=forbidden');
  return user;
});

/** تحقق من كلمة مرور الأدمن (يُطلب قبل العمليات الحسّاسة) */
export async function confirmAdminPassword(adminId: string, password: string) {
  const { data } = await db()
    .from('employees')
    .select('password_hash')
    .eq('id', adminId)
    .maybeSingle();
  if (!data) return false;
  return verifyPassword(password, data.password_hash);
}
