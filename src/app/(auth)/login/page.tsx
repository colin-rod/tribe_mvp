import { Suspense } from 'react'
import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="space-y-6 animate-pulse">
      <div className="h-10 bg-gray-200 rounded w-3/4 mx-auto" />
      <div className="h-10 bg-gray-200 rounded w-1/2 mx-auto" />
      <div className="h-40 bg-gray-200 rounded" />
    </div>}>
      <LoginForm />
    </Suspense>
  )
}