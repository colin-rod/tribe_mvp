'use client'

import { useEffect } from 'react'

interface ConversionEvent {
  action: string
  category: string
  label?: string
  value?: number
}

declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event',
      targetId: string,
      config?: any
    ) => void
  }
}

export function trackConversion(event: ConversionEvent) {
  // Google Analytics 4 tracking
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', event.action, {
      event_category: event.category,
      event_label: event.label,
      value: event.value,
    })
  }

  // Custom analytics tracking can be added here
  console.log('Conversion tracked:', event)
}

// Pre-defined conversion events for common actions
export const ConversionEvents = {
  SIGNUP_STARTED: {
    action: 'signup_started',
    category: 'conversion',
    label: 'landing_page_cta'
  },
  DEMO_REQUESTED: {
    action: 'demo_requested',
    category: 'engagement',
    label: 'hero_section'
  },
  FAQ_OPENED: {
    action: 'faq_opened',
    category: 'engagement',
    label: 'faq_section'
  },
  SOCIAL_PROOF_VIEWED: {
    action: 'social_proof_viewed',
    category: 'engagement',
    label: 'testimonials'
  },
  FEATURES_EXPLORED: {
    action: 'features_explored',
    category: 'engagement',
    label: 'features_section'
  }
} as const

interface ConversionTrackerProps {
  children: React.ReactNode
}

export function ConversionTracker({ children }: ConversionTrackerProps) {
  useEffect(() => {
    // Track page view on mount
    trackConversion({
      action: 'page_view',
      category: 'engagement',
      label: 'landing_page'
    })

    // Track scroll depth
    const handleScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      )

      // Track significant scroll milestones
      if (scrollPercent === 25 || scrollPercent === 50 || scrollPercent === 75 || scrollPercent === 100) {
        trackConversion({
          action: 'scroll_depth',
          category: 'engagement',
          label: `${scrollPercent}_percent`,
          value: scrollPercent
        })
      }
    }

    // Track time on page
    const startTime = Date.now()
    const trackTimeOnPage = () => {
      const timeSpent = Math.round((Date.now() - startTime) / 1000)

      // Track meaningful time thresholds
      if (timeSpent === 30 || timeSpent === 60 || timeSpent === 120) {
        trackConversion({
          action: 'time_on_page',
          category: 'engagement',
          label: `${timeSpent}_seconds`,
          value: timeSpent
        })
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    const timeInterval = setInterval(trackTimeOnPage, 1000)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearInterval(timeInterval)
    }
  }, [])

  return <>{children}</>
}

// Hook for easy conversion tracking in components
export function useConversionTracking() {
  return {
    trackConversion,
    trackSignupStarted: () => trackConversion(ConversionEvents.SIGNUP_STARTED),
    trackDemoRequested: () => trackConversion(ConversionEvents.DEMO_REQUESTED),
    trackFaqOpened: (question: string) => trackConversion({
      ...ConversionEvents.FAQ_OPENED,
      label: `${ConversionEvents.FAQ_OPENED.label}_${question.toLowerCase().replace(/\s+/g, '_')}`
    }),
    trackSocialProofViewed: () => trackConversion(ConversionEvents.SOCIAL_PROOF_VIEWED),
    trackFeaturesExplored: () => trackConversion(ConversionEvents.FEATURES_EXPLORED),
  }
}