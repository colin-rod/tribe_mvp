import { cn } from '@/lib/utils'

export interface DetailCardProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function DetailCard({ title, children, className }: DetailCardProps) {
  return (
    <div className={cn('right-pane-card right-pane-card--bordered space-y-3', className)}>
      <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

export interface DetailRowProps {
  label: string
  value: string | React.ReactNode
}

export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-sm text-neutral-600">{label}</span>
      <span className="text-sm text-neutral-900 font-medium text-right">{value}</span>
    </div>
  )
}
