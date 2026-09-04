import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { I18nProvider } from '@/components/i18n-provider';
import { NativeAppClass } from '@/components/native-app-class';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'COSMORA — Marketplace & Community',
  description:
    'The European marketplace and community for cosplay, comics, collectibles, creators and events.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} antialiased`}
        suppressHydrationWarning
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var n=false;var C=window.Capacitor;if(C&&typeof C.isNativePlatform==='function'){n=!!C.isNativePlatform();}else if(/Capacitor/i.test(navigator.userAgent||'')){n=true;}if(n)document.documentElement.classList.add('native-capacitor');}catch(e){}})();`,
          }}
        />
        <NativeAppClass />
        <I18nProvider>
          <ServiceWorkerRegistration />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
