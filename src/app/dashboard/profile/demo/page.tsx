'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('Page')
import React from 'react'
import { Button } from '@/components/ui/Button'
import { PasswordStrengthIndicator, PasswordStrengthCompact } from '@/components/ui/PasswordStrengthIndicator'
import { Alert } from '@/components/ui/Alert'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import type { PasswordStrength } from '@/lib/types/profile'

export default function ProfileDemoPage() {
  const [showDialog, setShowDialog] = React.useState(false)
  const [password, setPassword] = React.useState('')

  // Calculate password strength for demo
  const calculatePasswordStrength = (password: string): PasswordStrength => {
    if (!password) return { score: 0, feedback: ['Enter a password'] }

    let score = 0
    const feedback: string[] = []

    if (password.length >= 8) score += 1
    else feedback.push('Use at least 8 characters')

    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
    else feedback.push('Use both uppercase and lowercase letters')

    if (/\d/.test(password)) score += 1
    else feedback.push('Include at least one number')

    if (/[^a-zA-Z0-9]/.test(password)) score += 1
    else feedback.push('Include special characters (!@#$%^&*)')

    if (password.length >= 12) score = Math.min(score + 1, 4)

    return {
      score: score as PasswordStrength['score'],
      feedback: feedback.length > 0 ? feedback : ['Strong password!']
    }
  }

  const passwordStrength = calculatePasswordStrength(password)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile UI Components Demo</h1>
          <p className="mt-2 text-sm text-gray-600">
            Comprehensive showcase of all profile management UI components
          </p>
        </div>

        <div className="space-y-12">
          {/* Form Field Examples */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Form Fields with Accessibility</h2>
            <div className="space-y-6 max-w-lg">
              <FormField
                label="Email Address"
                required
                description="Your primary email for account notifications"
              >
                <Input
                  type="email"
                  placeholder="Enter your email"
                  defaultValue="user@example.com"
                />
              </FormField>

              <FormField
                label="Bio"
                optional
                description="Tell others about yourself (optional)"
                error="Bio must be less than 300 characters"
              >
                <textarea
                  rows={3}
                  placeholder="Write a brief bio..."
                  className="flex w-full rounded-md border border-red-500 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </FormField>
            </div>
          </section>

          {/* Password Strength Indicator */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Password Strength Visualization</h2>
            <div className="space-y-6 max-w-lg">
              <FormField
                label="Password"
                description="Try different passwords to see strength indicators"
              >
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a password to test"
                />
                {password && (
                  <PasswordStrengthIndicator strength={passwordStrength} />
                )}
              </FormField>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Compact Version:</h3>
                <PasswordStrengthCompact strength={passwordStrength} />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-900">Test Passwords:</h3>
                <div className="flex flex-wrap gap-2">
                  {['weak', 'Better123', 'Strong!Pass1', 'VerySecure!Password123'].map((testPassword) => (
                    <Button
                      key={testPassword}
                      variant="outline"
                      size="sm"
                      onClick={() => setPassword(testPassword)}
                    >
                      &quot;{testPassword}&quot;
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Form Messages */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Form Messages & Feedback</h2>
            <div className="space-y-4">
              <Alert variant="success" title="Profile updated successfully!">
                All changes have been saved to your account.
              </Alert>

              <Alert variant="error" title="Failed to update profile">
                Please check your internet connection and try again.
              </Alert>

              <Alert variant="warning" title="Your password will expire soon">
                Consider updating your password for better security.
              </Alert>

              <Alert variant="info" title="Two-factor authentication recommended">
                Enable 2FA to add an extra layer of security to your account.
              </Alert>
            </div>
          </section>

          {/* Confirmation Dialogs */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Confirmation Dialogs</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button
                  variant="destructive"
                  onClick={() => setShowDialog(true)}
                >
                  Delete Account
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDialog(true)}
                >
                  Export Data
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                Click buttons to see accessible confirmation dialogs with focus management.
              </p>
            </div>
          </section>

          {/* Color Contrast Examples */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">WCAG 2.1 AA Compliance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-base font-medium mb-3">Text Contrast</h3>
                <div className="space-y-2">
                  <div className="text-gray-900">Primary text (ratio 21:1)</div>
                  <div className="text-gray-600">Secondary text (ratio 7:1)</div>
                  <div className="text-gray-500">Tertiary text (ratio 4.5:1)</div>
                </div>
              </div>
              <div>
                <h3 className="text-base font-medium mb-3">Interactive Elements</h3>
                <div className="space-y-2">
                  <Button className="focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                    Accessible Focus
                  </Button>
                  <div className="text-sm text-gray-600">
                    Focus indicators meet 3:1 contrast ratio
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Responsive Design */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Responsive Design Features</h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-md">
                <h3 className="text-sm font-medium mb-2">Mobile-First Approach</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Tabbed navigation becomes accordion on mobile</li>
                  <li>• Touch-friendly 44px minimum target sizes</li>
                  <li>• Optimized form layouts for small screens</li>
                  <li>• Responsive typography scaling</li>
                </ul>
              </div>
              <div className="p-4 bg-gray-50 rounded-md">
                <h3 className="text-sm font-medium mb-2">Accessibility Features</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Screen reader optimized with proper ARIA labels</li>
                  <li>• Keyboard navigation support</li>
                  <li>• Focus management in modals</li>
                  <li>• Color-blind friendly design</li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* Demo Confirmation Dialog */}
        <ConfirmationDialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          onConfirm={() => {
            logger.info('Action confirmed')
            setShowDialog(false)
          }}
          title="Confirm Action"
          description="This is a demo confirmation dialog. It includes proper focus management, keyboard navigation, and screen reader support."
          confirmText="Confirm"
          cancelText="Cancel"
          variant="destructive"
        >
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              This dialog demonstrates accessibility best practices including focus trapping, escape key handling, and proper ARIA attributes.
            </p>
          </div>
        </ConfirmationDialog>
      </div>
    </div>
  )
}
