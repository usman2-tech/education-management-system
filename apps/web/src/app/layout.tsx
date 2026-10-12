/**
 * MODULE: Root Application Layout
 *
 * PURPOSE:
 * Top-level Next.js layout providing theme provider, HTML metadata,
 * font configuration, and institutional dashboard shell wrapping.
 */

import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export const metadata: Metadata = {
  title: 'Educational Management System (EMS) | Enterprise Academic ERP',
  description:
    'Institutional school administration, academic management, and autonomous AI learning platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <DashboardShell>{children}</DashboardShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
