import { cn } from '@/lib/utils'

export interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: {
    value: string
    direction: 'up' | 'down' | 'neutral'
  }
  className?: string
}

export function StatCard({ label, value, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('right-pane-card right-pane-card--bordered', className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
          {trend && (
            <p
              className={cn(
                'mt-1 text-xs font-medium',
                trend.direction === 'up'
                  ? 'text-success-600'
                  : trend.direction === 'down'
                    ? 'text-error-600'
                    : 'text-neutral-600'
              )}
            >
              {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-50 text-neutral-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
