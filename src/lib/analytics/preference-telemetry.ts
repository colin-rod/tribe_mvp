import { createLogger } from '@/lib/logger'

export type PreferenceTelemetryAction = 'view' | 'update' | 'reset'

export interface PreferenceTelemetryInput {
  action: PreferenceTelemetryAction
  tokenHash: string
  tokenPrefix: string
  metadata?: Record<string, unknown>
}

export interface PreferenceTelemetryRecord extends PreferenceTelemetryInput {
  eventId: string
  timestamp: string
}

const telemetryLogger = createLogger('PreferenceTelemetry')
const TELEMETRY_ENDPOINT = '/api/telemetry/preferences'
const FINGERPRINT_LENGTH = 40
const TOKEN_PREFIX_LENGTH = 6

const history: PreferenceTelemetryRecord[] = []

function generateEventId(): string {
  try {
    const cryptoApi = (globalThis as typeof globalThis & { crypto?: Crypto }).crypto

    if (cryptoApi?.randomUUID) {
      return cryptoApi.randomUUID()
    }
  } catch (error) {
    telemetryLogger.debug('Unable to use crypto.randomUUID()', {
      error: error instanceof Error ? error.message : 'unknown'
    })
  }

  return `pref-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function hashWithWebCrypto(token: string): Promise<string | null> {
  try {
    const cryptoApi = (globalThis as typeof globalThis & { crypto?: Crypto }).crypto
    const subtle = cryptoApi?.subtle

    if (!subtle) {
      return null
    }

    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const digest = await subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(digest))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch (error) {
    telemetryLogger.warn('Failed to hash token using Web Crypto', {
      error: error instanceof Error ? error.message : 'unknown'
    })
    return null
  }
}

async function hashWithNodeCrypto(token: string): Promise<string | null> {
  try {
    if (typeof window !== 'undefined') {
      return null
    }

    const crypto = await import('crypto')
    return crypto.createHash('sha256').update(token).digest('hex')
  } catch (error) {
    telemetryLogger.warn('Failed to hash token using Node crypto', {
      error: error instanceof Error ? error.message : 'unknown'
    })
    return null
  }
}

function hashWithFallback(token: string): string {
  let hash = 0

  for (let i = 0; i < token.length; i += 1) {
    hash = (hash * 31 + token.charCodeAt(i)) >>> 0
  }

  return hash.toString(16).padStart(8, '0')
}

export async function createPreferenceTokenFingerprint(token: string): Promise<string> {
  const normalized = token.trim()

  if (!normalized) {
    return 'anonymous'
  }

  const [nodeHash, webHash] = await Promise.all([
    hashWithNodeCrypto(normalized),
    hashWithWebCrypto(normalized)
  ])

  const hash = nodeHash || webHash || hashWithFallback(normalized)

  return hash.slice(0, FINGERPRINT_LENGTH)
}

async function deliverTelemetry(record: PreferenceTelemetryRecord): Promise<void> {
  if (typeof window === 'undefined') {
    telemetryLogger.debug('Telemetry delivery skipped - no window context', {
      eventId: record.eventId
    })
    return
  }

  const payload = JSON.stringify({
    eventId: record.eventId,
    action: record.action,
    tokenHash: record.tokenHash,
    tokenPrefix: record.tokenPrefix,
    timestamp: record.timestamp,
    metadata: record.metadata
  })

  if (typeof window.gtag === 'function') {
    try {
      window.gtag('event', `preference_${record.action}`, {
        event_category: 'preferences',
        event_label: record.action,
        preference_token_hash: record.tokenHash,
        preference_token_prefix: record.tokenPrefix,
        ...record.metadata
      })
    } catch (error) {
      telemetryLogger.warn('Failed to emit gtag telemetry', {
        eventId: record.eventId,
        error: error instanceof Error ? error.message : 'unknown'
      })
    }
  }

  const beaconSupported = typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function'

  if (beaconSupported) {
    try {
      const success = navigator.sendBeacon(TELEMETRY_ENDPOINT, payload)

      if (!success) {
        telemetryLogger.warn('Preference telemetry beacon was rejected', {
          eventId: record.eventId
        })
      }

      return
    } catch (error) {
      telemetryLogger.warn('Preference telemetry beacon failed', {
        eventId: record.eventId,
        error: error instanceof Error ? error.message : 'unknown'
      })
    }
  }

  try {
    await fetch(TELEMETRY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload,
      keepalive: true
    })
  } catch (error) {
    telemetryLogger.warn('Preference telemetry fetch failed', {
      eventId: record.eventId,
      error: error instanceof Error ? error.message : 'unknown'
    })
  }
}

export async function trackPreferenceTelemetry(
  input: PreferenceTelemetryInput
): Promise<PreferenceTelemetryRecord> {
  const record: PreferenceTelemetryRecord = {
    ...input,
    eventId: generateEventId(),
    timestamp: new Date().toISOString(),
    metadata: {
      ...input.metadata,
      tokenPrefixLength: TOKEN_PREFIX_LENGTH
    }
  }

  history.push(record)

  telemetryLogger.debug('Preference telemetry event recorded', {
    eventId: record.eventId,
    action: record.action,
    tokenPrefix: record.tokenPrefix
  })

  await deliverTelemetry(record)

  return record
}

export function getPreferenceTelemetryHistory(): PreferenceTelemetryRecord[] {
  return [...history]
}

export function resetPreferenceTelemetryHistory(): void {
  history.length = 0
}

export function getTokenPrefix(token: string): string {
  return token.slice(0, TOKEN_PREFIX_LENGTH)
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}
