/**
 * Password Validation Utilities
 * CRO-262: Password Reset Flow
 *
 * Validation and strength checking for passwords
 */

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4
  feedback: string[]
  warning?: string
}

/**
 * Calculate password strength with detailed feedback
 * Score: 0 (very weak) to 4 (strong)
 */
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      score: 0,
      feedback: ['Enter a password'],
      warning: 'Password is required'
    }
  }

  let score = 0
  const feedback: string[] = []
  let warning: string | undefined

  // Length checks
  if (password.length < 6) {
    feedback.push('Use at least 6 characters')
    warning = 'Password is too short'
  } else if (password.length >= 8) {
    score += 1
    if (password.length >= 12) {
      score += 1 // Bonus for extra length
    }
  } else {
    feedback.push('Use at least 8 characters for better security')
  }

  // Character variety checks
  const hasLowerCase = /[a-z]/.test(password)
  const hasUpperCase = /[A-Z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChars = /[^a-zA-Z0-9]/.test(password)

  if (hasLowerCase && hasUpperCase) {
    score += 1
  } else if (hasLowerCase || hasUpperCase) {
    feedback.push('Use both uppercase and lowercase letters')
  } else {
    feedback.push('Include letters in your password')
    warning = 'Password must contain letters'
  }

  if (hasNumbers) {
    score += 1
  } else {
    feedback.push('Include at least one number')
  }

  if (hasSpecialChars) {
    score += 1
  } else {
    feedback.push('Include special characters (!@#$%^&*) for better security')
  }

  // Common patterns check
  const commonPatterns = [
    /^123+/,
    /^abc+/i,
    /password/i,
    /^qwerty/i,
    /(.)\1{2,}/, // Repeated characters
  ]

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      score = Math.max(0, score - 1)
      warning = 'Avoid common patterns and repeated characters'
      break
    }
  }

  // Cap score at 4
  score = Math.min(4, score) as PasswordStrengthResult['score']

  // Add positive feedback for strong passwords
  if (score >= 3 && feedback.length === 0) {
    feedback.push('Strong password!')
  }

  return {
    score: score as PasswordStrengthResult['score'],
    feedback,
    warning
  }
}

/**
 * Validate password meets minimum requirements
 */
export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!password) {
    errors.push('Password is required')
    return { isValid: false, errors }
  }

  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long')
  }

  if (password.length > 72) {
    errors.push('Password must be less than 72 characters')
  }

  // Basic character requirements (not too strict, Supabase is flexible)
  const hasLetters = /[a-zA-Z]/.test(password)
  if (!hasLetters) {
    errors.push('Password must contain at least one letter')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate passwords match
 */
export function validatePasswordMatch(
  password: string,
  confirmPassword: string
): {
  isValid: boolean
  error?: string
} {
  if (!confirmPassword) {
    return {
      isValid: false,
      error: 'Please confirm your password'
    }
  }

  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: 'Passwords do not match'
    }
  }

  return { isValid: true }
}

/**
 * Check if password is strong enough (score >= 2)
 */
export function isPasswordStrong(password: string): boolean {
  const strength = calculatePasswordStrength(password)
  return strength.score >= 2
}

/**
 * Get user-friendly description of password strength
 */
export function getPasswordStrengthLabel(score: number): string {
  const labels = {
    0: 'Very Weak',
    1: 'Weak',
    2: 'Fair',
    3: 'Good',
    4: 'Strong'
  }
  return labels[score as keyof typeof labels] || 'Unknown'
}

/**
 * Sanitize password input (trim whitespace)
 */
export function sanitizePassword(password: string): string {
  // Only trim - don't modify the actual password content
  return password.trim()
}
