import type {Metadata} from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export const metadata: Metadata = {
  title: 'Batang Techno',
  description: 'A futuristic judging platform for local hackathons',
  icons: {
    icon: '/favicon.ico', // You can replace this with your own filename (e.g., /logo.png)
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
        <FirebaseClientProvider>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Toaster />
          <footer className="border-t border-border/30 py-8 text-center text-muted-foreground text-sm bg-black/40 backdrop-blur-sm">
            <p>© 2024 Batang Techno. Aiming for the Stars.</p>
          </footer>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
