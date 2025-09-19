'use client'

import { useState, useCallback, useEffect } from 'react'
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
  'recipient-setup',
  'first-update',
  'completion'
]

const SKIPPABLE_STEPS: OnboardingStep[] = [
  'recipient-setup',
  'first-update'
]

export function useOnboarding(): UseOnboardingReturn {
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

  // Load existing progress on mount
  useEffect(() => {
    if (user) {
      loadProgress()
    }
  }, [user])

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
        .select('onboarding_step, onboarding_completed, onboarding_skipped')
        .eq('id', user.id)
        .single()

      if (error) throw error

      if (profile?.onboarding_completed) {
        router.push('/dashboard')
        return
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
      console.error('Failed to load onboarding progress:', err)
      setError('Failed to load progress')
    } finally {
      setIsLoading(false)
    }
  }, [user, supabase, router])

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
      console.error('Failed to save progress:', err)
      // Don't throw here as it's a background operation
    }
  }, [user, supabase, state.currentStepIndex])

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
      setState(prev => ({
        ...prev,
        currentStep: nextStep,
        currentStepIndex: currentIndex + 1
      }))

      await saveProgress()
    } else {
      // Complete onboarding
      await completeOnboarding()
    }
  }, [state, saveProgress])

  const previousStep = useCallback(() => {
    const currentIndex = state.currentStepIndex

    if (currentIndex > 0) {
      const prevStep = STEP_ORDER[currentIndex - 1]
      setState(prev => ({
        ...prev,
        currentStep: prevStep,
        currentStepIndex: currentIndex - 1
      }))
    }
  }, [state.currentStepIndex])

  const skipStep = useCallback(async () => {
    const currentStep = state.currentStep

    if (!SKIPPABLE_STEPS.includes(currentStep)) {
      setError('This step cannot be skipped')
      return
    }

    // Mark step as skipped
    setState(prev => ({
      ...prev,
      skippedSteps: new Set([...prev.skippedSteps, currentStep])
    }))

    await nextStep()
  }, [state.currentStep, nextStep])

  const goToStep = useCallback((step: OnboardingStep) => {
    const stepIndex = STEP_ORDER.indexOf(step)

    if (stepIndex === -1) {
      setError('Invalid step')
      return
    }

    setState(prev => ({
      ...prev,
      currentStep: step,
      currentStepIndex: stepIndex
    }))
  }, [])

  const updateProfileData = useCallback((newData: Partial<ProfileSetupData>) => {
    setData(prev => ({
      ...prev,
      profile: { ...prev.profile, ...newData } as ProfileSetupData
    }))
    setError(null)
  }, [])

  const updateChildData = useCallback((newData: Partial<ChildSetupData>) => {
    setData(prev => ({
      ...prev,
      child: { ...prev.child, ...newData } as ChildSetupData
    }))
    setError(null)
  }, [])

  const updateRecipientData = useCallback((newData: Partial<RecipientSetupData>) => {
    setData(prev => ({
      ...prev,
      recipients: { ...prev.recipients, ...newData } as RecipientSetupData
    }))
    setError(null)
  }, [])

  const updateFirstUpdateData = useCallback((newData: Partial<FirstUpdateData>) => {
    setData(prev => ({
      ...prev,
      firstUpdate: { ...prev.firstUpdate, ...newData } as FirstUpdateData
    }))
    setError(null)
  }, [])

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
          console.error('Failed to create child:', childError)
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
          console.error('Failed to create recipients:', recipientError)
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
          console.error('Failed to update profile:', profileError)
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

      // Navigate to dashboard
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding')
    } finally {
      setIsLoading(false)
    }
  }, [user, data, supabase, router])

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
      case 'recipient-setup':
        return Boolean(data.recipients?.recipients?.length) || state.canSkipStep
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
    getStepProgress,
    canProceedToNext,
    isStepCompleted,
    isStepSkipped
  }
}