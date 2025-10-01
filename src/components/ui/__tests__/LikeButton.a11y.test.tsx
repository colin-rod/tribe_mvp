/**
 * LikeButton Component - Accessibility Tests
 *
 * Tests WCAG 2.1 AA compliance for the LikeButton component
 */

import { render, cleanup } from '@testing-library/react'
import { axe } from '@/__tests__/setup/axe'
import LikeButton from '../LikeButton'

// Mock the useLikes hook
jest.mock('@/hooks/useLikes', () => ({
  useLikes: jest.fn(() => ({
    likeState: { isLiked: false, likeCount: 0, loading: false },
    toggleLike: jest.fn()
  }))
}))

describe('LikeButton Accessibility', () => {
  it('should have no accessibility violations with default props', async () => {
    const { container } = render(<LikeButton updateId="123" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should meet minimum touch target size (44x44px)', () => {
    const { getByRole } = render(<LikeButton updateId="123" />)
    const button = getByRole('button')

    // Check that the button has min-touch-target class which ensures 44x44px minimum
    expect(button.className).toContain('min-touch-target')
  })

  it('should have proper aria-label', () => {
    const { getByRole } = render(<LikeButton updateId="123" />)
    const button = getByRole('button')

    expect(button).toHaveAttribute('aria-label')
    const ariaLabel = button.getAttribute('aria-label')
    expect(ariaLabel).toMatch(/like|unlike/i)
  })

  it('aria-label changes based on like state', () => {
    const useLikes = require('@/hooks/useLikes').useLikes

    // Test unliked state
    useLikes.mockReturnValue({
      likeState: { isLiked: false, likeCount: 0, loading: false },
      toggleLike: jest.fn()
    })

    const { getByRole } = render(<LikeButton updateId="unliked-test" />)
    const unlikedButton = getByRole('button')
    expect(unlikedButton.getAttribute('aria-label')).toMatch(/like/i)

    cleanup()

    // Test liked state after cleanup
    useLikes.mockReturnValue({
      likeState: { isLiked: true, likeCount: 1, loading: false },
      toggleLike: jest.fn()
    })

    const { getByRole: getLiked } = render(<LikeButton updateId="liked-test" />)
    const likedButton = getLiked('button')
    expect(likedButton.getAttribute('aria-label')).toMatch(/unlike/i)
  })

  it('should be disabled when loading', () => {
    const useLikes = require('@/hooks/useLikes').useLikes
    useLikes.mockReturnValue({
      likeState: { isLiked: false, likeCount: 0, loading: true },
      toggleLike: jest.fn()
    })

    const { getByRole } = render(<LikeButton updateId="123" />)
    const button = getByRole('button')

    expect(button).toBeDisabled()
  })

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const

    sizes.forEach((size) => {
      it(`should have no violations with size="${size}"`, async () => {
        const { container } = render(
          <LikeButton updateId="123" size={size} />
        )
        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })

      it(`should meet touch target size with size="${size}"`, () => {
        const { getByRole } = render(
          <LikeButton updateId="123" size={size} />
        )
        const button = getByRole('button')

        // All sizes should have min-touch-target class
        expect(button.className).toContain('min-touch-target')
      })
    })
  })
})
