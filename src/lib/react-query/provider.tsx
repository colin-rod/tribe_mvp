/**
 * React Query Provider for Next.js App Router
 * CRO-98 Phase 3: Client-side caching provider
 *
 * This component wraps the application with React Query's QueryClientProvider
 * enabling caching, background refetching, and optimistic updates throughout the app.
 */

'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ReactNode, useState } from 'react'
import { createQueryClient } from './client'

interface ReactQueryProviderProps {
  children: ReactNode
}

/**
 * Provider component that initializes React Query for the application
 *
 * Usage: Wrap your root layout or app component with this provider
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <ReactQueryProvider>
 *           {children}
 *         </ReactQueryProvider>
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */
export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  // Create a new QueryClient instance for each request
  // This ensures SSR works correctly and prevents state sharing between users
  const [queryClient] = useState(() => createQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Query Devtools - only shown in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  )
}
