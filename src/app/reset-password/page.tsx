/**
 * Reset Password Page
 * CRO-262: Password Reset Flow
 *
 * Allows users to set a new password after clicking reset link from email
 * The token is automatically handled by Supabase in the URL
 */

import { Metadata } from 'next'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Reset Password | Tribe',
  description: 'Set a new password for your Tribe account',
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  )
}
