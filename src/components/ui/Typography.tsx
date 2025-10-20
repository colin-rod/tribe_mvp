/**
 * Typography Component System
 *
 * Reusable typography components following the Tribe MVP design system.
 * Based on Major Third (1.25) type scale with semantic hierarchy.
 *
 * @example
 * ```tsx
 * <Heading level={1}>Main Title</Heading>
 * <Text variant="body-lg">Large body text</Text>
 * <Display size="lg">Hero Section Title</Display>
 * ```
 */

import React from 'react'
import { cn } from '@/lib/utils'

// Heading Component Props
interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Semantic heading level (1-6) */
  level: 1 | 2 | 3 | 4 | 5 | 6
  /** Visual style override (use when semantic level differs from visual hierarchy) */
  styleAs?: 1 | 2 | 3 | 4 | 5 | 6
  /** Enable responsive scaling */
  responsive?: boolean
  /** Additional CSS classes */
  className?: string
  children: React.ReactNode
}

/**
 * Semantic Heading Component
 *
 * Renders the correct HTML heading tag (h1-h6) with consistent styling.
 * Use `styleAs` to decouple semantic meaning from visual appearance.
 */
export const Heading: React.FC<HeadingProps> = ({
  level,
  styleAs,
  responsive = false,
  className,
  children,
  ...props
}) => {
  const Tag = `h${level}` as const
  const visualLevel = styleAs || level

  const baseClasses = {
    1: 'h1',
    2: 'h2',
    3: 'h3',
    4: 'h4',
    5: 'h5',
    6: 'h6',
  }

  const responsiveClasses = {
    1: 'heading-xl-responsive',
    2: 'heading-lg-responsive',
    3: 'heading-md-responsive',
    4: 'heading-sm-responsive',
    5: 'text-responsive-xl',
    6: 'text-responsive-lg',
  }

  return (
    <Tag
      className={cn(
        baseClasses[visualLevel],
        responsive ? responsiveClasses[visualLevel] : undefined,
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}

// Text Component Props
interface TextProps {
  /** Text variant/size */
  variant?: 'body' | 'body-lg' | 'body-sm' | 'body-xs' | 'caption' | 'overline'
  /** Text color preset */
  color?: 'default' | 'muted' | 'subtle' | 'emphasis' | 'brand' | 'success' | 'warning' | 'error' | 'info'
  /** Render as different HTML element */
  as?: 'p' | 'span' | 'div' | 'label'
  /** Enable responsive scaling */
  responsive?: boolean
  /** Additional CSS classes */
  className?: string
  children: React.ReactNode
  /** Additional HTML attributes */
  [key: string]: unknown
}

/**
 * Text Component
 *
 * For body text, captions, and other non-heading text content.
 */
export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'default',
  as: Component = 'p',
  responsive = false,
  className,
  children,
  ...props
}) => {
  const variantClasses = {
    'body': 'body',
    'body-lg': 'body-lg',
    'body-sm': 'body-sm',
    'body-xs': 'body-xs',
    'caption': 'caption',
    'overline': 'overline',
  }

  const colorClasses = {
    'default': '',
    'muted': 'text-muted',
    'subtle': 'text-subtle',
    'emphasis': 'text-emphasis',
    'brand': 'text-brand',
    'success': 'text-success',
    'warning': 'text-warning',
    'error': 'text-error',
    'info': 'text-info',
  }

  const responsiveClass = responsive ? 'text-responsive-base' : ''

  return (
    <Component
      className={cn(
        variantClasses[variant],
        colorClasses[color],
        responsiveClass,
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}

// Display Component Props
interface DisplayProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Display text size */
  size?: 'xl' | 'lg' | 'md'
  /** Render as specific heading level for semantics */
  as?: 'h1' | 'h2' | 'h3' | 'div'
  /** Additional CSS classes */
  className?: string
  children: React.ReactNode
}

/**
 * Display Component
 *
 * For hero sections and extra-large decorative text.
 * Use sparingly - typically once per page.
 */
export const Display: React.FC<DisplayProps> = ({
  size = 'lg',
  as: Component = 'h1',
  className,
  children,
  ...props
}) => {
  const sizeClasses = {
    'xl': 'display-xl',
    'lg': 'display-lg',
    'md': 'display-md',
  }

  return (
    <Component
      className={cn(sizeClasses[size], className)}
      {...props}
    >
      {children}
    </Component>
  )
}

// Link Component Props
interface LinkTextProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Link style variant */
  variant?: 'default' | 'subtle'
  /** Additional CSS classes */
  className?: string
  children: React.ReactNode
}

/**
 * Link Text Component
 *
 * Styled text links with hover states and accessibility features.
 */
export const LinkText: React.FC<LinkTextProps> = ({
  variant = 'default',
  className,
  children,
  ...props
}) => {
  const variantClasses = {
    'default': 'link',
    'subtle': 'link-subtle',
  }

  return (
    <a
      className={cn(variantClasses[variant], className)}
      {...props}
    >
      {children}
    </a>
  )
}

// Code Component Props
interface CodeProps extends React.HTMLAttributes<HTMLElement> {
  /** Render as block (pre + code) or inline (code) */
  block?: boolean
  /** Additional CSS classes */
  className?: string
  children: React.ReactNode
}

/**
 * Code Component
 *
 * For inline code snippets or code blocks.
 */
export const Code: React.FC<CodeProps> = ({
  block = false,
  className,
  children,
  ...props
}) => {
  if (block) {
    return (
      <pre className={className}>
        <code {...props}>{children}</code>
      </pre>
    )
  }

  return (
    <code className={className} {...props}>
      {children}
    </code>
  )
}

// Export all typography components
export const Typography = {
  Heading,
  Text,
  Display,
  Link: LinkText,
  Code,
}
