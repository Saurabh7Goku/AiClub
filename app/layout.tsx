import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ClubProvider } from '@/context/ClubContext';
import { ThemeProvider } from '@/context/ThemeContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI/ML Intelligence Club',
  description: 'A shared platform for AI/ML idea collaboration, voting, and innovation',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const appleWebApp = {
  capable: true,
  statusBarStyle: 'black-translucent',
  title: 'AI Club',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <ClubProvider>
              {children}
            </ClubProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
