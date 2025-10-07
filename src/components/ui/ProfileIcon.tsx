'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useState } from 'react'

export interface ProfileIconProps {
  id: string
  name: string
  photoUrl?: string
  alt: string
  subtitle?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isSelected?: boolean
  onClick?: () => void
  className?: string
  badge?: React.ReactNode
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-14 h-14',
  xl: 'w-16 h-16',
}

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
}

/**
 * ProfileIcon Component
 *
 * A reusable profile avatar component that displays a user's photo or initials.
 * Supports multiple sizes, selection states, and optional subtitle text.
 *
 * @example
 * <ProfileIcon
 *   id="123"
 *   name="Emma Smith"
 *   photoUrl="/path/to/photo.jpg"
 *   subtitle="2 years old"
 *   size="lg"
 *   isSelected={true}
 *   onClick={handleClick}
 * />
 */
export function ProfileIcon({
  id,
  name,
  photoUrl,
  alt,
  subtitle,
  size = 'md',
  isSelected = false,
  onClick,
  className,
  badge,
}: ProfileIconProps) {
  const [imageError, setImageError] = useState(false)

  // Get initials from name (first letter of first and last name)
  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ')
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase()
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  const initials = getInitials(name)
  const showImage = photoUrl && !imageError

  // Generate a consistent color based on name
  const getColorFromName = (name: string): string => {
    const colors = [
      'bg-primary-200 text-primary-700',
      'bg-success-200 text-success-700',
      'bg-info-200 text-info-700',
      'bg-warning-200 text-warning-700',
      'bg-purple-200 text-purple-700',
      'bg-pink-200 text-pink-700',
    ]
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    return colors[index]
  }

  const colorClass = getColorFromName(name)

  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg transition-all duration-200',
        onClick && 'cursor-pointer hover:scale-102 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
        isSelected && 'scale-102',
        className
      )}
      aria-label={onClick ? `Select ${name}` : name}
      aria-pressed={onClick ? isSelected : undefined}
      data-profile-id={id}
    >
      <div className="relative">
        {/* Avatar */}
        <div
          className={cn(
            'rounded-full overflow-hidden flex items-center justify-center relative transition-all duration-200',
            sizeClasses[size],
            isSelected && 'ring-3 ring-primary-600 ring-offset-2',
            onClick && 'hover:shadow-lg',
            !showImage && colorClass
          )}
        >
          {showImage ? (
            <Image
              src={photoUrl}
              alt={alt}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 40px, (max-width: 1024px) 56px, 64px"
              onError={() => setImageError(true)}
            />
          ) : (
            <span className={cn('font-semibold', textSizeClasses[size])}>
              {initials}
            </span>
          )}
        </div>

        {/* Selection checkmark */}
        {isSelected && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center shadow-md">
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}

        {/* Badge (e.g., "new", "active") */}
        {badge && (
          <div className="absolute -top-1 -right-1">
            {badge}
          </div>
        )}
      </div>

      {/* Name and subtitle */}
      <div className="text-center min-w-0 w-full">
        <p
          className={cn(
            'font-medium text-gray-900 truncate',
            size === 'sm' ? 'text-xs' : 'text-sm'
          )}
          title={name}
        >
          {name}
        </p>
        {subtitle && (
          <p
            className={cn(
              'text-gray-500 truncate',
              size === 'sm' ? 'text-[10px]' : 'text-xs'
            )}
            title={subtitle}
          >
            {subtitle}
          </p>
        )}
      </div>
    </Component>
  )
}
