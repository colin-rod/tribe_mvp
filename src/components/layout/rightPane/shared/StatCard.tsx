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

export function StatCard({ label, value, icon, trend, className = '' }: StatCardProps) {
  return (
    <div className={`rounded-lg border border-neutral-200 p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-neutral-600 mb-1">{label}</p>
          <p className="text-2xl font-semibold text-neutral-900">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${
              trend.direction === 'up' ? 'text-green-600' :
              trend.direction === 'down' ? 'text-red-600' :
              'text-neutral-600'
            }`}>
              {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div className="text-neutral-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
