/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/sites',
        headers: [
          {
            // The listing is public. Netlify serves warm responses from its
            // edge and refreshes them in the background instead of invoking
            // Next.js and Supabase for every visitor.
            key: 'Netlify-CDN-Cache-Control',
            value: 'public, durable, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      // النماذج ترسل بيانات نصية فقط — المرفقات تُرفع مباشرة إلى Supabase Storage
      // من المتصفح، فلا تمر عبر الخادم ولا تصطدم بحدود حجم الطلب في Netlify.
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
