import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'
import { requireAuth } from '@/lib/middleware/authorization'
import {
  checkRateLimit,
  KeyGenerators,
  type RateLimitConfig,
  type RateLimitInfo,
} from '@/lib/middleware/rateLimiting'

const logger = createLogger('ScreenshotUploadAPI')

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FILES = 5
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

const USER_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequests: 10,
  windowMinutes: 10,
  keyGenerator: KeyGenerators.user,
}

const IP_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequests: 30,
  windowMinutes: 10,
  keyGenerator: KeyGenerators.ip,
}

function buildRateLimitExceededResponse(scope: 'user' | 'ip', info: RateLimitInfo) {
  const retryAfterSeconds = Math.max(1, Math.ceil((info.resetTime - Date.now()) / 1000))

  const response = NextResponse.json(
    {
      success: false,
      error: `Upload rate limit exceeded for ${scope}. Please try again later.`,
      details: {
        limit: info.total,
        remaining: info.remaining,
        resetTime: new Date(info.resetTime).toISOString(),
        retryAfter: retryAfterSeconds,
        scope,
      },
    },
    {
      status: 429,
      headers: {
        'Retry-After': retryAfterSeconds.toString(),
        'X-RateLimit-Limit': info.total.toString(),
        'X-RateLimit-Remaining': info.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(info.resetTime / 1000).toString(),
        'X-RateLimit-Scope': scope,
      },
    }
  )

  return response
}

/**
 * POST /api/feedback/upload-screenshots - Upload feedback screenshots
 *
 * Uploads screenshots to Supabase Storage and returns public URLs
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('Received screenshot upload request')

    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user } = authResult

    const userRateLimitResult = checkRateLimit(request, USER_RATE_LIMIT_CONFIG, user.id)
    if (!userRateLimitResult.allowed) {
      logger.warn('User screenshot upload rate limit exceeded', {
        userId: user.id,
        limit: USER_RATE_LIMIT_CONFIG.maxRequests,
        windowMinutes: USER_RATE_LIMIT_CONFIG.windowMinutes,
      })
      return buildRateLimitExceededResponse('user', userRateLimitResult.info)
    }

    const ipRateLimitResult = checkRateLimit(request, IP_RATE_LIMIT_CONFIG, user.id)
    if (!ipRateLimitResult.allowed) {
      logger.warn('IP screenshot upload rate limit exceeded', {
        userId: user.id,
        limit: IP_RATE_LIMIT_CONFIG.maxRequests,
        windowMinutes: IP_RATE_LIMIT_CONFIG.windowMinutes,
      })
      return buildRateLimitExceededResponse('ip', ipRateLimitResult.info)
    }

    const formData = await request.formData()
    const files: File[] = []

    // Extract all files from form data
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('screenshot_') && value instanceof File) {
        files.push(value)
      }
    }

    // Validate file count
    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No screenshots provided',
        },
        { status: 400 }
      )
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${MAX_FILES} screenshots allowed`,
        },
        { status: 400 }
      )
    }

    // Validate each file
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `File ${file.name} exceeds maximum size of 5MB`,
          },
          { status: 400 }
        )
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error: `File ${file.name} has invalid type. Allowed: PNG, JPEG, WebP`,
          },
          { status: 400 }
        )
      }
    }

    // Upload to Supabase Storage
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const uploadedUrls: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 15)
      const extension = file.name.split('.').pop() || 'png'
      const fileName = `feedback-${timestamp}-${randomStr}-${i}.${extension}`

      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('feedback-screenshots')
        .upload(fileName, buffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        logger.error('Failed to upload screenshot', {
          fileName: file.name,
          error: error.message,
        })
        throw new Error(`Failed to upload ${file.name}: ${error.message}`)
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('feedback-screenshots').getPublicUrl(data.path)

      uploadedUrls.push(publicUrl)

      logger.info('Screenshot uploaded successfully', {
        fileName,
        url: publicUrl,
      })
    }

    const response = NextResponse.json(
      {
        success: true,
        urls: uploadedUrls,
      },
      { status: 200 }
    )

    response.headers.set(
      'X-RateLimit-Limit-User',
      userRateLimitResult.info.total.toString()
    )
    response.headers.set(
      'X-RateLimit-Remaining-User',
      userRateLimitResult.info.remaining.toString()
    )
    response.headers.set(
      'X-RateLimit-Reset-User',
      Math.ceil(userRateLimitResult.info.resetTime / 1000).toString()
    )
    response.headers.set('X-RateLimit-Limit-IP', ipRateLimitResult.info.total.toString())
    response.headers.set(
      'X-RateLimit-Remaining-IP',
      ipRateLimitResult.info.remaining.toString()
    )
    response.headers.set(
      'X-RateLimit-Reset-IP',
      Math.ceil(ipRateLimitResult.info.resetTime / 1000).toString()
    )

    return response
  } catch (error) {
    logger.errorWithStack('Error uploading screenshots', error as Error)

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred while uploading screenshots',
      },
      { status: 500 }
    )
  }
}
