'use client'

import { useEffect } from 'react'

export function SmoothScroll() {
  useEffect(() => {
    // Enable smooth scrolling for anchor links
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement
      const href = target.getAttribute('href')

      if (href && href.startsWith('#')) {
        e.preventDefault()
        const element = document.querySelector(href)

        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          })

          // Update URL without triggering scroll
          history.pushState(null, '', href)
        }
      }
    }

    // Add event listener to all links
    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [])

  return null
}

// Hook for programmatic smooth scrolling
export function useSmoothScroll() {
  const scrollToElement = (elementId: string) => {
    const element = document.querySelector(`#${elementId}`)
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }
  }

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  return {
    scrollToElement,
    scrollToTop
  }
}