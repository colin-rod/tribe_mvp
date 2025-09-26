'use client'

import { cn } from '@/lib/utils'
import type { ComponentType, SVGProps } from 'react'
import {
  ClockIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/solid'

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
  icon: ComponentType<SVGProps<SVGSVGElement>>
}> = {
  queued: {
    label: 'Queued',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    icon: ClockIcon
  },
  sent: {
    label: 'Sent',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    icon: PaperAirplaneIcon
  },
  delivered: {
    label: 'Delivered',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    icon: CheckCircleIcon
  },
  failed: {
    label: 'Failed',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    icon: XCircleIcon
  }
}

const sizeConfig = {
  sm: {
    container: 'px-2 py-1 text-xs',
    icon: 'h-3.5 w-3.5 mr-1'
  },
  md: {
    container: 'px-2.5 py-1.5 text-sm',
    icon: 'h-4 w-4 mr-1.5'
  },
  lg: {
    container: 'px-3 py-2 text-base',
    icon: 'h-5 w-5 mr-2'
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

  const Icon = config.icon

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
        <Icon className={cn('flex-shrink-0', sizeClasses.icon)} aria-hidden="true" />
      )}
      {config.label}
    </span>
  )
}
