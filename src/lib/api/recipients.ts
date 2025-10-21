import type { Recipient } from '@/lib/recipients'

export type RecipientDuplicateMatch = Pick<Recipient, 'id' | 'name' | 'email' | 'phone'> & {
  source: 'email' | 'phone'
}

export interface RecipientDuplicateResponse {
  match: RecipientDuplicateMatch | null
}

export interface DuplicateCheckPayload {
  email?: string
  phone?: string
}

export async function checkRecipientDuplicate(payload: DuplicateCheckPayload): Promise<RecipientDuplicateResponse> {
  const body: DuplicateCheckPayload = {}
  if (payload.email?.trim()) body.email = payload.email.trim()
  if (payload.phone?.trim()) body.phone = payload.phone.trim()

  if (!body.email && !body.phone) {
    return { match: null }
  }

  const response = await fetch('/api/recipients/check-duplicate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    let message = 'Failed to check duplicates'
    try {
      const error = await response.json()
      if (error?.error) message = error.error
    } catch (err) {
      console.error('Failed to parse duplicate check error', err)
    }

    throw new Error(message)
  }

  return response.json()
}
