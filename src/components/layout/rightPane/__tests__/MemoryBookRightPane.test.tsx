import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryBookRightPane } from '../MemoryBookRightPane'

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

const { toast } = require('sonner') as {
  toast: {
    success: jest.Mock
    error: jest.Mock
  }
}

describe('MemoryBookRightPane quick actions', () => {
  const originalOpen = window.open
  const originalFetch = global.fetch
  const originalNavigatorShare = navigator.share
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

  beforeEach(() => {
    toast.success.mockReset()
    toast.error.mockReset()

    window.open = jest.fn().mockReturnValue({ focus: jest.fn() }) as unknown as typeof window.open
    global.fetch = jest.fn()
    Object.assign(navigator, { share: undefined })
    URL.createObjectURL = jest.fn().mockReturnValue('blob:memory-book')
    URL.revokeObjectURL = jest.fn()
  })

  afterEach(() => {
    window.open = originalOpen
    global.fetch = originalFetch
    Object.assign(navigator, { share: originalNavigatorShare })
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  it('opens print view and notifies the user', () => {
    render(<MemoryBookRightPane />)

    fireEvent.click(screen.getByText('Print Memory Book'))

    expect(window.open).toHaveBeenCalledWith('/dashboard/memory-book/print', '_blank', 'noopener')
    expect(toast.success).toHaveBeenCalledWith('Opened print-friendly Memory Book')
  })

  it('downloads exported PDF when backend responds successfully', async () => {
    const blob = new Blob(['test'], { type: 'application/pdf' })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
      headers: new Headers({ 'Content-Disposition': 'attachment; filename="test.pdf"' })
    })

    render(<MemoryBookRightPane />)

    fireEvent.click(screen.getByText('Export as PDF'))

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled())
    expect(toast.success).toHaveBeenCalledWith('Memory Book PDF exported successfully')
  })

  it('shows error toast when export fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'No summaries' })
    })

    render(<MemoryBookRightPane />)

    fireEvent.click(screen.getByText('Export as PDF'))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No summaries'))
  })

  it('uses mailto fallback when Web Share API is unavailable', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        shareUrl: 'https://example.com/dashboard/memory-book',
        shareSubject: 'Our Family Memory Book',
        shareText: 'Take a look at our memories'
      })
    })

    render(<MemoryBookRightPane />)

    fireEvent.click(screen.getByText('Share Memory Book'))

    await waitFor(() => expect(window.open).toHaveBeenCalledWith(expect.stringContaining('mailto:'), '_self'))
    expect(toast.success).toHaveBeenCalledWith('Opened your email client to share the Memory Book')
  })

  it('leverages Web Share API when available', async () => {
    const shareMock = jest.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { share: shareMock })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        shareUrl: 'https://example.com/dashboard/memory-book',
        shareSubject: 'Our Family Memory Book',
        shareText: 'Take a look at our memories'
      })
    })

    render(<MemoryBookRightPane />)

    fireEvent.click(screen.getByText('Share Memory Book'))

    await waitFor(() => expect(shareMock).toHaveBeenCalled())
    expect(toast.success).toHaveBeenCalledWith('Shared Memory Book with your favorite apps')
  })
})
