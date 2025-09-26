const UI_AVATAR_BASE_URL = 'https://ui-avatars.com/api/'

interface AvatarOptions {
  name?: string | null
  size?: number
  background?: string
  color?: string
  bold?: boolean
  uppercase?: boolean
}

/**
 * Build a deterministic URL for ui-avatars based on the provided name.
 * Falls back to a generic label when the name is missing.
 */
export function getDefaultAvatarUrl({
  name,
  size = 256,
  background = 'random',
  color = 'fff',
  bold = true,
  uppercase = true
}: AvatarOptions = {}): string {
  const displayName = formatName(name)
  const params = new URLSearchParams({
    name: displayName,
    background,
    color,
    size: size.toString()
  })

  if (bold) {
    params.set('bold', 'true')
  }

  if (uppercase) {
    params.set('uppercase', 'true')
  }

  return `${UI_AVATAR_BASE_URL}?${params.toString()}`
}

function formatName(name?: string | null): string {
  const trimmed = name?.trim()
  if (!trimmed) {
    return 'Friend'
  }

  return trimmed
}
