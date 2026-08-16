import type { Metadata } from 'next';
import { AppShell } from './AppShell';
import './globals.css';
import { ToastProvider } from './ToastProvider';

export const metadata: Metadata = {
  title: 'Clinic Platform',
  description: 'Painel operacional para clínicas médicas',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
