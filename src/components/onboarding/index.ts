// Onboarding Components
export { OnboardingProgress, CurrentStepInfo } from './OnboardingProgress'
export { WelcomeStep, WelcomeStepCompact } from './WelcomeStep'
export { ProfileSetupStep, ProfileSetupStepCompact } from './ProfileSetupStep'
export { ChildSetupStep, ChildSetupStepCompact } from './ChildSetupStep'
export { RecipientSetupStep } from './RecipientSetupStep'
export { FirstUpdateStep, FirstUpdateStepCompact } from './FirstUpdateStep'
export { CompletionStep, CompletionStepCompact } from './CompletionStep'

// Re-export types for convenience
export type { OnboardingStep, OnboardingData, ProfileSetupData, ChildSetupData, RecipientSetupData, FirstUpdateData } from '@/hooks/useOnboarding'