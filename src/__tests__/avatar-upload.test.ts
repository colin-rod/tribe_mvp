import { validateAvatarFile } from '@/lib/utils/avatar-upload'

describe('Avatar Upload Validation', () => {
  it('should accept valid JPEG file', () => {
    const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }) // 1MB

    const error = validateAvatarFile(file)
    expect(error).toBeNull()
  })

  it('should accept valid PNG file', () => {
    const file = new File(['test'], 'avatar.png', { type: 'image/png' })
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }) // 1MB

    const error = validateAvatarFile(file)
    expect(error).toBeNull()
  })

  it('should accept valid WebP file', () => {
    const file = new File(['test'], 'avatar.webp', { type: 'image/webp' })
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }) // 1MB

    const error = validateAvatarFile(file)
    expect(error).toBeNull()
  })

  it('should reject file larger than 5MB', () => {
    const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 }) // 6MB

    const error = validateAvatarFile(file)
    expect(error).not.toBeNull()
    expect(error?.code).toBe('FILE_TOO_LARGE')
    expect(error?.message).toContain('5MB')
  })

  it('should reject invalid file type', () => {
    const file = new File(['test'], 'avatar.gif', { type: 'image/gif' })
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }) // 1MB

    const error = validateAvatarFile(file)
    expect(error).not.toBeNull()
    expect(error?.code).toBe('INVALID_FILE_TYPE')
    expect(error?.message).toContain('JPG, PNG')
  })

  it('should reject SVG files', () => {
    const file = new File(['test'], 'avatar.svg', { type: 'image/svg+xml' })
    Object.defineProperty(file, 'size', { value: 1024 }) // 1KB

    const error = validateAvatarFile(file)
    expect(error).not.toBeNull()
    expect(error?.code).toBe('INVALID_FILE_TYPE')
  })

  it('should reject PDF files', () => {
    const file = new File(['test'], 'document.pdf', { type: 'application/pdf' })
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }) // 1MB

    const error = validateAvatarFile(file)
    expect(error).not.toBeNull()
    expect(error?.code).toBe('INVALID_FILE_TYPE')
  })

  it('should accept maximum allowed size (5MB)', () => {
    const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })
    Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 }) // Exactly 5MB

    const error = validateAvatarFile(file)
    expect(error).toBeNull()
  })

  it('should accept minimum file size', () => {
    const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })
    Object.defineProperty(file, 'size', { value: 1 }) // 1 byte

    const error = validateAvatarFile(file)
    expect(error).toBeNull()
  })
})
