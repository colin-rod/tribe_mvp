import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'
import {
  assertFileIsClean,
  MalwareDetectedError,
  MalwareScanFailedError
} from '@/lib/security/file-scanner'

const logger = createLogger('ScreenshotUploadAPI')

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FILES = 5
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

/**
 * POST /api/feedback/upload-screenshots - Upload feedback screenshots
 *
 * Uploads screenshots to Supabase Storage and returns public URLs
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('Received screenshot upload request')

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

    const preparedFiles = await Promise.all(
      files.map(async file => ({
        file,
        buffer: Buffer.from(await file.arrayBuffer()),
      }))
    )

    for (const { file, buffer } of preparedFiles) {
      try {
        await assertFileIsClean({
          fileName: file.name,
          buffer,
          mimeType: file.type,
        })
      } catch (error) {
        if (error instanceof MalwareDetectedError) {
          logger.warn('Screenshot rejected due to malware detection', {
            fileName: file.name,
            threat: error.threat,
            scanner: error.engine,
          })

          return NextResponse.json(
            {
              success: false,
              error: `File ${file.name} failed security scanning`,
            },
            { status: 400 }
          )
        }

        if (error instanceof MalwareScanFailedError) {
          logger.errorWithStack('Screenshot scan failed', error, {
            fileName: file.name,
          })

          return NextResponse.json(
            {
              success: false,
              error: `Unable to verify ${file.name} is safe for upload`,
            },
            { status: 400 }
          )
        }

        throw error
      }
    }

    // Upload to Supabase Storage
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const uploadedUrls: string[] = []

    for (let i = 0; i < preparedFiles.length; i++) {
      const { file, buffer } = preparedFiles[i]
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 15)
      const extension = file.name.split('.').pop() || 'png'
      const fileName = `feedback-${timestamp}-${randomStr}-${i}.${extension}`

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

      const {
        data: { publicUrl },
      } = supabase.storage.from('feedback-screenshots').getPublicUrl(data.path)

      uploadedUrls.push(publicUrl)

      logger.info('Screenshot uploaded successfully', {
        fileName,
        url: publicUrl,
      })
    }

    return NextResponse.json(
      {
        success: true,
        urls: uploadedUrls,
      },
      { status: 200 }
    )
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
