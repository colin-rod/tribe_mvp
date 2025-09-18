interface HeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
}

export default function Header({ title, subtitle, children }: HeaderProps) {

  return (
    <div className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-gray-500">
                  {subtitle}
                </p>
              )}
            </div>
            {children && (
              <div className="mt-4 md:mt-0 md:ml-4">
                {children}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}