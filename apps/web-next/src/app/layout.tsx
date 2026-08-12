import type { Metadata, Viewport } from 'next';
import { ReactQueryProvider } from '@/lib/ReactQueryProvider';
import { BrandingProvider } from '@/components/common/Branding';
import { ServiceWorkerRegistrar } from '@/components/common/ServiceWorkerRegistrar';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import './globals.css';
import 'katex/dist/katex.min.css';

const DEFAULT_THEME = process.env.NEXT_PUBLIC_DEFAULT_THEME || 'navy-light';

export const metadata: Metadata = {
  title: 'GrindBuddy — AI Assessment Platform',
  description: 'GrindBuddy — multi-tenant AI assessment platform for quizzes, coding, exams and knowledge transfer.',
  applicationName: 'GrindBuddy',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'GrindBuddy' },
  icons: {
    icon: '/images/logo.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* No-flash theme: set data-theme before paint from stored pref / env default. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('sb-theme')||'${DEFAULT_THEME}';if(t&&t!=='navy-light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
        {/* Google Fonts — Inter */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Material Symbols Outlined — used in Sidebar nav icons */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ServiceWorkerRegistrar />
        <ThemeProvider>
          <ReactQueryProvider>
            <BrandingProvider>
              {children}
            </BrandingProvider>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
