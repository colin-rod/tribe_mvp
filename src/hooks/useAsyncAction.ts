'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

export interface UseAsyncActionOptions {
  /**
   * Callback when action succeeds
   */
  onSuccess?: (data: unknown) => void

  /**
   * Callback when action fails
   */
  onError?: (error: Error) => void

  /**
   * Callback when action completes (success or error)
   */
  onSettled?: () => void

  /**
   * Whether to reset loading state after completion
   */
  resetOnComplete?: boolean
}

export interface UseAsyncActionReturn<T> {
  /**
   * Whether the action is currently loading
   */
  loading: boolean

  /**
   * Error from the last action execution
   */
  error: Error | null

  /**
   * Data from the last successful execution
   */
  data: T | null

  /**
   * Execute the async action
   */
  execute: (...args: unknown[]) => Promise<T>

  /**
   * Reset the state
   */
  reset: () => void
}

/**
 * Hook for managing async action state with loading, error, and data tracking
 *
 * Features:
 * - Automatic loading state management
 * - Error handling with Error object
 * - Success/error/settled callbacks
 * - Prevents state updates after unmount
 * - Type-safe data return
 *
 * @example
 * ```tsx
 * const { loading, error, execute } = useAsyncAction(
 *   async (data) => {
 *     return await createUpdate(data)
 *   },
 *   {
 *     onSuccess: () => toast.success('Update created!'),
 *     onError: (err) => toast.error(err.message)
 *   }
 * )
 *
 * // In component
 * <Button
 *   onClick={() => execute(formData)}
 *   loading={loading}
 * >
 *   Create Update
 * </Button>
 * ```
 */
export function useAsyncAction<T = unknown>(
  action: (...args: unknown[]) => Promise<T>,
  options: UseAsyncActionOptions = {}
): UseAsyncActionReturn<T> {
  const {
    onSuccess,
    onError,
    onSettled,
    resetOnComplete = false
  } = options

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<T | null>(null)

  // Track if component is mounted
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const execute = useCallback(
    async (...args: unknown[]): Promise<T> => {
      if (!isMountedRef.current) {
        throw new Error('Cannot execute action on unmounted component')
      }

      setLoading(true)
      setError(null)

      try {
        const result = await action(...args)

        if (isMountedRef.current) {
          setData(result)
          onSuccess?.(result)

          if (resetOnComplete) {
            setLoading(false)
          }
        }

        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))

        if (isMountedRef.current) {
          setError(error)
          onError?.(error)

          if (resetOnComplete) {
            setLoading(false)
          }
        }

        throw error
      } finally {
        if (isMountedRef.current) {
          if (!resetOnComplete) {
            setLoading(false)
          }
          onSettled?.()
        }
      }
    },
    [action, onSuccess, onError, onSettled, resetOnComplete]
  )

  const reset = useCallback(() => {
    if (isMountedRef.current) {
      setLoading(false)
      setError(null)
      setData(null)
    }
  }, [])

  return {
    loading,
    error,
    data,
    execute,
    reset
  }
}

/**
 * Hook for managing form submission with async action
 *
 * @example
 * ```tsx
 * const { handleSubmit, loading, error } = useFormSubmit(
 *   async (formData) => {
 *     return await createUpdate(formData)
 *   },
 *   {
 *     onSuccess: () => {
 *       toast.success('Update created!')
 *       router.push('/dashboard')
 *     }
 *   }
 * )
 *
 * <form onSubmit={handleSubmit}>
 *   <fieldset disabled={loading}>
 *     {/* form fields *\/}
 *   </fieldset>
 *   <Button type="submit" loading={loading}>
 *     Submit
 *   </Button>
 * </form>
 * ```
 */
export interface UseFormSubmitReturn<T> extends Omit<UseAsyncActionReturn<T>, 'execute'> {
  handleSubmit: (e: React.FormEvent) => Promise<void>
}

export function useFormSubmit<T = unknown>(
  action: (e: React.FormEvent) => Promise<T>,
  options: UseAsyncActionOptions = {}
): UseFormSubmitReturn<T> {
  const { loading, error, data, execute, reset } = useAsyncAction(action, options)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      await execute(e)
    },
    [execute]
  )

  return {
    handleSubmit,
    loading,
    error,
    data,
    reset
  }
}
