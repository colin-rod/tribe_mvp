import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

interface SummaryForExport {
  id: string
  title: string
  date_range_start: string
  date_range_end: string
  total_updates: number
  parent_narrative: {
    intro?: string
    narrative?: string
    closing?: string
  } | null
}

const logger = createLogger('memory-book-export-api')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r?\n/g, '\n')
}

function buildPdfDocument(lines: string[]): Uint8Array {
  const encoder = new TextEncoder()

  const contentLines: string[] = [
    'BT',
    '/F1 18 Tf',
    '72 770 Td',
    `(Memory Book Export) Tj`,
    '/F1 12 Tf',
    '0 -22 Td',
    `(Generated on ${escapePdfText(new Date().toLocaleString())}) Tj`
  ]

  for (const line of lines) {
    contentLines.push('0 -18 Td')
    contentLines.push(`(${escapePdfText(line)}) Tj`)
  }

  contentLines.push('ET')

  const contentStream = contentLines.join('\n')
  const contentBuffer = encoder.encode(contentStream)

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]

  function addObject(object: string) {
    offsets.push(pdf.length)
    pdf += object
  }

  addObject('1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n')
  addObject('2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n')
  addObject('3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <</Font <</F1 4 0 R>>>> /Contents 5 0 R>> endobj\n')
  addObject('4 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\n')
  addObject(`5 0 obj <</Length ${contentBuffer.length}>>\nstream\n${contentStream}\nendstream\nendobj\n`)

  const xrefPosition = pdf.length
  pdf += `xref\n0 ${offsets.length}\n`
  pdf += '0000000000 65535 f \n'

  for (let i = 1; i < offsets.length; i += 1) {
    const offset = offsets[i]
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`
  }

  pdf += `trailer <</Size ${offsets.length} /Root 1 0 R>>\n`
  pdf += `startxref\n${xrefPosition}\n%%EOF`

  return encoder.encode(pdf)
}

function formatSummaryLines(summary: SummaryForExport): string[] {
  const lines: string[] = []
  const startDate = new Date(summary.date_range_start).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric'
  })
  const endDate = new Date(summary.date_range_end).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  lines.push('────────────────────────────────────────────────────')
  lines.push(summary.title)
  lines.push(`Date Range: ${startDate} – ${endDate}`)
  lines.push(`Memories Captured: ${summary.total_updates}`)

  if (summary.parent_narrative?.intro) {
    lines.push('')
    lines.push('Introduction:')
    lines.push(summary.parent_narrative.intro)
  }

  if (summary.parent_narrative?.narrative) {
    lines.push('')
    lines.push('Narrative:')
    lines.push(summary.parent_narrative.narrative)
  }

  if (summary.parent_narrative?.closing) {
    lines.push('')
    lines.push('Closing:')
    lines.push(summary.parent_narrative.closing)
  }

  return lines
}

export async function POST(_request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    logger.warn('Export attempt without authentication', { error: authError?.message })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('summaries')
    .select('id,title,date_range_start,date_range_end,total_updates,parent_narrative')
    .eq('parent_id', user.id)
    .eq('status', 'sent')
    .order('date_range_start', { ascending: true })

  if (error) {
    logger.error('Failed to fetch summaries for export', { error: error.message, userId: user.id })
    return NextResponse.json({ error: 'Failed to load Memory Book summaries' }, { status: 500 })
  }

  const summaries = (data ?? []) as SummaryForExport[]

  if (summaries.length === 0) {
    return NextResponse.json({ error: 'No sent summaries available to export' }, { status: 400 })
  }

  const contentLines = summaries.flatMap(formatSummaryLines)
  const pdfBuffer = buildPdfDocument(contentLines)

  const filename = `memory-book-${new Date().toISOString().split('T')[0]}.pdf`

  return new NextResponse(Buffer.from(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdfBuffer.length)
    }
  })
}
