'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRightIcon } from '@heroicons/react/20/solid'
import { useNavigation } from '@/contexts/NavigationContext'
import { DASHBOARD_NAVIGATION_ITEMS as NAVIGATION_ITEMS } from '@/lib/constants/navigationItems'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  id: string
  label: string
  href?: string
}

interface BreadcrumbContextValue {
  extraCrumbs: BreadcrumbItem[]
  setExtraCrumbs: React.Dispatch<React.SetStateAction<BreadcrumbItem[]>>
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null)

function useBreadcrumbContext() {
  const context = useContext(BreadcrumbContext)

  if (!context) {
    throw new Error('useBreadcrumbs must be used within a BreadcrumbProvider')
  }

  return context
}

export interface BreadcrumbProviderProps {
  children: React.ReactNode
  resetKey?: string | null
}

export function BreadcrumbProvider({ children, resetKey }: BreadcrumbProviderProps) {
  const [extraCrumbs, setExtraCrumbs] = useState<BreadcrumbItem[]>([])

  useEffect(() => {
    setExtraCrumbs([])
  }, [resetKey])

  const value = useMemo(() => ({ extraCrumbs, setExtraCrumbs }), [extraCrumbs])

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumbs() {
  const { extraCrumbs, setExtraCrumbs } = useBreadcrumbContext()

  const setCrumbs = useCallback((crumbs: BreadcrumbItem[]) => {
    setExtraCrumbs(() => [...crumbs])
  }, [setExtraCrumbs])

  const appendCrumb = useCallback((crumb: BreadcrumbItem) => {
    setExtraCrumbs((current) => {
      const filtered = current.filter((item) => item.id !== crumb.id)
      return [...filtered, crumb]
    })
  }, [setExtraCrumbs])

  const clearCrumbs = useCallback(() => {
    setExtraCrumbs([])
  }, [setExtraCrumbs])

  return {
    crumbs: extraCrumbs,
    setCrumbs,
    appendCrumb,
    clearCrumbs
  }
}

export interface BreadcrumbsProps {
  className?: string
}

export function Breadcrumbs({ className }: BreadcrumbsProps) {
  const { pathname: navigationPathname, activeItemId } = useNavigation()
  const pathname = usePathname() || navigationPathname
  const { extraCrumbs } = useBreadcrumbContext()

  const baseCrumb = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)
    const basePath = segments.length >= 2
      ? `/${segments.slice(0, 2).join('/')}`
      : `/${segments.join('/')}`

    const activeItem = activeItemId
      ? NAVIGATION_ITEMS.find((item) => item.id === activeItemId)
      : undefined

    const matchedItem = activeItem ?? NAVIGATION_ITEMS.find((item) => {
      if (item.href === basePath) return true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (item.alternateHrefs?.includes(basePath as any)) return true
      return false
    })

    if (!matchedItem) {
      return null
    }

    return {
      id: matchedItem.id,
      label: matchedItem.label,
      href: matchedItem.href
    }
  }, [activeItemId, pathname])

  const crumbs = useMemo(() => {
    const trail = [] as BreadcrumbItem[]

    if (baseCrumb) {
      trail.push(baseCrumb)
    }

    if (extraCrumbs.length > 0) {
      trail.push(...extraCrumbs)
    }

    return trail
  }, [baseCrumb, extraCrumbs])

  if (crumbs.length === 0) {
    return null
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-sm text-neutral-500', className)}
    >
      <ol className="flex items-center gap-2">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1

          return (
            <li key={crumb.id} className="flex items-center gap-2">
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className="font-medium text-neutral-600 transition-colors hover:text-neutral-900"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className={cn('font-medium', isLast ? 'text-neutral-900' : 'text-neutral-600')}>
                  {crumb.label}
                </span>
              )}
              {index < crumbs.length - 1 && (
                <ChevronRightIcon aria-hidden="true" className="h-4 w-4 text-neutral-400" />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
