import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { DevelopmentBanner, DevelopmentIndicator } from '@/components/ui/DevelopmentBanner'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { PerformanceProvider } from '@/components/providers/PerformanceProvider'
import { SkipLinks } from '@/components/accessibility/SkipLinks'
import { LayoutProvider } from '@/contexts/LayoutContext'
import { KeyboardShortcutsProvider } from '@/components/accessibility/KeyboardShortcutsProvider'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { Toaster } from 'sonner'
import FeedbackButton from '@/components/feedback/FeedbackButton'
import { DashboardAnalyticsInitializer } from '@/components/providers/DashboardAnalyticsInitializer'
import { ReactQueryProvider } from '@/lib/react-query'

const inter = Inter({ subsets: ['latin'] })

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export const metadata: Metadata = {
  title: 'TribeUpdate - Secure Baby Update App for Private Family Sharing',
  description: 'Keep family connected with TribeUpdate\'s secure baby update app. Share photos, milestones & moments privately. The trusted family communication platform parents love.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' }
    ],
    apple: '/apple-icon.png'
  },
  keywords: [
    'baby update app',
    'private family sharing',
    'family photo sharing app',
    'baby milestone tracker',
    'secure family communication',
    'family circle app',
    'private baby photos',
    'family group chat',
    'baby memories app',
    'grandparent sharing app'
  ],
  authors: [{ name: 'TribeUpdate Team' }],
  creator: 'TribeUpdate',
  publisher: 'TribeUpdate',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://tribeupdate.com',
    title: 'TribeUpdate - Secure Baby Update App for Private Family Sharing',
    description: 'Keep family connected with TribeUpdate\'s secure baby update app. Share photos, milestones & moments privately. The trusted family communication platform parents love.',
    siteName: 'TribeUpdate',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'TribeUpdate - Secure Baby Update App for Private Family Sharing',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TribeUpdate - Secure Baby Update App for Private Family Sharing',
    description: 'Keep family connected with TribeUpdate\'s secure baby update app. Share photos, milestones & moments privately.',
    images: ['/twitter-image.jpg'],
    creator: '@TribeUpdate',
  },
  alternates: {
    canonical: 'https://tribeupdate.com',
  },
  verification: {
    google: 'your-google-site-verification',
  },
}

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'TribeUpdate',
  applicationCategory: 'Family & Parenting',
  operatingSystem: 'iOS, Android, Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD'
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '50000'
  },
  description: 'Secure baby update app for private family sharing. Share photos, milestones & moments with family members privately.',
  featureList: [
    'Private family photo sharing',
    'Baby milestone tracking',
    'Secure, encrypted communications',
    'Ad-free experience',
    'SOC 2 certified security'
  ],
  publisher: {
    '@type': 'Organization',
    name: 'TribeUpdate',
    url: 'https://tribeupdate.com'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </head>
      <body className={inter.className}>
        <DashboardAnalyticsInitializer />
        <SkipLinks />
        <DevelopmentBanner />
        <div className="min-h-screen bg-gray-50">
          <ErrorBoundary>
            <ReactQueryProvider>
              <AuthProvider>
                <LayoutProvider>
                  <KeyboardShortcutsProvider>
                    <main id="main-content" tabIndex={-1}>
                      {children}
                    </main>
                  </KeyboardShortcutsProvider>
                </LayoutProvider>
              </AuthProvider>
            </ReactQueryProvider>
          </ErrorBoundary>
        </div>
        <DevelopmentIndicator />
        <FeedbackButton />
        <Toaster position="top-center" richColors />
        <PerformanceProvider />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}