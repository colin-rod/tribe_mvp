import { createLogger } from '@/lib/logger'

export type ShareChannel = 'facebook' | 'x' | 'whatsapp' | 'messages'

export interface ShareOptions {
  url: string
  message?: string | null
  title?: string
}

const shareLogger = createLogger('share-utils')

const FACEBOOK_SHARE_URL = 'https://www.facebook.com/sharer/sharer.php'
const X_SHARE_URL = 'https://twitter.com/intent/tweet'
const WHATSAPP_SHARE_URL = 'https://api.whatsapp.com/send'
const SMS_SHARE_URL = 'sms:'

const buildShareText = (options: ShareOptions) => {
  if (!options.message) {
    return options.url
  }

  return `${options.message}\n${options.url}`
}

export const buildShareUrl = (channel: ShareChannel, options: ShareOptions) => {
  const encodedUrl = encodeURIComponent(options.url)
  const encodedMessage = options.message ? encodeURIComponent(options.message) : undefined

  switch (channel) {
    case 'facebook':
      return `${FACEBOOK_SHARE_URL}?u=${encodedUrl}${encodedMessage ? `&quote=${encodedMessage}` : ''}`
    case 'x':
      return `${X_SHARE_URL}?url=${encodedUrl}${encodedMessage ? `&text=${encodedMessage}` : ''}`
    case 'whatsapp':
      return `${WHATSAPP_SHARE_URL}?text=${encodeURIComponent(buildShareText(options))}`
    case 'messages':
      return `${SMS_SHARE_URL}?body=${encodeURIComponent(buildShareText(options))}`
    default:
      shareLogger.warn('Unsupported share channel requested', { channel })
      return options.url
  }
}

export const openShareWindow = (url: string) => {
  if (typeof window === 'undefined') return
  window.open(url, '_blank', 'noopener,noreferrer')
}

export const canUseWebShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function'

export const shareViaNavigator = async (options: ShareOptions) => {
  if (!canUseWebShare()) {
    return false
  }

  try {
    await navigator.share({
      title: options.title ?? 'Tribe Invitation',
      text: buildShareText(options),
      url: options.url
    })
    return true
  } catch (error) {
    const abortErrorNames = ['AbortError', 'NotAllowedError']
    if (error instanceof Error && abortErrorNames.includes(error.name)) {
      shareLogger.debug('User dismissed or blocked the native share dialog', {
        reason: error.name
      })
      return false
    }

    shareLogger.errorWithStack('Native share failed', error as Error)
    throw error
  }
}

