/**
 * Development Environment Banner
 * Shows when app is running in development/staging environment
 */

'use client'

import { useState } from 'react'
import { XMarkIcon, CodeBracketIcon } from '@heroicons/react/24/outline'

export function DevelopmentBanner() {
  const [dismissed, setDismissed] = useState(false)

  // Only show on development domains or when explicitly set
  const isDevelopment =
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_APP_ENV === 'development' ||
    process.env.NEXT_PUBLIC_APP_ENV === 'staging' ||
    (typeof window !== 'undefined' && (
      window.location.hostname.includes('dev.') ||
      window.location.hostname.includes('development') ||
      window.location.hostname.includes('staging') ||
      window.location.hostname.includes('preview') ||
      window.location.hostname.includes('vercel.app')
    ))

  if (!isDevelopment || dismissed) {
    return null
  }

  return (
    <div className="relative z-50 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-x-6 py-2.5 text-sm leading-6 text-white">
          <div className="flex items-center gap-x-2">
            <CodeBracketIcon className="h-4 w-4 flex-shrink-0" />
            <p className="flex-1">
              <strong className="font-semibold">🚧 DEVELOPMENT VERSION 🚧</strong>
              <span className="ml-2 hidden sm:inline">
                You are viewing the development version of Tribe MVP.
                Changes here may not reflect the production environment.
              </span>
              <span className="ml-2 sm:hidden">
                Dev Environment
              </span>
            </p>
          </div>

          <div className="flex items-center gap-x-2">
            <span className="text-xs opacity-75">
              {typeof window !== 'undefined' ? window.location.hostname : ''}
            </span>
            <button
              type="button"
              className="group flex-none rounded-sm p-1 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-red-500"
              onClick={() => setDismissed(true)}
            >
              <span className="sr-only">Dismiss</span>
              <XMarkIcon className="h-4 w-4 text-white" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Development Floating Indicator
 * Small floating indicator in corner for persistent visibility
 */
export function DevelopmentIndicator() {
  const isDevelopment =
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_APP_ENV === 'development' ||
    process.env.NEXT_PUBLIC_APP_ENV === 'staging' ||
    (typeof window !== 'undefined' && (
      window.location.hostname.includes('dev.') ||
      window.location.hostname.includes('development') ||
      window.location.hostname.includes('staging') ||
      window.location.hostname.includes('preview') ||
      window.location.hostname.includes('vercel.app')
    ))

  if (!isDevelopment) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-xs font-medium text-white shadow-lg ring-1 ring-orange-600">
        <div className="h-2 w-2 animate-pulse rounded-full bg-white"></div>
        <span>DEV</span>
      </div>
    </div>
  )
}