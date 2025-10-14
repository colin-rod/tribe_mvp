'use client'

import { createLogger } from '@/lib/logger'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createChild } from '@/lib/children'
import { createRecipient } from '@/lib/recipients'
import { useAuth } from '@/hooks/useAuth'
import type { CreateRecipientData } from '@/lib/recipients'
import type { AddChildFormData } from '@/lib/validation/child'

export type OnboardingStep =
  | 'welcome'
  | 'profile-setup'
  | 'child-setup'
  | 'recipient-setup'
  | 'first-update'
  | 'completion'

export interface OnboardingState {
  currentStep: OnboardingStep
  completedSteps: Set<OnboardingStep>
  skippedSteps: Set<OnboardingStep>
  canSkipStep: boolean
  totalSteps: number
  currentStepIndex: number
}

export interface ProfileSetupData {
  name: string
  timezone: string
  emailNotifications: boolean
  smsNotifications: boolean
  pushNotifications: boolean
}

export interface ChildSetupData extends Omit<AddChildFormData, 'profile_photo'> {
  profile_photo?: File
}

export interface RecipientSetupData {
  recipients: CreateRecipientData[]
  quickAddEnabled: boolean
}

export interface FirstUpdateData {
  content: string
  mediaFiles: File[]
  childId: string
  sendToAll: boolean
}

export interface OnboardingData {
  profile?: ProfileSetupData
  child?: ChildSetupData
  recipients?: RecipientSetupData
  firstUpdate?: FirstUpdateData
}

export interface UseOnboardingReturn {
  // State
  state: OnboardingState
  data: OnboardingData
  isLoading: boolean
  error: string | null

  // Navigation
  nextStep: () => Promise<void>
  previousStep: () => void
  skipStep: () => Promise<void>
  goToStep: (step: OnboardingStep) => void

  // Data management
  updateProfileData: (data: Partial<ProfileSetupData>) => void
  updateChildData: (data: Partial<ChildSetupData>) => void
  updateRecipientData: (data: Partial<RecipientSetupData>) => void
  updateFirstUpdateData: (data: Partial<FirstUpdateData>) => void

  // Actions
  saveProgress: () => Promise<void>
  completeOnboarding: () => Promise<void>
  resetOnboarding: () => Promise<void>
  dismissOnboarding: () => Promise<void>

  // Utilities
  getStepProgress: () => number
  canProceedToNext: () => boolean
  isStepCompleted: (step: OnboardingStep) => boolean
  isStepSkipped: (step: OnboardingStep) => boolean
}

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'profile-setup',
  'child-setup',
  'first-update',
  'completion'
]

const SKIPPABLE_STEPS: OnboardingStep[] = [
  'first-update'
]

export function useOnboarding(): UseOnboardingReturn {
  const loggerRef = useRef(createLogger('UseOnboarding'))
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  // State
  const [state, setState] = useState<OnboardingState>({
    currentStep: 'welcome',
    completedSteps: new Set(),
    skippedSteps: new Set(),
    canSkipStep: false,
    totalSteps: STEP_ORDER.length,
    currentStepIndex: 0
  })

  const [data, setData] = useState<OnboardingData>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // localStorage key helper
  const getStorageKey = useCallback((step: string) => {
    return user ? `onboarding_${user.id}_${step}` : null
  }, [user])

  // Save step data to localStorage
  const saveStepToLocalStorage = useCallback((step: OnboardingStep, stepData: unknown) => {
    const key = getStorageKey(step)
    if (key && typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(stepData))
      } catch (err) {
        loggerRef.current.error('Failed to save to localStorage', { error: err })
      }
    }
  }, [getStorageKey])

  // Load step data from localStorage
  const loadStepFromLocalStorage = useCallback((step: OnboardingStep) => {
    const key = getStorageKey(step)
    if (key && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(key)
        return stored ? JSON.parse(stored) : null
      } catch (err) {
        loggerRef.current.error('Failed to load from localStorage', { error: err })
        return null
      }
    }
    return null
  }, [getStorageKey])

  // Clear all onboarding localStorage data
  const clearOnboardingStorage = useCallback(() => {
    if (user && typeof window !== 'undefined') {
      try {
        STEP_ORDER.forEach(step => {
          const key = getStorageKey(step)
          if (key) localStorage.removeItem(key)
        })
      } catch (err) {
        loggerRef.current.error('Failed to clear localStorage', { error: err })
      }
    }
  }, [user, getStorageKey])

  // Update state when step changes
  useEffect(() => {
    const stepIndex = STEP_ORDER.indexOf(state.currentStep)
    const canSkip = SKIPPABLE_STEPS.includes(state.currentStep)

    setState(prev => ({
      ...prev,
      currentStepIndex: stepIndex,
      canSkipStep: canSkip
    }))
  }, [state.currentStep])

  const loadProgress = useCallback(async () => {
    if (!user) return

    try {
      setIsLoading(true)

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_step, onboarding_completed, onboarding_skipped, name')
        .eq('id', user.id)
        .single()

      if (error) throw error

      if (profile?.onboarding_completed) {
        router.push('/dashboard')
        return
      }

      // Load data from localStorage or database
      const storedProfile = loadStepFromLocalStorage('profile-setup')
      const storedChild = loadStepFromLocalStorage('child-setup')
      const storedFirstUpdate = loadStepFromLocalStorage('first-update')

      // Pre-populate profile data if available (prefer localStorage, fallback to database)
      if (storedProfile || profile?.name) {
        setData(prev => ({
          ...prev,
          profile: storedProfile || {
            ...prev.profile,
            name: profile.name,
            timezone: prev.profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            emailNotifications: prev.profile?.emailNotifications ?? true,
            smsNotifications: prev.profile?.smsNotifications ?? false,
            pushNotifications: prev.profile?.pushNotifications ?? true
          },
          child: storedChild || prev.child,
          firstUpdate: storedFirstUpdate || prev.firstUpdate
        }))
      }

      if (profile?.onboarding_step && profile.onboarding_step > 0) {
        const stepIndex = Math.min(profile.onboarding_step, STEP_ORDER.length - 1)
        const currentStep = STEP_ORDER[stepIndex]

        setState(prev => ({
          ...prev,
          currentStep,
          currentStepIndex: stepIndex
        }))
      }
    } catch (err) {
      loggerRef.current.error('Failed to load onboarding progress:', { error: err })
      setError('Failed to load progress')
    } finally {
      setIsLoading(false)
    }
  }, [user, supabase, router, loadStepFromLocalStorage])

  // Load existing progress when user changes
  useEffect(() => {
    if (user) {
      void loadProgress()
    }
  }, [user, loadProgress])

  const saveProgress = useCallback(async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_step: state.currentStepIndex,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error
    } catch (err) {
      loggerRef.current.error('Failed to save progress:', { error: err })
      // Don't throw here as it's a background operation
    }
  }, [user, supabase, state.currentStepIndex])

  const completeOnboarding = useCallback(async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

      // Save child data if provided
      if (data.child && data.child.name && data.child.birth_date) {
        try {
          await createChild({
            name: data.child.name,
            birth_date: data.child.birth_date,
            // Note: Profile photo upload would be handled separately
          })
        } catch (childError) {
          loggerRef.current.errorWithStack('Failed to create child:', childError as Error)
          // Continue with onboarding completion even if child creation fails
        }
      }

      // Save recipient data if provided
      if (data.recipients?.recipients && data.recipients.recipients.length > 0) {
        try {
          for (const recipient of data.recipients.recipients) {
            await createRecipient(recipient)
          }
        } catch (recipientError) {
          loggerRef.current.errorWithStack('Failed to create recipients:', recipientError as Error)
          // Continue with onboarding completion
        }
      }

      // Update profile notifications if provided
      if (data.profile) {
        try {
          const notificationPrefs = {
            email: data.profile.emailNotifications,
            sms: data.profile.smsNotifications,
            push: data.profile.pushNotifications,
            timezone: data.profile.timezone
          }

          await supabase
            .from('profiles')
            .update({
              name: data.profile.name,
              notification_preferences: notificationPrefs,
              onboarding_completed: true,
              onboarding_step: STEP_ORDER.length,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
        } catch (profileError) {
          loggerRef.current.errorWithStack('Failed to update profile:', profileError as Error)
        }
      } else {
        // Just mark onboarding as completed
        await supabase
          .from('profiles')
          .update({
            onboarding_completed: true,
            onboarding_step: STEP_ORDER.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
      }

      // Clear localStorage cache on completion
      clearOnboardingStorage()

      // Navigate to dashboard
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding')
    } finally {
      setIsLoading(false)
    }
  }, [user, data, supabase, router, clearOnboardingStorage])

  const nextStep = useCallback(async () => {
    const currentIndex = state.currentStepIndex
    const currentStep = state.currentStep

    // Mark current step as completed
    setState(prev => ({
      ...prev,
      completedSteps: new Set([...prev.completedSteps, currentStep])
    }))

    // Move to next step
    if (currentIndex < STEP_ORDER.length - 1) {
      const nextStep = STEP_ORDER[currentIndex + 1]

      if (typeof window !== 'undefined' && window.gtag) {
        if (currentStep === 'first-update') {
          window.gtag('event', 'reflection_entry_completed', {
            event_category: 'reflection',
            event_label: currentStep,
            timestamp: new Date().toISOString()
          })
        } else if (nextStep === 'first-update') {
          window.gtag('event', 'reflection_entry_opened', {
            event_category: 'reflection',
            event_label: nextStep,
            timestamp: new Date().toISOString()
          })
        }
      }

      setState(prev => ({
        ...prev,
        currentStep: nextStep,
        currentStepIndex: currentIndex + 1
      }))

      await saveProgress()
    } else {
      if (typeof window !== 'undefined' && window.gtag && currentStep === 'first-update') {
        window.gtag('event', 'reflection_entry_completed', {
          event_category: 'reflection',
          event_label: currentStep,
          timestamp: new Date().toISOString()
        })
      }

      // Complete onboarding
      await completeOnboarding()
    }
  }, [state, saveProgress, completeOnboarding])

  const previousStep = useCallback(() => {
    setState(prev => {
      const currentIndex = prev.currentStepIndex
      if (currentIndex > 0) {
        const prevStep = STEP_ORDER[currentIndex - 1]
        return {
          ...prev,
          currentStep: prevStep,
          currentStepIndex: currentIndex - 1
        }
      }

      return prev
    })
  }, [])

  const skipStep = useCallback(async () => {
    const currentStep = state.currentStep
    if (!SKIPPABLE_STEPS.includes(currentStep)) {
      setError('This step cannot be skipped')
      return
    }

    if (typeof window !== 'undefined' && window.gtag && currentStep === 'first-update') {
      window.gtag('event', 'reflection_entry_skipped', {
        event_category: 'reflection',
        event_label: currentStep,
        timestamp: new Date().toISOString()
      })
    }

    // Mark step as skipped
    setState(prev => ({
      ...prev,
      skippedSteps: new Set([...prev.skippedSteps, currentStep])
    }))

    // Save progress including skip
    await saveProgress()

    await nextStep()
  }, [state.currentStep, nextStep, saveProgress])

  const goToStep = useCallback((step: OnboardingStep) => {
    const stepIndex = STEP_ORDER.indexOf(step)

    if (stepIndex === -1) {
      setError('Invalid step')
      return
    }

    if (typeof window !== 'undefined' && window.gtag && step === 'first-update') {
      window.gtag('event', 'reflection_entry_opened', {
        event_category: 'reflection',
        event_label: step,
        timestamp: new Date().toISOString()
      })
    }

    setState(prev => ({
      ...prev,
      currentStep: step,
      currentStepIndex: stepIndex
    }))
  }, [])

  const updateProfileData = useCallback((newData: Partial<ProfileSetupData>) => {
    const updatedProfile = { ...data.profile, ...newData } as ProfileSetupData
    setData(prev => ({
      ...prev,
      profile: updatedProfile
    }))
    saveStepToLocalStorage('profile-setup', updatedProfile)
    setError(null)
  }, [data.profile, saveStepToLocalStorage])

  const updateChildData = useCallback((newData: Partial<ChildSetupData>) => {
    const updatedChild = { ...data.child, ...newData } as ChildSetupData
    setData(prev => ({
      ...prev,
      child: updatedChild
    }))
    saveStepToLocalStorage('child-setup', updatedChild)
    setError(null)
  }, [data.child, saveStepToLocalStorage])

  const updateRecipientData = useCallback((newData: Partial<RecipientSetupData>) => {
    setData(prev => ({
      ...prev,
      recipients: { ...prev.recipients, ...newData } as RecipientSetupData
    }))
    setError(null)
  }, [])

  const updateFirstUpdateData = useCallback((newData: Partial<FirstUpdateData>) => {
    const updatedFirstUpdate = { ...data.firstUpdate, ...newData } as FirstUpdateData
    setData(prev => ({
      ...prev,
      firstUpdate: updatedFirstUpdate
    }))
    saveStepToLocalStorage('first-update', updatedFirstUpdate)
    setError(null)
  }, [data.firstUpdate, saveStepToLocalStorage])

  const resetOnboarding = useCallback(async () => {
    if (!user) return

    try {
      setIsLoading(true)

      await supabase
        .from('profiles')
        .update({
          onboarding_completed: false,
          onboarding_step: 0,
          onboarding_skipped: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      setState({
        currentStep: 'welcome',
        completedSteps: new Set(),
        skippedSteps: new Set(),
        canSkipStep: false,
        totalSteps: STEP_ORDER.length,
        currentStepIndex: 0
      })

      setData({})
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset onboarding')
    } finally {
      setIsLoading(false)
    }
  }, [user, supabase])

  const dismissOnboarding = useCallback(async () => {
    if (!user) return

    try {
      setIsLoading(true)

      // Mark onboarding as completed but skipped
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_skipped: true,
          onboarding_step: STEP_ORDER.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      // Clear localStorage cache
      clearOnboardingStorage()

      // Navigate to dashboard
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dismiss onboarding')
    } finally {
      setIsLoading(false)
    }
  }, [user, supabase, router, clearOnboardingStorage])

  const getStepProgress = useCallback((): number => {
    return Math.round((state.currentStepIndex / (STEP_ORDER.length - 1)) * 100)
  }, [state.currentStepIndex])

  const canProceedToNext = useCallback((): boolean => {
    switch (state.currentStep) {
      case 'welcome':
        return true
      case 'profile-setup':
        return Boolean(data.profile?.name && data.profile?.timezone)
      case 'child-setup':
        return Boolean(data.child?.name && data.child?.birth_date)
      case 'first-update':
        return Boolean(data.firstUpdate?.content && data.firstUpdate?.childId) || state.canSkipStep
      case 'completion':
        return true
      default:
        return false
    }
  }, [state.currentStep, state.canSkipStep, data])

  const isStepCompleted = useCallback((step: OnboardingStep): boolean => {
    return state.completedSteps.has(step)
  }, [state.completedSteps])

  const isStepSkipped = useCallback((step: OnboardingStep): boolean => {
    return state.skippedSteps.has(step)
  }, [state.skippedSteps])

  return {
    state,
    data,
    isLoading,
    error,
    nextStep,
    previousStep,
    skipStep,
    goToStep,
    updateProfileData,
    updateChildData,
    updateRecipientData,
    updateFirstUpdateData,
    saveProgress,
    completeOnboarding,
    resetOnboarding,
    dismissOnboarding,
    getStepProgress,
    canProceedToNext,
    isStepCompleted,
    isStepSkipped
  }
}
