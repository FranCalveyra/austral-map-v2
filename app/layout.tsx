import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Austral Map',
  description: 'Mapa del plan de estudios de la Universidad Austral',
  viewport: 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5, user-scalable=yes',
  icons: {
    icon: '/assets/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="w-full px-4">{children}</div>
      </body>
    </html>
  );
}
