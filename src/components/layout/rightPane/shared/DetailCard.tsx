interface DetailCardProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function DetailCard({ title, children, className = '' }: DetailCardProps) {
  return (
    <div className={`rounded-lg border border-gray-200 p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

interface DetailRowProps {
  label: string
  value: string | React.ReactNode
}

export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm text-gray-900 font-medium text-right">{value}</span>
    </div>
  )
}
