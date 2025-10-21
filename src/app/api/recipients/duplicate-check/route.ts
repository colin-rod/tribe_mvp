import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import Fuse from 'fuse.js'

import { createClient } from '@/lib/supabase/server'
import {
  RecipientDuplicateCandidate,
  recipientDuplicateFuseOptions,
  RecipientMatchMetadata,
} from '@/lib/search/fuseConfig'

type DuplicateCheckRequest = {
  name: string
  preferredName?: string | null
  nicknames?: string[]
  email?: string | null
  phone?: string | null
  relationship?: string | null
}

type DuplicateCandidateMatch = {
  recipient: RecipientDuplicateCandidate
  score: number | null
  metadata: RecipientMatchMetadata
}

type RecipientRecord = {
  id: string
  name: string
  email: string | null
  phone: string | null
  relationship: string | null
}

const KNOWN_PREFIXES = [
  'grandma',
  'grandpa',
  'grandmother',
  'grandfather',
  'nana',
  'papa',
  'granddad',
  'grandad',
  'granny',
  'grammy',
  'uncle',
  'aunt',
  'auntie',
  'cousin',
  'godmother',
  'godfather',
]

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizePhoneNumber(value: string): string {
  return value.replace(/[^\d]/g, '')
}

function extractNameMetadata(name: string) {
  const cleaned = normalizeWhitespace(name)
  const lower = cleaned.toLowerCase()
  const tokens = lower.split(' ')
  const prefix = tokens.find((token) => KNOWN_PREFIXES.includes(token))

  const normalizedTokens = prefix ? tokens.filter((token) => token !== prefix) : tokens
  const normalizedName = normalizedTokens.join(' ').trim()

  return {
    prefix: prefix || null,
    normalizedName: normalizedName || lower,
  }
}

function buildCandidate(recipient: RecipientRecord): RecipientDuplicateCandidate {
  const { normalizedName, prefix } = extractNameMetadata(recipient.name)

  return {
    id: recipient.id,
    name: recipient.name,
    email: recipient.email,
    phone: recipient.phone,
    relationship: recipient.relationship,
    normalizedName,
    metadata: {
      prefix: prefix || undefined,
      nicknames: [],
    },
  }
}

function buildSearchTerms(payload: DuplicateCheckRequest) {
  const terms = new Set<string>()

  const normalizedName = normalizeWhitespace(payload.name)
  terms.add(normalizedName)

  const { normalizedName: simplifiedName, prefix } = extractNameMetadata(payload.name)
  if (simplifiedName) {
    terms.add(simplifiedName)
  }

  if (payload.preferredName) {
    terms.add(normalizeWhitespace(payload.preferredName))
  }

  for (const nickname of payload.nicknames || []) {
    if (nickname) {
      terms.add(normalizeWhitespace(nickname))
    }
  }

  return {
    terms: Array.from(terms).filter(Boolean),
    normalizedName: simplifiedName || normalizedName,
    prefix: prefix || undefined,
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = (await request.json()) as Partial<DuplicateCheckRequest> | null
    if (!payload || typeof payload.name !== 'string' || !payload.name.trim()) {
      return NextResponse.json(
        { error: 'Recipient name is required' },
        { status: 400 }
      )
    }

    const searchInput = buildSearchTerms({
      name: payload.name,
      preferredName: payload.preferredName || null,
      nicknames: payload.nicknames || [],
      email: payload.email || null,
      phone: payload.phone || null,
      relationship: payload.relationship || null,
    })

    const { data: recipients, error } = await supabase
      .from('recipients')
      .select('id, name, email, phone, relationship')
      .eq('parent_id', authData.user.id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to load recipients', details: error.message },
        { status: 500 }
      )
    }

    const existingRecipients = (recipients || []).map((record) =>
      buildCandidate({
        id: record.id,
        name: record.name,
        email: record.email,
        phone: record.phone,
        relationship: record.relationship ?? null,
      })
    )

    if (existingRecipients.length === 0) {
      return NextResponse.json({
        input: {
          name: payload.name,
          normalizedName: searchInput.normalizedName,
          searchTerms: searchInput.terms,
        },
        candidates: [],
      })
    }

    const fuse = new Fuse(existingRecipients, recipientDuplicateFuseOptions)

    const matches = new Map<string, DuplicateCandidateMatch>()

    const normalizedEmail = payload.email?.toLowerCase() || null
    const normalizedPhone = payload.phone ? normalizePhoneNumber(payload.phone) : null

    for (const candidate of existingRecipients) {
      const candidateEmail = candidate.email?.toLowerCase() || null
      const candidatePhone = candidate.phone ? normalizePhoneNumber(candidate.phone) : null

      const emailMatch = Boolean(normalizedEmail && candidateEmail && candidateEmail === normalizedEmail)
      const phoneMatch = Boolean(
        normalizedPhone && candidatePhone && candidatePhone === normalizedPhone
      )

      if (emailMatch || phoneMatch) {
        matches.set(candidate.id, {
          recipient: candidate,
          score: 0,
          metadata: {
            contact: { email: emailMatch, phone: phoneMatch },
            terms: [],
            fields: [],
            fuseMatches: [],
          },
        })
      }
    }

    for (const term of searchInput.terms) {
      const fuseResults = fuse.search(term)

      for (const result of fuseResults) {
        const existing = matches.get(result.item.id)
        const bestScore = existing?.score
        const score = result.score ?? null

        const fuseMatches = result.matches?.map((match) => ({
          key: match.key ? match.key.toString() : '',
          value: match.value,
          indices: match.indices,
          term,
        }))

        if (!existing) {
          matches.set(result.item.id, {
            recipient: result.item,
            score,
            metadata: {
              contact: { email: false, phone: false },
              terms: fuseMatches ? [term] : [],
              fields: fuseMatches ? Array.from(new Set(fuseMatches.map((match) => match.key))) : [],
              fuseMatches: fuseMatches || [],
            },
          })
        } else {
          if (score !== null && (bestScore === null || score < bestScore)) {
            existing.score = score
          }

          if (fuseMatches && fuseMatches.length > 0) {
            const uniqueTerms = new Set(existing.metadata.terms)
            uniqueTerms.add(term)
            existing.metadata.terms = Array.from(uniqueTerms)

            const combinedFields = new Set(existing.metadata.fields)
            for (const fuseMatch of fuseMatches) {
              if (fuseMatch.key) {
                combinedFields.add(fuseMatch.key)
              }
            }
            existing.metadata.fields = Array.from(combinedFields)

            existing.metadata.fuseMatches = existing.metadata.fuseMatches.concat(fuseMatches)
          }
        }
      }
    }

    const candidates = Array.from(matches.values())
      .map((match) => ({
        recipient: match.recipient,
        score: match.score,
        metadata: match.metadata,
      }))
      .sort((a, b) => {
        const aScore = a.score ?? Number.POSITIVE_INFINITY
        const bScore = b.score ?? Number.POSITIVE_INFINITY
        return aScore - bScore
      })

    return NextResponse.json({
      input: {
        name: payload.name,
        normalizedName: searchInput.normalizedName,
        searchTerms: searchInput.terms,
      },
      candidates,
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Recipient duplicate check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
