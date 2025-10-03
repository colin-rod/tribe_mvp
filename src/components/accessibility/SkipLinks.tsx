/**
 * SkipLinks Component
 * CRO-302: Keyboard Navigation & Accessibility (WCAG 2.1 AA)
 *
 * Provides skip links for keyboard users to bypass repetitive navigation
 * and jump directly to main content areas
 */

'use client';

export interface SkipLink {
  id: string;
  label: string;
  href: string;
}

export interface SkipLinksProps {
  links?: SkipLink[];
}

const DEFAULT_LINKS: SkipLink[] = [
  { id: 'skip-to-main', label: 'Skip to main content', href: '#main-content' },
  {
    id: 'skip-to-navigation',
    label: 'Skip to navigation',
    href: '#main-navigation',
  },
];

export function SkipLinks({ links = DEFAULT_LINKS }: SkipLinksProps) {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <nav aria-label="Skip links">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.href}
            className="
              fixed top-4 left-4 z-[9999]
              px-4 py-2
              bg-blue-600 text-white
              font-medium text-sm
              rounded-md
              shadow-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              transition-transform
              -translate-y-full focus:translate-y-0
            "
            onClick={(e) => {
              e.preventDefault();
              const target = document.querySelector(link.href);
              if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Focus the target element if it's focusable
                if (target instanceof HTMLElement) {
                  target.focus();
                }
              }
            }}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
