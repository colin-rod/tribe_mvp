import { Suspense } from 'react'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  )
}
