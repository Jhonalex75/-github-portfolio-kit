import type { Metadata } from 'next';
import './globals.css';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'CyberEngineer Nexus | Next-Gen Engineering Hub',
  description: 'AI-Powered Design, Research, and Simulation for the Modern Engineer',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-body text-foreground min-h-screen" suppressHydrationWarning>
        <ErrorBoundary>
          <FirebaseClientProvider>
            <LoadingScreen />
            {children}
            <Toaster />
          </FirebaseClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
