import { LoginForm } from '@/components/auth-forms';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  const notices: Record<string, string> = {
    disabled: 'انتهت الجلسة أو تم إيقاف الحساب. الرجاء تسجيل الدخول مجدداً.',
    forbidden: 'ليس لديك صلاحية للوصول إلى هذه الصفحة.',
  };
  return <LoginForm notice={query.error ? notices[query.error] : undefined} />;
}
