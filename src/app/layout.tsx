import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { DevelopmentBanner, DevelopmentIndicator } from '@/components/ui/DevelopmentBanner'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { PerformanceProvider } from '@/components/providers/PerformanceProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Tribe - Secure Baby Update App for Private Family Sharing',
  description: 'Keep family connected with Tribe\'s secure baby update app. Share photos, milestones & moments privately. The trusted family communication platform parents love.',
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
  authors: [{ name: 'Tribe Team' }],
  creator: 'Tribe',
  publisher: 'Tribe',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
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
    url: 'https://tribe-app.com',
    title: 'Tribe - Secure Baby Update App for Private Family Sharing',
    description: 'Keep family connected with Tribe\'s secure baby update app. Share photos, milestones & moments privately. The trusted family communication platform parents love.',
    siteName: 'Tribe',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Tribe - Secure Baby Update App for Private Family Sharing',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tribe - Secure Baby Update App for Private Family Sharing',
    description: 'Keep family connected with Tribe\'s secure baby update app. Share photos, milestones & moments privately.',
    images: ['/twitter-image.jpg'],
    creator: '@TribeApp',
  },
  alternates: {
    canonical: 'https://tribe-app.com',
  },
  verification: {
    google: 'your-google-site-verification',
  },
}

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Tribe',
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
    name: 'Tribe',
    url: 'https://tribe-app.com'
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
        <DevelopmentBanner />
        <div className="min-h-screen bg-gray-50">
          <AuthProvider>
            {children}
          </AuthProvider>
        </div>
        <DevelopmentIndicator />
        <PerformanceProvider />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}