'use client'

/**
 * Form Validation Examples
 *
 * Demonstrates comprehensive form validation patterns with:
 * - Real-time validation feedback
 * - Proper ARIA attributes
 * - Accessible error messaging
 * - Common validation patterns
 */

import { useState } from 'react'
import { z } from 'zod'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { FormFeedback } from '@/components/ui/FormFeedback'
import { FormValidationProvider, useFormValidationContext } from '@/contexts/FormValidationContext'
import {
  emailValidation,
  contactFormSchema,
  registrationFormSchema,
} from '@/lib/validation/form-utils'

// ============================================================================
// Example 1: Basic Form with Manual Validation
// ============================================================================

export function BasicFormExample() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const validateEmail = (value: string) => {
    try {
      emailValidation.parse(value)
      setErrors((prev) => ({ ...prev, email: undefined }))
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors((prev) => ({ ...prev, email: error.errors[0]?.message }))
      }
      return false
    }
  }

  const validatePassword = (value: string) => {
    try {
      z.string().min(8, 'Password must be at least 8 characters').parse(value)
      setErrors((prev) => ({ ...prev, password: undefined }))
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors((prev) => ({ ...prev, password: error.errors[0]?.message }))
      }
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitSuccess(false)

    const emailValid = validateEmail(email)
    const passwordValid = validatePassword(password)

    if (!emailValid || !passwordValid) {
      return
    }

    setIsSubmitting(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setSubmitSuccess(true)
      setEmail('')
      setPassword('')
    } catch (error) {
      // Handle submission error silently
      if (error instanceof Error) {
        setErrors({ email: error.message })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Basic Login Form</h2>

      {submitSuccess && (
        <FormFeedback
          type="success"
          message="Login successful!"
          dismissible
          onDismiss={() => setSubmitSuccess(false)}
          className="mb-4"
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            validateEmail(e.target.value)
          }}
          errorMessage={errors.email}
          required
        />

        <Input
          type="password"
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            validatePassword(e.target.value)
          }}
          errorMessage={errors.password}
          showPassword
          required
        />

        <Button
          type="submit"
          disabled={isSubmitting || !!errors.email || !!errors.password}
          className="w-full"
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
    </div>
  )
}

// ============================================================================
// Example 2: Registration Form with Context
// ============================================================================

function RegistrationFormContent() {
  const form = useFormValidationContext<{
    email: string
    password: string
    confirmPassword: string
    acceptTerms: boolean
  }>()

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      form.submitForm()
    }} className="space-y-4">
      <Input
        type="email"
        label="Email"
        description="We'll never share your email with anyone else"
        placeholder="you@example.com"
        value={form.values.email as string}
        onChange={(e) => form.setFieldValue('email', e.target.value)}
        onBlur={() => form.setFieldTouched('email')}
        errorMessage={form.getFieldError('email')}
        required
      />

      <Input
        type="password"
        label="Password"
        description="Must contain at least 8 characters, including uppercase, lowercase, number, and special character"
        placeholder="Create a strong password"
        value={form.values.password as string}
        onChange={(e) => form.setFieldValue('password', e.target.value)}
        onBlur={() => form.setFieldTouched('password')}
        errorMessage={form.getFieldError('password')}
        showPassword
        required
      />

      <Input
        type="password"
        label="Confirm Password"
        placeholder="Re-enter your password"
        value={form.values.confirmPassword as string}
        onChange={(e) => form.setFieldValue('confirmPassword', e.target.value)}
        onBlur={() => form.setFieldTouched('confirmPassword')}
        errorMessage={form.getFieldError('confirmPassword')}
        showPassword
        required
      />

      <div className="flex items-start">
        <input
          type="checkbox"
          id="acceptTerms"
          checked={form.values.acceptTerms as boolean}
          onChange={(e) => form.setFieldValue('acceptTerms', e.target.checked)}
          className="mt-1 mr-2"
          required
        />
        <label htmlFor="acceptTerms" className="text-sm text-neutral-700">
          I accept the{' '}
          <a href="/terms" className="text-primary-600 hover:underline">
            terms and conditions
          </a>
          <span className="text-error-500 ml-1" aria-hidden="true">*</span>
        </label>
      </div>
      {form.getFieldError('acceptTerms') && (
        <p className="text-sm text-error-600" role="alert">
          {form.getFieldError('acceptTerms')}
        </p>
      )}

      <Button
        type="submit"
        disabled={form.isSubmitting || !form.isValid}
        className="w-full"
      >
        {form.isSubmitting ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  )
}

export function RegistrationFormExample() {
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const handleSubmit = async (_values: {
    email: string
    password: string
    confirmPassword: string
    acceptTerms: boolean
  }) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    // Registration successful
    setSubmitSuccess(true)
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Create Your Account</h2>

      {submitSuccess && (
        <FormFeedback
          type="success"
          message="Account created successfully!"
          title="Welcome!"
          dismissible
          onDismiss={() => setSubmitSuccess(false)}
          className="mb-4"
        />
      )}

      <FormValidationProvider
        initialValues={{
          email: '',
          password: '',
          confirmPassword: '',
          acceptTerms: false,
        }}
        validationSchema={registrationFormSchema}
        onSubmit={handleSubmit}
        validateOnChange
        validateOnBlur
      >
        <RegistrationFormContent />
      </FormValidationProvider>
    </div>
  )
}

// ============================================================================
// Example 3: Contact Form with Textarea
// ============================================================================

function ContactFormContent() {
  const form = useFormValidationContext<{
    name: string
    email: string
    subject: string
    message: string
  }>()

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      form.submitForm()
    }} className="space-y-4">
      <Input
        type="text"
        label="Name"
        placeholder="Your full name"
        value={form.values.name as string}
        onChange={(e) => form.setFieldValue('name', e.target.value)}
        onBlur={() => form.setFieldTouched('name')}
        errorMessage={form.getFieldError('name')}
        required
      />

      <Input
        type="email"
        label="Email"
        placeholder="your.email@example.com"
        value={form.values.email as string}
        onChange={(e) => form.setFieldValue('email', e.target.value)}
        onBlur={() => form.setFieldTouched('email')}
        errorMessage={form.getFieldError('email')}
        helperText="We'll respond to this email address"
        required
      />

      <Input
        type="text"
        label="Subject"
        placeholder="What is this about?"
        value={form.values.subject as string}
        onChange={(e) => form.setFieldValue('subject', e.target.value)}
        onBlur={() => form.setFieldTouched('subject')}
        errorMessage={form.getFieldError('subject')}
        required
      />

      <Textarea
        label="Message"
        description="Please provide as much detail as possible"
        placeholder="Tell us what you're thinking..."
        value={form.values.message as string}
        onChange={(e) => form.setFieldValue('message', e.target.value)}
        onBlur={() => form.setFieldTouched('message')}
        errorMessage={form.getFieldError('message')}
        maxLength={2000}
        showCharCount
        rows={6}
        required
      />

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => form.resetForm()}
          disabled={form.isSubmitting}
        >
          Clear
        </Button>
        <Button
          type="submit"
          disabled={form.isSubmitting || !form.isValid}
          className="flex-1"
        >
          {form.isSubmitting ? 'Sending...' : 'Send Message'}
        </Button>
      </div>
    </form>
  )
}

export function ContactFormExample() {
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const handleSubmit = async (_values: {
    name: string
    email: string
    subject: string
    message: string
  }) => {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    // Contact form submitted successfully
    setSubmitSuccess(true)
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-2">Contact Us</h2>
      <p className="text-neutral-600 mb-6">
        Have a question or feedback? We&apos;d love to hear from you.
      </p>

      {submitSuccess && (
        <FormFeedback
          type="success"
          message="Your message has been sent successfully!"
          title="Thank you!"
          dismissible
          onDismiss={() => setSubmitSuccess(false)}
          className="mb-4"
        />
      )}

      <FormValidationProvider
        initialValues={{
          name: '',
          email: '',
          subject: '',
          message: '',
        }}
        validationSchema={contactFormSchema}
        onSubmit={handleSubmit}
        validateOnBlur
        validateDebounceMs={500}
      >
        <ContactFormContent />
      </FormValidationProvider>
    </div>
  )
}

// ============================================================================
// Example 4: All Examples Combined
// ============================================================================

export function FormValidationExamplesShowcase() {
  const [activeExample, setActiveExample] = useState<'basic' | 'registration' | 'contact'>('basic')

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-neutral-900 mb-2">
            Form Validation Examples
          </h1>
          <p className="text-lg text-neutral-600">
            Comprehensive, accessible form validation patterns
          </p>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          <Button
            variant={activeExample === 'basic' ? 'primary' : 'outline'}
            onClick={() => setActiveExample('basic')}
          >
            Basic Form
          </Button>
          <Button
            variant={activeExample === 'registration' ? 'primary' : 'outline'}
            onClick={() => setActiveExample('registration')}
          >
            Registration
          </Button>
          <Button
            variant={activeExample === 'contact' ? 'primary' : 'outline'}
            onClick={() => setActiveExample('contact')}
          >
            Contact Form
          </Button>
        </div>

        <div>
          {activeExample === 'basic' && <BasicFormExample />}
          {activeExample === 'registration' && <RegistrationFormExample />}
          {activeExample === 'contact' && <ContactFormExample />}
        </div>

        <div className="mt-12 p-6 bg-white rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">Features</h3>
          <ul className="space-y-2 text-neutral-700">
            <li className="flex items-start">
              <span className="text-success-500 mr-2">✓</span>
              Real-time validation with debouncing
            </li>
            <li className="flex items-start">
              <span className="text-success-500 mr-2">✓</span>
              Proper ARIA attributes for accessibility
            </li>
            <li className="flex items-start">
              <span className="text-success-500 mr-2">✓</span>
              Screen reader announcements for errors
            </li>
            <li className="flex items-start">
              <span className="text-success-500 mr-2">✓</span>
              Consistent error message styling
            </li>
            <li className="flex items-start">
              <span className="text-success-500 mr-2">✓</span>
              Common validation rules and patterns
            </li>
            <li className="flex items-start">
              <span className="text-success-500 mr-2">✓</span>
              Context-based form state management
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
