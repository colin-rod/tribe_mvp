import { createClient } from './supabase/client'
import type { OnboardingStep } from '@/hooks/useOnboarding'
import { createLogger } from '@/lib/logger'

const logger = createLogger('Onboarding')

export interface OnboardingProgress {
  currentStep: number
  completedSteps: OnboardingStep[]
  skippedSteps: OnboardingStep[]
  isCompleted: boolean
  lastUpdated: string
}

export interface OnboardingStepInfo {
  id: OnboardingStep
  title: string
  description: string
  icon: string
  estimatedTimeMinutes: number
  isRequired: boolean
  tips: string[]
}

export const ONBOARDING_STEPS: OnboardingStepInfo[] = [
  {
    id: 'welcome',
    title: 'Welcome to Tribe',
    description: 'Get started with smart family updates',
    icon: 'hand-wave',
    estimatedTimeMinutes: 0.25,
    isRequired: true,
    tips: [
      'Quick setup in under 3 minutes',
      'Privacy-first design keeps your family safe'
    ]
  },
  {
    id: 'profile-setup',
    title: 'Your Profile',
    description: 'Basic info to get started',
    icon: 'user',
    estimatedTimeMinutes: 0.5,
    isRequired: true,
    tips: [
      'Just your name and timezone',
      'Change anytime in settings'
    ]
  },
  {
    id: 'child-setup',
    title: 'Add Your Child',
    description: 'Name and birth date',
    icon: 'baby',
    estimatedTimeMinutes: 0.5,
    isRequired: true,
    tips: [
      'Name and birth date are required',
      'Photo is optional'
    ]
  },
  {
    id: 'recipient-setup',
    title: 'Add Family & Friends',
    description: 'Choose who gets updates',
    icon: 'users',
    estimatedTimeMinutes: 1,
    isRequired: false,
    tips: [
      'Start with close family',
      'Add more people later'
    ]
  },
  {
    id: 'first-update',
    title: 'First Update',
    description: 'Share your first moment (optional)',
    icon: 'pencil',
    estimatedTimeMinutes: 0.5,
    isRequired: false,
    tips: [
      'Skip this and share later',
      'AI suggests recipients'
    ]
  },
  {
    id: 'completion',
    title: 'All Set!',
    description: 'You\'re ready to start sharing',
    icon: 'check-circle',
    estimatedTimeMinutes: 0.25,
    isRequired: true,
    tips: [
      'Dashboard is ready',
      'Start sharing moments'
    ]
  }
]

/**
 * Get step information by ID
 */
export function getStepInfo(stepId: OnboardingStep): OnboardingStepInfo | undefined {
  return ONBOARDING_STEPS.find(step => step.id === stepId)
}

/**
 * Get all steps information
 */
export function getAllSteps(): OnboardingStepInfo[] {
  return ONBOARDING_STEPS
}

/**
 * Get required steps only
 */
export function getRequiredSteps(): OnboardingStepInfo[] {
  return ONBOARDING_STEPS.filter(step => step.isRequired)
}

/**
 * Get optional steps only
 */
export function getOptionalSteps(): OnboardingStepInfo[] {
  return ONBOARDING_STEPS.filter(step => !step.isRequired)
}

/**
 * Calculate total estimated time for all steps
 */
export function getTotalEstimatedTime(): number {
  return ONBOARDING_STEPS.reduce((total, step) => total + step.estimatedTimeMinutes, 0)
}

/**
 * Calculate estimated time for remaining steps
 */
export function getRemainingEstimatedTime(currentStepIndex: number): number {
  return ONBOARDING_STEPS
    .slice(currentStepIndex)
    .reduce((total, step) => total + step.estimatedTimeMinutes, 0)
}

/**
 * Check if a step can be skipped
 */
export function canSkipStep(stepId: OnboardingStep): boolean {
  const stepInfo = getStepInfo(stepId)
  return stepInfo ? !stepInfo.isRequired : false
}

/**
 * Get next step ID
 */
export function getNextStep(currentStep: OnboardingStep): OnboardingStep | null {
  const currentIndex = ONBOARDING_STEPS.findIndex(step => step.id === currentStep)
  if (currentIndex === -1 || currentIndex === ONBOARDING_STEPS.length - 1) {
    return null
  }
  return ONBOARDING_STEPS[currentIndex + 1].id
}

/**
 * Get previous step ID
 */
export function getPreviousStep(currentStep: OnboardingStep): OnboardingStep | null {
  const currentIndex = ONBOARDING_STEPS.findIndex(step => step.id === currentStep)
  if (currentIndex <= 0) {
    return null
  }
  return ONBOARDING_STEPS[currentIndex - 1].id
}

/**
 * Calculate completion percentage
 */
export function calculateProgress(currentStepIndex: number, totalSteps: number = ONBOARDING_STEPS.length): number {
  if (totalSteps === 0) return 0
  return Math.round((currentStepIndex / (totalSteps - 1)) * 100)
}

/**
 * Get user's onboarding progress from database
 */
export async function getUserOnboardingProgress(userId: string): Promise<OnboardingProgress | null> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_step, onboarding_completed, onboarding_skipped, updated_at')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return null
    }

    return {
      currentStep: data.onboarding_step || 0,
      completedSteps: [], // Would need additional tracking for this
      skippedSteps: [], // Would need additional tracking for this
      isCompleted: data.onboarding_completed || false,
      lastUpdated: data.updated_at
    }
  } catch (error) {
    logger.errorWithStack('Failed to get onboarding progress:', error as Error)
    return null
  }
}

/**
 * Update user's onboarding progress in database
 */
export async function updateUserOnboardingProgress(
  userId: string,
  stepIndex: number,
  isCompleted: boolean = false
): Promise<boolean> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        onboarding_step: stepIndex,
        onboarding_completed: isCompleted,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) {
      logger.errorWithStack('Failed to update onboarding progress:', error as Error)
      return false
    }

    return true
  } catch (error) {
    logger.errorWithStack('Failed to update onboarding progress:', error as Error)
    return false
  }
}

/**
 * Mark onboarding as completed
 */
export async function completeUserOnboarding(userId: string): Promise<boolean> {
  return updateUserOnboardingProgress(userId, ONBOARDING_STEPS.length - 1, true)
}

/**
 * Reset user's onboarding progress
 */
export async function resetUserOnboarding(userId: string): Promise<boolean> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        onboarding_step: 0,
        onboarding_completed: false,
        onboarding_skipped: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) {
      logger.errorWithStack('Failed to reset onboarding:', error as Error)
      return false
    }

    return true
  } catch (error) {
    logger.errorWithStack('Failed to reset onboarding:', error as Error)
    return false
  }
}

/**
 * Check if user should see onboarding
 */
export async function shouldShowOnboarding(userId: string): Promise<boolean> {
  const progress = await getUserOnboardingProgress(userId)
  return progress ? !progress.isCompleted : true
}

/**
 * Get onboarding completion statistics
 */
export interface OnboardingStats {
  totalUsers: number
  completedUsers: number
  completionRate: number
  averageTimeToComplete: number
  mostSkippedStep: OnboardingStep | null
  mostAbandonedStep: OnboardingStep | null
}

/**
 * Privacy-focused onboarding messaging
 */
export const PRIVACY_MESSAGES = {
  dataCollection: 'Your data is never sold or shared with third parties.',
  photoSecurity: 'Photos are encrypted. Only people you add can see updates.',
  aiProcessing: 'AI analyzes content privately to provide smart suggestions.',
  recipientControl: 'Recipients only see what you choose to share.',
  dataOwnership: 'You own your data. Export or delete anytime.',
  childProtection: 'No public profiles. No discovery. No stranger contact.'
}

/**
 * Get privacy message for current step
 */
export function getPrivacyMessageForStep(stepId: OnboardingStep): string {
  switch (stepId) {
    case 'welcome':
      return PRIVACY_MESSAGES.dataCollection
    case 'profile-setup':
      return PRIVACY_MESSAGES.dataOwnership
    case 'child-setup':
      return PRIVACY_MESSAGES.photoSecurity
    case 'recipient-setup':
      return PRIVACY_MESSAGES.recipientControl
    case 'first-update':
      return PRIVACY_MESSAGES.aiProcessing
    case 'completion':
      return PRIVACY_MESSAGES.childProtection
    default:
      return PRIVACY_MESSAGES.dataCollection
  }
}

/**
 * Get onboarding status for current user
 */
export async function getOnboardingStatus() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('onboarding_completed, onboarding_step, onboarding_skipped')
    .eq('id', user.id)
    .single()

  return data
}

/**
 * Check if user needs onboarding
 */
export async function needsOnboarding(): Promise<boolean> {
  try {
    const status = await getOnboardingStatus()
    if (!status) return true // No profile means needs onboarding

    return !status.onboarding_completed && !status.onboarding_skipped
  } catch (error) {
    logger.errorWithStack('Error checking onboarding status:', error as Error)
    return true // Default to needing onboarding if error
  }
}

/**
 * Onboarding validation helpers
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate step completion requirements
 */
export function validateStepCompletion(stepId: OnboardingStep, data: any): ValidationResult {
  const result: ValidationResult = { isValid: true, errors: [], warnings: [] }

  switch (stepId) {
    case 'profile-setup':
      if (!data?.name?.trim()) {
        result.errors.push('Name is required')
        result.isValid = false
      }
      if (!data?.timezone) {
        result.errors.push('Timezone is required')
        result.isValid = false
      }
      break

    case 'child-setup':
      if (!data?.name?.trim()) {
        result.errors.push('Child name is required')
        result.isValid = false
      }
      if (!data?.birth_date) {
        result.errors.push('Birth date is required')
        result.isValid = false
      }
      if (!data?.profile_photo) {
        result.warnings.push('Adding a photo helps make updates more personal')
      }
      break

    case 'recipient-setup':
      if (!data?.recipients?.length) {
        if (canSkipStep(stepId)) {
          result.warnings.push('You can add recipients later from your dashboard')
        } else {
          result.errors.push('At least one recipient is required')
          result.isValid = false
        }
      }
      break

    case 'first-update':
      if (!data?.content?.trim()) {
        if (canSkipStep(stepId)) {
          result.warnings.push('You can create your first update later')
        } else {
          result.errors.push('Update content is required')
          result.isValid = false
        }
      }
      break
  }

  return result
}