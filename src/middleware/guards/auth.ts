import type { SupabaseClient, User } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const logger = createLogger('middleware-auth-guards')

const AUTH_ROUTE_PREFIXES = ['/login', '/signup']
const PROTECTED_ROUTE_PREFIX = '/dashboard'
const ONBOARDING_ROUTE_PREFIX = '/onboarding'

export interface AuthGuardContext {
  request: NextRequest
  user: User | null
  supabase: SupabaseClient
}

function isAuthPage(pathname: string) {
  return AUTH_ROUTE_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

export async function enforceAuthGuards({ request, user, supabase }: AuthGuardContext): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname
  const authPage = isAuthPage(pathname)
  const onboardingPage = pathname.startsWith(ONBOARDING_ROUTE_PREFIX)
  const protectedPage = pathname.startsWith(PROTECTED_ROUTE_PREFIX)

  logger.debug('Evaluating auth guards', {
    path: pathname,
    hasUser: !!user,
    isAuthPage: authPage,
    isOnboardingPage: onboardingPage,
    isProtectedPage: protectedPage
  })

  if (user && authPage) {
    logger.info('Redirecting authenticated user from auth page to dashboard', {
      from: pathname,
      userId: user.id
    })
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!user && protectedPage) {
    logger.info('Redirecting unauthenticated user to login', {
      from: pathname
    })
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && protectedPage && !onboardingPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()

    if (profile && !profile.onboarding_completed) {
      logger.info('Redirecting user with incomplete onboarding', {
        from: pathname,
        userId: user.id
      })
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  return null
}
