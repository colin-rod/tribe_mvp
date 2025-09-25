import dynamic from 'next/dynamic'
import React from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Admin components - only loaded when needed
export const AdminPanel = dynamic(() => import('@/components/admin/TemplateManager'), {
  loading: () => React.createElement(LoadingSpinner, { size: 'lg' }),
  ssr: false
})

// Profile components - heavy forms with validation
export const ProfileSettings = dynamic(() => import('@/components/profile/ProfileSection'), {
  loading: () => React.createElement(LoadingSpinner, { size: 'md' })
})

// Media components - heavy with file handling
export const MediaGallery = dynamic(() => import('@/components/media/MediaGallery'), {
  loading: () => React.createElement(LoadingSpinner, { size: 'md' })
})

// Updates components - can be heavy with many updates
export const VirtualizedUpdatesList = dynamic(() => import('@/components/updates/VirtualizedUpdatesList'), {
  loading: () => React.createElement(LoadingSpinner, { size: 'md' })
})

// AI Prompts - complex with real-time features
export const PromptFeed = dynamic(() => import('@/components/prompts/PromptFeed'), {
  loading: () => React.createElement(LoadingSpinner, { size: 'md' })
})

// Response components - heavy with conversation handling
export const ConversationView = dynamic(() => import('@/components/responses/ConversationView'), {
  loading: () => React.createElement(LoadingSpinner, { size: 'md' })
})

// Onboarding components - multi-step forms
export const OnboardingWizard = dynamic(() => import('@/components/onboarding/OnboardingWizard'), {
  loading: () => React.createElement(LoadingSpinner, { size: 'lg' })
})

// Chart/Analytics components - heavy with visualization libraries
export const ResponseAnalytics = dynamic(() => import('@/components/responses/ResponseAnalytics'), {
  loading: () => React.createElement(LoadingSpinner, { size: 'md' }),
  ssr: false // Analytics typically don't need SSR
})

export default {
  AdminPanel,
  ProfileSettings,
  MediaGallery,
  VirtualizedUpdatesList,
  PromptFeed,
  ConversationView,
  OnboardingWizard,
  ResponseAnalytics
}