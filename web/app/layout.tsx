import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'DietLogger - Compliance Tracking',
  description: 'Track your nutrition plan compliance with ease',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="dark" suppressHydrationWarning>
      <head>
        <style>{`
          :root {
            --font-inter: ${inter.variable};
          }
        `}</style>
      </head>
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
