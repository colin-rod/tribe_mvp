'use client'

import { cn } from '@/lib/utils'

export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'failed'

interface DeliveryStatusBadgeProps {
  status: DeliveryStatus
  className?: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const statusConfig: Record<DeliveryStatus, {
  label: string
  bgColor: string
  textColor: string
  icon: string
}> = {
  queued: {
    label: 'Queued',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    icon: '⏳'
  },
  sent: {
    label: 'Sent',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    icon: '📨'
  },
  delivered: {
    label: 'Delivered',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    icon: '✓'
  },
  failed: {
    label: 'Failed',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    icon: '✗'
  }
}

const sizeConfig = {
  sm: {
    container: 'px-2 py-1 text-xs',
    icon: 'text-xs mr-1'
  },
  md: {
    container: 'px-2.5 py-1.5 text-sm',
    icon: 'text-sm mr-1.5'
  },
  lg: {
    container: 'px-3 py-2 text-base',
    icon: 'text-base mr-2'
  }
}

export function DeliveryStatusBadge({
  status,
  className,
  showIcon = true,
  size = 'md'
}: DeliveryStatusBadgeProps) {
  const config = statusConfig[status]
  const sizeClasses = sizeConfig[size]

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        config.bgColor,
        config.textColor,
        sizeClasses.container,
        className
      )}
      role="status"
      aria-label={`Delivery status: ${config.label}`}
    >
      {showIcon && (
        <span className={sizeClasses.icon} aria-hidden="true">
          {config.icon}
        </span>
      )}
      {config.label}
    </span>
  )
}