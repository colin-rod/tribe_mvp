import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const logger = createLogger('middleware-redirects')

export function resolveLegacyRedirect(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith('/dashboard/digests')) {
    const newPath = pathname.replace('/dashboard/digests', '/dashboard/memory-book')
    logger.info('Redirecting from old digest route to memory-book', {
      from: pathname,
      to: newPath
    })
    return NextResponse.redirect(new URL(`${newPath}${request.nextUrl.search}`, request.url))
  }

  return null
}
