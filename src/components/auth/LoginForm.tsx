'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn, signInWithProvider, getAuthErrorMessage } from '@/lib/supabase/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<null | 'google'>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const rawNext = searchParams?.get('next') ?? ''
  const rawError = searchParams?.get('error')

  const nextPath = useMemo(() => {
    if (!rawNext) return '/dashboard'
    if (!rawNext.startsWith('/') || rawNext.startsWith('//') || rawNext.includes('..')) {
      return '/dashboard'
    }
    return rawNext
  }, [rawNext])

  useEffect(() => {
    if (!rawError) return
    const messages: Record<string, string> = {
      authentication_failed: 'We could not sign you in with that provider. Please try again.',
      invalid_request: 'The login request was invalid. Please try again.',
      security_check_failed: 'The login attempt did not pass our security checks. Please try again.',
    }
    setError(messages[rawError] ?? 'We could not sign you in. Please try again.')
  }, [rawError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await signIn(email, password)

      if (error) {
        setError(getAuthErrorMessage(error))
        return
      }

      if (data.user) {
        router.push(nextPath)
        router.refresh()
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleProviderSignIn = async () => {
    setError('')
    setOauthLoading('google')

    try {
      const { data, error } = await signInWithProvider('google', { nextPath })

      if (error) {
        setError(getAuthErrorMessage(error))
        return
      }

      if (data?.url) {
        window.location.href = data.url
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setOauthLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link
            href="/signup"
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            create a new account
          </Link>
        </p>
      </div>

      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleProviderSignIn}
          loading={oauthLoading === 'google'}
        >
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">
              or continue with email
            </span>
          </div>
        </div>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <fieldset disabled={loading || oauthLoading !== null}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <div className="mt-1">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="mt-1">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm">
              <Link
                href="/forgot-password"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Forgot your password?
              </Link>
            </div>
          </div>
        </fieldset>

        <div>
          <Button
            type="submit"
            disabled={!email || !password || loading}
            loading={loading}
            className="w-full"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </div>
      </form>
    </div>
  )
}
