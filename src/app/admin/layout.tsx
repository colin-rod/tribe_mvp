/**
 * Admin Layout - Requires admin privileges
 */

'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import Navigation from '@/components/layout/Navigation'
import Header from '@/components/layout/Header'
import type { User } from '@supabase/supabase-js'
import { HomeIcon, DocumentTextIcon, BriefcaseIcon } from '@heroicons/react/24/outline'

interface AdminLayoutProps {
  children: React.ReactNode
}

const isAdminUser = (candidate: User | null): boolean => {
  return candidate?.email?.endsWith('@tribe-mvp.com') ?? false
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    // Check if user has admin privileges (tribe-mvp.com email)
    if (!loading && user && !isAdminUser(user)) {
      router.push('/dashboard')
      return
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user || !isAdminUser(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to access this area.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const adminNavItems = [
    {
      name: 'Overview',
      href: '/admin',
      icon: HomeIcon,
      current: pathname === '/admin'
    },
    {
      name: 'Templates',
      href: '/admin/templates',
      icon: DocumentTextIcon,
      current: pathname === '/admin/templates'
    },
    {
      name: 'Background Jobs',
      href: '/admin/jobs',
      icon: BriefcaseIcon,
      current: pathname === '/admin/jobs'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <Header
        title="Admin Panel"
        subtitle="Template management and system administration"
      />

      {/* Admin Navigation Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Admin navigation">
            {adminNavItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${
                      item.current
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
