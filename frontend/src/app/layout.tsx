import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/lib/providers'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    template: '%s | SupplySense SC-OS',
    default: 'SupplySense — Autonomous AI Supply Chain OS',
  },
  description:
    'SupplySense is an enterprise-grade Autonomous AI Supply Chain Operating System. Observe, Forecast, Analyze, Decide, and Act — with human oversight.',
  keywords: [
    'supply chain',
    'AI',
    'forecasting',
    'procurement',
    'inventory management',
    'risk management',
    'enterprise',
    'MLOps',
  ],
  authors: [{ name: 'SupplySense AI' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'SupplySense',
    title: 'SupplySense — Autonomous AI Supply Chain OS',
    description: 'Enterprise-grade AI Supply Chain Operating System with autonomous decision-making.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SupplySense' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SupplySense — Autonomous AI Supply Chain OS',
    description: 'Enterprise-grade AI Supply Chain Operating System',
    images: ['/og-image.png'],
  },
  robots: {
    index: false, // Private enterprise app
    follow: false,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body className="bg-background text-text-primary font-sans antialiased">
        <Providers>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            richColors
            toastOptions={{
              style: {
                background: '#1C2537',
                border: '1px solid #1E2D45',
                color: '#F1F5F9',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
