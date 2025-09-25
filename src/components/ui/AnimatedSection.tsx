'use client'

import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'
import { cn } from '@/lib/utils'

interface AnimatedSectionProps {
  children: React.ReactNode
  className?: string
  animation?: 'fadeUp' | 'fadeIn' | 'slideLeft' | 'slideRight' | 'scaleUp'
  delay?: number
  duration?: number
}

const animations = {
  fadeUp: {
    initial: 'opacity-0 translate-y-8',
    animate: 'opacity-100 translate-y-0'
  },
  fadeIn: {
    initial: 'opacity-0',
    animate: 'opacity-100'
  },
  slideLeft: {
    initial: 'opacity-0 -translate-x-8',
    animate: 'opacity-100 translate-x-0'
  },
  slideRight: {
    initial: 'opacity-0 translate-x-8',
    animate: 'opacity-100 translate-x-0'
  },
  scaleUp: {
    initial: 'opacity-0 scale-95',
    animate: 'opacity-100 scale-100'
  }
}

export function AnimatedSection({
  children,
  className,
  animation = 'fadeUp',
  delay = 0,
  duration = 600
}: AnimatedSectionProps) {
  const { ref, isVisible } = useIntersectionObserver({
    threshold: 0.1,
    triggerOnce: true
  })

  const animationClasses = animations[animation]
  const delayClass = delay > 0 ? `animation-delay-${delay}` : ''

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all ease-out',
        `duration-${duration}`,
        isVisible ? animationClasses.animate : animationClasses.initial,
        delayClass,
        className
      )}
      style={{
        transitionDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  )
}

// Pre-configured animated components for common use cases
export function FadeUpSection(props: Omit<AnimatedSectionProps, 'animation'>) {
  return <AnimatedSection {...props} animation="fadeUp" />
}

export function FadeInSection(props: Omit<AnimatedSectionProps, 'animation'>) {
  return <AnimatedSection {...props} animation="fadeIn" />
}

export function SlideLeftSection(props: Omit<AnimatedSectionProps, 'animation'>) {
  return <AnimatedSection {...props} animation="slideLeft" />
}

export function SlideRightSection(props: Omit<AnimatedSectionProps, 'animation'>) {
  return <AnimatedSection {...props} animation="slideRight" />
}

export function ScaleUpSection(props: Omit<AnimatedSectionProps, 'animation'>) {
  return <AnimatedSection {...props} animation="scaleUp" />
}