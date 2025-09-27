import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export type GridColumnCount = 1 | 2 | 3 | 4 | 5 | 6 | 12 | 'auto'
export type GridGap = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
export type GridBreakpoint = 'sm' | 'md' | 'lg' | 'xl'

export interface GridResponsiveConfig {
  sm?: GridColumnCount
  md?: GridColumnCount
  lg?: GridColumnCount
  xl?: GridColumnCount
}

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: GridColumnCount
  gap?: GridGap
  responsive?: GridResponsiveConfig
}

const GRID_COLUMNS: Record<GridColumnCount, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  12: 'grid-cols-12',
  auto: 'grid-cols-[repeat(auto-fit,minmax(250px,1fr))]'
}

const GRID_GAPS: Record<GridGap, string> = {
  none: 'gap-0',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
  '2xl': 'gap-12'
}

const Grid = forwardRef<HTMLDivElement, GridProps>((
  { className, cols = 1, gap = 'md', responsive, ...props },
  ref
) => {
  const responsiveClasses = responsive
    ? (Object.entries(responsive) as Array<[GridBreakpoint, GridColumnCount | undefined]>)
        .map(([breakpoint, value]) => (value ? `${breakpoint}:${GRID_COLUMNS[value]}` : null))
        .filter(Boolean)
        .join(' ')
    : ''

  return (
    <div
      ref={ref}
      className={cn(
        'grid',
        GRID_COLUMNS[cols],
        GRID_GAPS[gap],
        responsiveClasses,
        className
      )}
      {...props}
    />
  )
})
Grid.displayName = 'Grid'

export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  span?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'full' | 'auto'
  start?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 'auto'
  end?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 'auto'
}

const SPAN_CLASSES: Record<NonNullable<GridItemProps['span']>, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  7: 'col-span-7',
  8: 'col-span-8',
  9: 'col-span-9',
  10: 'col-span-10',
  11: 'col-span-11',
  12: 'col-span-12',
  full: 'col-span-full',
  auto: 'col-auto'
}

const START_CLASSES: Record<NonNullable<GridItemProps['start']>, string> = {
  1: 'col-start-1',
  2: 'col-start-2',
  3: 'col-start-3',
  4: 'col-start-4',
  5: 'col-start-5',
  6: 'col-start-6',
  7: 'col-start-7',
  8: 'col-start-8',
  9: 'col-start-9',
  10: 'col-start-10',
  11: 'col-start-11',
  12: 'col-start-12',
  13: 'col-start-13',
  auto: 'col-start-auto'
}

const END_CLASSES: Record<NonNullable<GridItemProps['end']>, string> = {
  1: 'col-end-1',
  2: 'col-end-2',
  3: 'col-end-3',
  4: 'col-end-4',
  5: 'col-end-5',
  6: 'col-end-6',
  7: 'col-end-7',
  8: 'col-end-8',
  9: 'col-end-9',
  10: 'col-end-10',
  11: 'col-end-11',
  12: 'col-end-12',
  13: 'col-end-13',
  auto: 'col-end-auto'
}

const GridItem = forwardRef<HTMLDivElement, GridItemProps>((
  { className, span, start, end, ...props },
  ref
) => {
  return (
    <div
      ref={ref}
      className={cn(
        span ? SPAN_CLASSES[span] : null,
        start ? START_CLASSES[start] : null,
        end ? END_CLASSES[end] : null,
        className
      )}
      {...props}
    />
  )
})
GridItem.displayName = 'GridItem'

export { Grid, GridItem }
