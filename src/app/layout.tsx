import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'بوابة استثمار المواقع الحكومية — دائرة البلدية بالسويق',
  description:
    'تقديم طلبات استثمار المواقع الحكومية وتجديد العقود والتنازل عنها وإلغائها إلكترونياً — دائرة البلدية بالسويق',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
