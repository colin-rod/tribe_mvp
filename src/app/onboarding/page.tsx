'use client'

import { createLogger } from '@/lib/logger'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useOnboarding } from '@/hooks/useOnboarding'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'
import { WelcomeStep } from '@/components/onboarding/WelcomeStep'
import { ProfileSetupStep, ProfileSetupStepCompact } from '@/components/onboarding/ProfileSetupStep'
import { ChildSetupStep, ChildSetupStepCompact } from '@/components/onboarding/ChildSetupStep'
import { FirstMemoryStep, FirstMemoryStepCompact } from '@/components/onboarding/FirstMemoryStep'
import { CompletionStep } from '@/components/onboarding/CompletionStep'
import { getPrivacyMessageForStep } from '@/lib/onboarding'
import { ExclamationTriangleIcon, LockClosedIcon } from '@heroicons/react/24/outline'

const logger = createLogger('OnboardingPage')

// Helper function to get initials from name
function getInitials(name?: string): string {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const {
    state,
    data,
    isLoading,
    error,
    nextStep,
    previousStep,
    skipStep,
    updateProfileData,
    updateChildData,
    updateFirstUpdateData,
    completeOnboarding,
    dismissOnboarding
  } = useOnboarding()

  const [isMobile, setIsMobile] = useState(false)

  // Check if user is authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/onboarding')
    }
  }, [user, authLoading, router])

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Show loading state while auth is loading
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Handle errors
  const handleError = (error: string) => {
    logger.error('Onboarding error:', { error })
    // You could show a toast or error modal here
  }

  // Get current step component
  const getCurrentStepComponent = () => {
    const commonProps = {
      className: isMobile ? 'px-4' : 'px-6'
    }

    switch (state.currentStep) {
      case 'welcome':
        return (
          <WelcomeStep
            onNext={nextStep}
            {...commonProps}
          />
        )

      case 'profile-setup':
        return isMobile ? (
          <ProfileSetupStepCompact
            data={data.profile || {}}
            onUpdate={updateProfileData}
            onNext={nextStep}
            onPrevious={previousStep}
            {...commonProps}
          />
        ) : (
          <ProfileSetupStep
            data={data.profile || {}}
            onUpdate={updateProfileData}
            onNext={nextStep}
            onPrevious={previousStep}
            {...commonProps}
          />
        )

      case 'child-setup':
        return isMobile ? (
          <ChildSetupStepCompact
            data={data.child || {}}
            onUpdate={updateChildData}
            onNext={nextStep}
            onPrevious={previousStep}
            {...commonProps}
          />
        ) : (
          <ChildSetupStep
            data={data.child || {}}
            onUpdate={updateChildData}
            onNext={nextStep}
            onPrevious={previousStep}
            {...commonProps}
          />
        )

      case 'first-update':
        return isMobile ? (
          <FirstMemoryStepCompact
            data={data.firstUpdate || {}}
            onUpdate={updateFirstUpdateData}
            onNext={nextStep}
            onPrevious={previousStep}
            onSkip={skipStep}
            canSkip={state.canSkipStep}
            childName={data.child?.name}
            {...commonProps}
          />
        ) : (
          <FirstMemoryStep
            data={data.firstUpdate || {}}
            onUpdate={updateFirstUpdateData}
            onNext={nextStep}
            onPrevious={previousStep}
            onSkip={skipStep}
            canSkip={state.canSkipStep}
            childName={data.child?.name}
            {...commonProps}
          />
        )

      case 'completion':
        return (
          <CompletionStep
            data={data}
            onComplete={completeOnboarding}
            isLoading={isLoading}
            {...commonProps}
          />
        )

      default:
        return (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Unknown Step
            </h1>
            <p className="text-gray-600 mb-4">
              Something went wrong. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Refresh Page
            </button>
          </div>
        )
    }
  }

  const privacyMessage = getPrivacyMessageForStep(state.currentStep)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="text-2xl font-bold text-primary-600">
                Tribe
              </div>
              <div className="hidden sm:block text-sm text-gray-500">
                Setup
              </div>
            </div>

            {/* Progress - Desktop */}
            {!isMobile && state.currentStep !== 'welcome' && state.currentStep !== 'completion' && (
              <div className="flex-1 max-w-md mx-8">
                <OnboardingProgress
                  currentStep={state.currentStep}
                  currentStepIndex={state.currentStepIndex}
                  completedSteps={state.completedSteps}
                  skippedSteps={state.skippedSteps}
                  totalSteps={state.totalSteps}
                  variant="compact"
                  showTimeEstimate={true}
                />
              </div>
            )}

            {/* User Info */}
            <div className="flex items-center space-x-3">
              {/* User Avatar with Initials */}
              <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-semibold">
                {getInitials(data.profile?.name || user.email?.split('@')[0])}
              </div>
              <button
                onClick={dismissOnboarding}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Skip Setup
              </button>
            </div>
          </div>

          {/* Progress - Mobile */}
          {isMobile && state.currentStep !== 'welcome' && state.currentStep !== 'completion' && (
            <div className="pb-4">
              <OnboardingProgress
                currentStep={state.currentStep}
                currentStepIndex={state.currentStepIndex}
                completedSteps={state.completedSteps}
                skippedSteps={state.skippedSteps}
                totalSteps={state.totalSteps}
                variant="compact"
                showTimeEstimate={true}
              />
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto py-6 sm:py-12">
          {/* Step Content */}
          <div className="space-y-6">
            {getCurrentStepComponent()}
          </div>

          {/* Error Display */}
          {error && (
            <div className="fixed bottom-4 right-4 max-w-md">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-red-600">
                    <ExclamationTriangleIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="font-medium text-red-900 mb-1">
                      Something went wrong
                    </h4>
                    <p className="text-sm text-red-800 mb-3">
                      {error}
                    </p>
                    <button
                      onClick={() => handleError(error)}
                      className="text-xs text-red-700 hover:text-red-800"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {isLoading && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 shadow-xl">
                <div className="flex items-center space-x-3">
                  <LoadingSpinner />
                  <span className="text-gray-700">Processing...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
            {/* Privacy Message */}
            <div className="flex items-center text-xs text-gray-500 max-w-md space-x-2">
              <LockClosedIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>{privacyMessage}</span>
            </div>

            {/* Links */}
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <a href="/privacy" className="hover:text-gray-700">Privacy Policy</a>
              <a href="/terms" className="hover:text-gray-700">Terms of Service</a>
              <a href="/help" className="hover:text-gray-700">Help</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
