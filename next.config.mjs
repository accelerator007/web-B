/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // النماذج ترسل بيانات نصية فقط — المرفقات تُرفع مباشرة إلى Supabase Storage
      // من المتصفح، فلا تمر عبر الخادم ولا تصطدم بحدود حجم الطلب في Netlify.
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
