import { createClient } from '@/lib/supabase/server'
import { sanitizeText } from '@/lib/utils/sanitization'
import { createSecureStringSchema } from '@/lib/validation/security'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const TIMEZONE_VALUES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Pacific/Auckland'
] as const

const updateProfileSchema = z.object({
  name: createSecureStringSchema(1, 120)
    .transform(value => sanitizeText(value))
    .refine(value => value.length > 0, {
      message: 'Name cannot be empty after sanitization'
    }),
  timezone: z.enum(TIMEZONE_VALUES)
}).strict()

export async function PUT(request: Request) {
  try {
    const rawBody = await request.json()
    const { name, timezone } = updateProfileSchema.parse(rawBody)

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Update profile
    const { data, error } = await supabase
      .from('profiles')
      .update({
        name,
        notification_preferences: {
          timezone
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update profile', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: error.flatten() },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
