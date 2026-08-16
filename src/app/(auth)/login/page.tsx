import { LoginForm } from '@/components/auth-forms';

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const notices: Record<string, string> = {
    disabled: 'انتهت الجلسة أو تم إيقاف الحساب. الرجاء تسجيل الدخول مجدداً.',
    forbidden: 'ليس لديك صلاحية للوصول إلى هذه الصفحة.',
  };
  return <LoginForm notice={searchParams.error ? notices[searchParams.error] : undefined} />;
}
