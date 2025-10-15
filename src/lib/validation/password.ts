import type { PasswordStrength } from '@/lib/types/profile'

const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MEDIUM_THRESHOLD = 6

export const PASSWORD_REQUIREMENTS = [
  'Use at least 8 characters.',
  'Add a lowercase letter.',
  'Add an uppercase letter.',
  'Include at least one number.',
] as const

const LOWERCASE_REGEX = /[a-z]/
const UPPERCASE_REGEX = /[A-Z]/
const NUMBER_REGEX = /\d/
const SPECIAL_CHAR_REGEX = /[^a-zA-Z0-9]/
const REPEATED_CHAR_REGEX = /(.)\1{2,}/
const COMMON_SEQUENCE_REGEX = /(1234|abcd|password|qwerty)/i

function normalizePassword(password: string): string {
  return password?.trim() ?? ''
}

export function getPasswordStrengthLabel(password: string): 'weak' | 'medium' | 'strong' {
  const normalized = normalizePassword(password)

  if (normalized.length < PASSWORD_MEDIUM_THRESHOLD) {
    return 'weak'
  }

  if (
    normalized.length >= PASSWORD_MIN_LENGTH &&
    LOWERCASE_REGEX.test(normalized) &&
    UPPERCASE_REGEX.test(normalized) &&
    NUMBER_REGEX.test(normalized)
  ) {
    return 'strong'
  }

  return 'medium'
}

export function isValidPassword(password: string): boolean {
  const normalized = normalizePassword(password)

  if (normalized.length < PASSWORD_MIN_LENGTH) return false
  if (!LOWERCASE_REGEX.test(normalized)) return false
  if (!UPPERCASE_REGEX.test(normalized)) return false
  if (!NUMBER_REGEX.test(normalized)) return false

  return true
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const normalized = normalizePassword(password)

  if (!normalized) {
    return {
      score: 0,
      feedback: [...PASSWORD_REQUIREMENTS],
      warning: 'Create a unique password to keep your account secure.',
    }
  }

  const feedbackSet = new Set<string>()

  if (normalized.length < PASSWORD_MIN_LENGTH) {
    feedbackSet.add(PASSWORD_REQUIREMENTS[0])
  }
  if (!LOWERCASE_REGEX.test(normalized)) {
    feedbackSet.add(PASSWORD_REQUIREMENTS[1])
  }
  if (!UPPERCASE_REGEX.test(normalized)) {
    feedbackSet.add(PASSWORD_REQUIREMENTS[2])
  }
  if (!NUMBER_REGEX.test(normalized)) {
    feedbackSet.add(PASSWORD_REQUIREMENTS[3])
  }

  let score = 0

  if (normalized.length >= PASSWORD_MEDIUM_THRESHOLD) {
    score += 1
  }

  if (normalized.length >= PASSWORD_MIN_LENGTH) {
    score += 1
  }

  if (LOWERCASE_REGEX.test(normalized) && UPPERCASE_REGEX.test(normalized)) {
    score += 1
  }

  if (NUMBER_REGEX.test(normalized)) {
    score += 1
  }

  if (SPECIAL_CHAR_REGEX.test(normalized) || normalized.length >= 12) {
    score += 1
  }

  const cappedScore = Math.min(score, 4) as PasswordStrength['score']

  let warning: string | undefined
  if (REPEATED_CHAR_REGEX.test(normalized)) {
    warning = 'Avoid repeating the same character multiple times.'
  } else if (COMMON_SEQUENCE_REGEX.test(normalized)) {
    warning = 'Avoid common words or number patterns.'
  }

  return {
    score: cappedScore,
    feedback: Array.from(feedbackSet),
    warning,
  }
}

export function getPasswordFeedback(password: string): string[] {
  return evaluatePasswordStrength(password).feedback
}

export { PASSWORD_MIN_LENGTH }
