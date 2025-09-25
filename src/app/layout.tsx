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
  title: 'Tribe MVP',
  description: 'Smart baby update distribution platform',
  keywords: ['family', 'baby', 'updates', 'sharing', 'private'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
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