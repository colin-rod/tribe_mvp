'use client'

import React, { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { FeedbackModal } from './FeedbackModal'
import { cn } from '@/lib/utils'

interface FeedbackButtonProps {
  className?: string
}

/**
 * Floating Action Button for Beta Feedback
 *
 * Fixed position in bottom-right corner, opens feedback modal on click
 */
export const FeedbackButton: React.FC<FeedbackButtonProps> = ({ className }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleClick = () => {
    setIsModalOpen(true)

    // Analytics tracking
    if (typeof window !== 'undefined') {
      window.gtag?.('event', 'feedback_button_click', {
        event_category: 'engagement',
        event_label: 'fab_click',
        value: 1,
      })
    }
  }

  return (
    <>
      {/* Floating Action Button with Text */}
      <button
        onClick={handleClick}
        className={cn(
          // Base styles
          'fixed bottom-6 right-6 z-40',
          'px-4 py-3 rounded-full',
          'flex items-center gap-2',
          // Colors & shadows
          'bg-primary-600 hover:bg-primary-700',
          'text-white',
          'shadow-lg hover:shadow-xl',
          // Transitions
          'transition-all duration-200 ease-out',
          'hover:scale-105 active:scale-95',
          // Focus styles
          'focus:outline-none focus:ring-4 focus:ring-primary-500/50',
          // Mobile optimizations
          'sm:bottom-8 sm:right-8',
          className
        )}
        aria-label="Share feedback"
        title="Share your feedback with us"
      >
        <MessageSquare className="w-5 h-5" aria-hidden="true" />
        <span className="font-medium text-sm whitespace-nowrap">Feedback</span>
      </button>

      {/* Feedback Modal */}
      <FeedbackModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  )
}

export default FeedbackButton
