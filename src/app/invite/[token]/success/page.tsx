import { Card } from '@/components/ui/Card'
import { CheckCircle, Heart, Mail } from 'lucide-react'

export default function InviteSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 p-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome to the Family!
          </h1>
          <p className="text-lg text-gray-600">
            You&apos;ve successfully subscribed to baby updates
          </p>
        </div>

        <div className="bg-blue-50 p-6 rounded-lg space-y-4">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-left text-sm text-gray-700">
              <p className="font-semibold mb-1">What happens next?</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>You&apos;ll receive updates based on your preferences</li>
                <li>Check your email for a welcome message</li>
                <li>You can update your preferences anytime</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-3 border-t border-blue-100">
            <Heart className="h-5 w-5 text-pink-500 mt-0.5 flex-shrink-0" />
            <div className="text-left text-sm text-gray-700">
              <p className="font-semibold mb-1">Stay connected</p>
              <p>
                You&apos;re now part of the journey! Watch for updates coming your way soon.
              </p>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 pt-4">
          <p>Questions? Contact the person who invited you.</p>
        </div>
      </Card>
    </div>
  )
}
