import { Suspense } from 'react'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
