import { render, screen, fireEvent } from '@testing-library/react'
import { MediaGallery } from '../MediaGallery'
import { mockMediaUrls } from '@/test-utils/mockData'

// Helper function to get elements by tag name
const getAllByTagName = (tagName: string) => {
  return Array.from(document.querySelectorAll(tagName))
}

const getByTagName = (tagName: string) => {
  const element = document.querySelector(tagName)
  if (!element) {
    throw new Error(`Unable to find element with tag name: ${tagName}`)
  }
  return element
}

const queryByTagName = (tagName: string) => {
  return document.querySelector(tagName)
}

describe('MediaGallery', () => {
  it('renders media grid correctly', () => {
    render(<MediaGallery mediaUrls={mockMediaUrls.slice(0, 3)} />)

    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(2) // 2 images

    const videos = getAllByTagName('video')
    expect(videos).toHaveLength(1) // 1 video
  })

  it('shows overflow indicator when more than maxPreview', () => {
    render(<MediaGallery mediaUrls={mockMediaUrls} maxPreview={3} />)

    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })

  it('does not show overflow indicator when items fit in maxPreview', () => {
    render(<MediaGallery mediaUrls={mockMediaUrls.slice(0, 2)} maxPreview={4} />)

    expect(screen.queryByText(/\+\d+ more/)).not.toBeInTheDocument()
  })

  it('opens lightbox on media click', () => {
    render(<MediaGallery mediaUrls={mockMediaUrls.slice(0, 2)} />)

    const firstImage = screen.getAllByRole('img')[0]
    fireEvent.click(firstImage)

    // Check if lightbox is open by looking for counter
    expect(screen.getByText('1 of 2')).toBeInTheDocument()
  })

  it('navigates through lightbox correctly', () => {
    render(<MediaGallery mediaUrls={mockMediaUrls.slice(0, 3)} />)

    const firstImage = screen.getAllByRole('img')[0]
    fireEvent.click(firstImage)

    // Navigate to next
    const nextButton = screen.getByTestId('chevron-right-icon').closest('button')
    expect(nextButton).toBeInTheDocument()

    if (nextButton) {
      fireEvent.click(nextButton)
      expect(screen.getByText('2 of 3')).toBeInTheDocument()

      // Navigate to previous
      const prevButton = screen.getByTestId('chevron-left-icon').closest('button')
      if (prevButton) {
        fireEvent.click(prevButton)
        expect(screen.getByText('1 of 3')).toBeInTheDocument()
      }
    }
  })

  it('calls custom onMediaClick when provided', () => {
    const mockOnMediaClick = jest.fn()
    render(
      <MediaGallery
        mediaUrls={mockMediaUrls.slice(0, 2)}
        onMediaClick={mockOnMediaClick}
      />
    )

    const firstImage = screen.getAllByRole('img')[0]
    fireEvent.click(firstImage)

    expect(mockOnMediaClick).toHaveBeenCalledWith(mockMediaUrls[0], 0)
  })

  it('closes lightbox on close button click', () => {
    render(<MediaGallery mediaUrls={mockMediaUrls.slice(0, 2)} />)

    const firstImage = screen.getAllByRole('img')[0]
    fireEvent.click(firstImage)

    expect(screen.getByText('1 of 2')).toBeInTheDocument()

    const closeButton = screen.getByTestId('x-icon').closest('button')
    if (closeButton) {
      fireEvent.click(closeButton)
      expect(screen.queryByText('1 of 2')).not.toBeInTheDocument()
    }
  })

  it('handles video files correctly', () => {
    const videoUrls = ['https://example.com/video1.mp4']
    render(<MediaGallery mediaUrls={videoUrls} />)

    const video = getByTagName('video')
    expect(video).toBeInTheDocument()
    expect(screen.getByTestId('play-icon')).toBeInTheDocument()
  })

  it('handles empty media array', () => {
    render(<MediaGallery mediaUrls={[]} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(queryByTagName('video')).not.toBeInTheDocument()
  })

  it('applies custom className correctly', () => {
    const customClass = 'custom-grid-class'
    const { container } = render(<MediaGallery mediaUrls={mockMediaUrls.slice(0, 2)} className={customClass} />)

    // Check if the main container has the custom class
    const gridContainer = container.querySelector('.grid')
    expect(gridContainer).toHaveClass(customClass)
  })

  it('handles mixed media types correctly', () => {
    const mixedUrls = [
      'https://example.com/image.jpg',
      'https://example.com/video.mp4',
      'https://example.com/image.webp',
    ]

    render(<MediaGallery mediaUrls={mixedUrls} />)

    expect(screen.getAllByRole('img')).toHaveLength(2) // jpg and webp
    expect(getAllByTagName('video')).toHaveLength(1) // mp4
  })

  it('handles download functionality', () => {
    render(<MediaGallery mediaUrls={['https://example.com/test.jpg']} />)

    const firstImage = screen.getAllByRole('img')[0]
    fireEvent.click(firstImage)

    // Click download button
    const downloadButton = screen.getByTestId('download-icon').closest('button')
    expect(downloadButton).toBeInTheDocument()

    // Mock after rendering and finding the button
    const mockCreateElement = jest.spyOn(document, 'createElement')
    const mockAppendChild = jest.spyOn(document.body, 'appendChild')
    const mockRemoveChild = jest.spyOn(document.body, 'removeChild')
    const mockClick = jest.fn()

    const mockAnchor = {
      href: '',
      download: '',
      target: '',
      click: mockClick,
    } as unknown as HTMLAnchorElement

    mockCreateElement.mockImplementation((tagName) => {
      if (tagName === 'a') {
        return mockAnchor
      }
      return document.createElement(tagName)
    })
    mockAppendChild.mockImplementation(() => mockAnchor)
    mockRemoveChild.mockImplementation(() => mockAnchor)

    if (downloadButton) {
      fireEvent.click(downloadButton)

      expect(mockCreateElement).toHaveBeenCalledWith('a')
      expect(mockAnchor.href).toBe('https://example.com/test.jpg')
      expect(mockAnchor.download).toBe('test.jpg')
      expect(mockAnchor.target).toBe('_blank')
      expect(mockAppendChild).toHaveBeenCalledWith(mockAnchor)
      expect(mockClick).toHaveBeenCalled()
      expect(mockRemoveChild).toHaveBeenCalledWith(mockAnchor)
    }

    // Cleanup mocks
    mockCreateElement.mockRestore()
    mockAppendChild.mockRestore()
    mockRemoveChild.mockRestore()
  })

  it('closes lightbox when clicking outside', () => {
    render(<MediaGallery mediaUrls={mockMediaUrls.slice(0, 2)} />)

    const firstImage = screen.getAllByRole('img')[0]
    fireEvent.click(firstImage)

    expect(screen.getByText('1 of 2')).toBeInTheDocument()

    // Click outside the lightbox content
    const backdrop = screen.getByText('1 of 2').closest('.fixed')?.querySelector('.absolute.inset-0.-z-10')
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(screen.queryByText('1 of 2')).not.toBeInTheDocument()
    }
  })

  it('displays video in lightbox correctly', () => {
    const videoUrls = ['https://example.com/video.mp4']
    render(<MediaGallery mediaUrls={videoUrls} />)

    // Click on video thumbnail to open lightbox
    const video = getByTagName('video')
    fireEvent.click(video)

    // Should show video in lightbox (no counter for single item)
    const lightboxVideos = getAllByTagName('video')
    expect(lightboxVideos.length).toBeGreaterThan(1) // Original + lightbox video

    // Check for video attributes in lightbox
    const lightboxVideo = lightboxVideos.find(v => v.hasAttribute('autoPlay'))
    expect(lightboxVideo).toBeInTheDocument()
    expect(lightboxVideo).toHaveAttribute('controls')
    expect(lightboxVideo).toHaveAttribute('src', 'https://example.com/video.mp4')
  })
})