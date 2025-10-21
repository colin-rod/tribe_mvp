import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const logger = createLogger('RecipientDuplicateCheckAPI')

const duplicateCheckSchema = z.object({
  email: z.string().trim().min(1).email().optional(),
  phone: z.string().trim().min(1).optional()
}).refine(data => data.email || data.phone, {
  message: 'Email or phone is required'
})

type RecipientRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { email, phone } = duplicateCheckSchema.parse(body)

    let match: (RecipientRow & { source: 'email' | 'phone' }) | null = null

    if (email) {
      const { data, error } = await supabase
        .from('recipients')
        .select('id, name, email, phone')
        .eq('parent_id', user.id)
        .ilike('email', email)
        .eq('is_active', true)
        .limit(1)

      if (error) {
        logger.errorWithStack('Error checking duplicate by email', error as Error)
        return NextResponse.json({ error: 'Failed to check duplicates' }, { status: 500 })
      }

      const [firstMatch] = (data as RecipientRow[] | null) ?? []
      if (firstMatch) {
        match = { ...firstMatch, source: 'email' }
      }
    }

    if (!match && phone) {
      const { data, error } = await supabase
        .from('recipients')
        .select('id, name, email, phone')
        .eq('parent_id', user.id)
        .eq('phone', phone)
        .eq('is_active', true)
        .limit(1)

      if (error) {
        logger.errorWithStack('Error checking duplicate by phone', error as Error)
        return NextResponse.json({ error: 'Failed to check duplicates' }, { status: 500 })
      }

      const [firstMatch] = (data as RecipientRow[] | null) ?? []
      if (firstMatch) {
        match = { ...firstMatch, source: 'phone' }
      }
    }

    return NextResponse.json({
      match: match
        ? {
            id: match.id,
            name: match.name,
            email: match.email,
            phone: match.phone,
            source: match.source
          }
        : null
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? 'Invalid request' }, { status: 400 })
    }

    logger.errorWithStack('Unexpected error checking recipient duplicates', error as Error)
    return NextResponse.json({ error: 'Failed to check duplicates' }, { status: 500 })
  }
}
