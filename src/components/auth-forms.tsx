'use client';

import Link from 'next/link';
import { useFormState } from 'react-dom';
import { useState } from 'react';
import { SubmitButton } from './submit-button';
import { Alert } from './ui';
import { DEPARTMENTS } from '@/lib/constants';
import { loginAction, registerAction, requestOtpAction, resetPasswordAction } from '@/app/(auth)/actions';

/* ----------------------------------------------------------------- الدخول */
export function LoginForm({ notice }: { notice?: string }) {
  const [state, formAction] = useFormState(loginAction, null);

  return (
    <div className="card p-7">
      <h1 className="text-xl font-extrabold text-slate-900">دخول الموظفين</h1>
      <p className="mt-1.5 text-sm text-slate-500">استخدم رقمك الوظيفي وكلمة المرور الخاصة بك.</p>

      {notice && (
        <div className="mt-5">
          <Alert kind="warn">{notice}</Alert>
        </div>
      )}

      <form action={formAction} className="mt-6 space-y-5">
        {state?.error && <Alert kind="error">{state.error}</Alert>}

        <div>
          <label className="label" htmlFor="employee_number">
            الرقم الوظيفي
          </label>
          <input id="employee_number" name="employee_number" dir="ltr" className="input" required />
        </div>

        <div>
          <label className="label" htmlFor="password">
            كلمة المرور
          </label>
          <input id="password" name="password" type="password" dir="ltr" className="input" required />
        </div>

        <SubmitButton className="btn-primary w-full" pendingLabel="جارٍ الدخول…">
          تسجيل الدخول
        </SubmitButton>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="font-semibold text-brand-700 hover:underline">
          نسيت كلمة المرور؟
        </Link>
        <Link href="/register" className="font-semibold text-slate-600 hover:underline">
          إنشاء حساب جديد
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ إنشاء حساب */
export function RegisterForm() {
  const [state, formAction] = useFormState(registerAction, null);

  if (state?.ok) {
    return (
      <div className="card p-7 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h1 className="mt-4 text-lg font-extrabold text-slate-900">تم إرسال الطلب</h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">{state.message}</p>
        <Link href="/login" className="btn-primary mt-6 w-full">
          العودة لصفحة الدخول
        </Link>
      </div>
    );
  }

  return (
    <div className="card p-7">
      <h1 className="text-xl font-extrabold text-slate-900">طلب إنشاء حساب موظف</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        يُرسل الطلب إلى إدارة النظام للاعتماد قبل تفعيل الحساب.
      </p>

      <form action={formAction} className="mt-6 space-y-5">
        {state?.error && <Alert kind="error">{state.error}</Alert>}

        <div>
          <label className="label" htmlFor="employee_number">
            الرقم الوظيفي
          </label>
          <input id="employee_number" name="employee_number" dir="ltr" className="input" required />
        </div>

        <div>
          <label className="label" htmlFor="full_name">
            اسم الموظف (ثلاثي بالعربي)
          </label>
          <input id="full_name" name="full_name" className="input" required />
        </div>

        <div>
          <label className="label" htmlFor="email">
            البريد الإلكتروني
          </label>
          <input id="email" name="email" type="email" dir="ltr" className="input" required />
        </div>

        <div>
          <label className="label" htmlFor="department">
            القسم
          </label>
          <select id="department" name="department" className="input" required defaultValue="">
            <option value="" disabled>
              اختر القسم…
            </option>
            {(['technical', 'health', 'finance', 'investment'] as const).map((d) => (
              <option key={d} value={d}>
                {DEPARTMENTS[d]}
              </option>
            ))}
          </select>
        </div>

        <PasswordPair />

        <SubmitButton className="btn-primary w-full" pendingLabel="جارٍ الإرسال…">
          إرسال طلب إنشاء الحساب
        </SubmitButton>
      </form>

      <div className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          لديك حساب؟ تسجيل الدخول
        </Link>
      </div>
    </div>
  );
}

export function PasswordPair({
  nameA = 'password',
  nameB = 'password_confirm',
  labelA = 'كلمة المرور',
  labelB = 'تأكيد كلمة المرور',
}: {
  nameA?: string;
  nameB?: string;
  labelA?: string;
  labelB?: string;
}) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const mismatch = b.length > 0 && a !== b;

  return (
    <>
      <div>
        <label className="label" htmlFor={nameA}>
          {labelA}
        </label>
        <input
          id={nameA}
          name={nameA}
          type="password"
          dir="ltr"
          minLength={8}
          className="input"
          required
          value={a}
          onChange={(e) => setA(e.target.value)}
        />
        <p className="mt-1.5 text-xs text-slate-500">٨ خانات على الأقل (أرقام أو حروف إنجليزية).</p>
      </div>

      <div>
        <label className="label" htmlFor={nameB}>
          {labelB}
        </label>
        <input
          id={nameB}
          name={nameB}
          type="password"
          dir="ltr"
          minLength={8}
          className="input"
          required
          value={b}
          onChange={(e) => setB(e.target.value)}
        />
        {mismatch && <div className="field-error">كلمتا المرور غير متطابقتين</div>}
      </div>
    </>
  );
}

/* -------------------------------------------------- نسيت كلمة المرور OTP */
export function ForgotPasswordForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState('');
  const [otpState, sendOtp] = useFormState(requestOtpAction, null);
  const [resetState, resetPassword] = useFormState(resetPasswordAction, null);

  if (resetState?.ok) {
    return (
      <div className="card p-7 text-center">
        <h1 className="text-lg font-extrabold text-slate-900">تم تغيير كلمة المرور</h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">{resetState.message}</p>
        <Link href="/login" className="btn-primary mt-6 w-full">
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  return (
    <div className="card p-7">
      <h1 className="text-xl font-extrabold text-slate-900">إعادة تعيين كلمة المرور</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        {step === 1
          ? 'سيصلك رمز تحقق (OTP) على بريدك الإلكتروني المسجّل.'
          : 'أدخل رمز التحقق المرسل إلى بريدك وكلمة المرور الجديدة.'}
      </p>

      {step === 1 ? (
        <form action={sendOtp} className="mt-6 space-y-5">
          {otpState?.error && <Alert kind="error">{otpState.error}</Alert>}
          {otpState?.ok && <Alert kind="success">{otpState.message}</Alert>}

          <div>
            <label className="label" htmlFor="identifier">
              الرقم الوظيفي أو البريد الإلكتروني
            </label>
            <input
              id="identifier"
              name="identifier"
              dir="ltr"
              className="input"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          <SubmitButton className="btn-primary w-full" pendingLabel="جارٍ إرسال الرمز…">
            إرسال رمز التحقق
          </SubmitButton>

          {otpState?.ok && (
            <button type="button" className="btn-ghost w-full" onClick={() => setStep(2)}>
              لدي الرمز — متابعة
            </button>
          )}
        </form>
      ) : (
        <form action={resetPassword} className="mt-6 space-y-5">
          {resetState?.error && <Alert kind="error">{resetState.error}</Alert>}

          <input type="hidden" name="identifier" value={identifier} />

          <div>
            <label className="label" htmlFor="code">
              رمز التحقق (٦ أرقام)
            </label>
            <input
              id="code"
              name="code"
              dir="ltr"
              inputMode="numeric"
              maxLength={6}
              className="input text-center text-lg tracking-[0.5em]"
              required
            />
          </div>

          <PasswordPair labelA="كلمة المرور الجديدة" labelB="تأكيد كلمة المرور الجديدة" />

          <SubmitButton className="btn-primary w-full" pendingLabel="جارٍ الحفظ…">
            حفظ كلمة المرور
          </SubmitButton>

          <button type="button" className="btn-ghost w-full" onClick={() => setStep(1)}>
            رجوع
          </button>
        </form>
      )}

      <div className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          العودة لتسجيل الدخول
        </Link>
      </div>
    </div>
  );
}
