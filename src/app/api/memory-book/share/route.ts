import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'
import { getEnv } from '@/lib/env'

const logger = createLogger('memory-book-share-api')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    logger.warn('Share attempt without authentication', { error: authError?.message })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('summaries')
    .select('id,title,date_range_start,date_range_end,total_updates,total_recipients')
    .eq('parent_id', user.id)
    .eq('status', 'sent')
    .order('date_range_end', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    logger.error('Failed to fetch latest summary for sharing', { error: error.message, userId: user.id })
    return NextResponse.json({ error: 'Unable to prepare Memory Book for sharing' }, { status: 500 })
  }

  const env = getEnv()
  const baseUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const shareUrl = `${baseUrl.replace(/\/$/, '')}/dashboard/memory-book`

  if (!data) {
    return NextResponse.json({
      shareUrl,
      shareSubject: 'Our Family Memory Book',
      shareText: 'We have been collecting weekly memories for our family. Take a look at our private Memory Book.'
    })
  }

  const startDate = new Date(data.date_range_start).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric'
  })
  const endDate = new Date(data.date_range_end).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  const shareSubject = `${data.title} – Memory Book`
  const shareText = [
    `Here are our family memories from ${startDate} to ${endDate}.`,
    `${data.total_updates} memories were captured and shared with ${data.total_recipients} loved ones.`,
    'View the full Memory Book to relive the highlights.'
  ].join(' ')

  return NextResponse.json({
    shareUrl,
    shareSubject,
    shareText
  })
}
