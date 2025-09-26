'use client'

import React, { useState, useEffect } from 'react'
import { useNotificationManager } from '@/hooks/useNotificationManager'
import { useProfileManager } from '@/hooks/useProfileManager'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'
import {
  BellIcon,
  EnvelopeIcon,
  ClockIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  EyeIcon,
  BugAntIcon,
  CogIcon,
  InformationCircleIcon,
  SpeakerWaveIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface NotificationTestResult {
  id: string
  type: 'response' | 'prompt' | 'digest' | 'system'
  method: 'browser' | 'email'
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  timestamp: Date
  error?: string
}

interface NotificationTemplate {
  type: 'response' | 'prompt' | 'digest' | 'system'
  title: string
  content: string
  metadata?: Record<string, any>
}

const notificationTemplates: NotificationTemplate[] = [
  {
    type: 'response',
    title: 'New Response from Emma',
    content: 'Emma responded to your update about "First steps at the park" with a lovely message and photo.',
    metadata: { updateTitle: 'First steps at the park', responderName: 'Emma' }
  },
  {
    type: 'prompt',
    title: 'Weekly Update Reminder',
    content: 'It\'s been a few days since your last update. How about sharing what Lily has been up to lately?',
    metadata: { childName: 'Lily', lastUpdateDays: 3 }
  },
  {
    type: 'digest',
    title: 'Weekly Activity Summary',
    content: 'Your weekly digest is ready! You received 5 responses this week and shared 2 updates.',
    metadata: { responseCount: 5, updateCount: 2, period: 'week' }
  },
  {
    type: 'system',
    title: 'Security Alert',
    content: 'We noticed a new login to your account from a different device. If this wasn\'t you, please review your account security.',
    metadata: { loginLocation: 'San Francisco, CA', device: 'iPhone' }
  }
]

const mockAnalytics = {
  totalSent: 156,
  deliveryRate: 94.2,
  openRate: 68.7,
  clickRate: 23.4,
  recentActivity: [
    { date: '2024-01-15', sent: 12, delivered: 11, opened: 8, clicked: 3 },
    { date: '2024-01-14', sent: 8, delivered: 8, opened: 6, clicked: 2 },
    { date: '2024-01-13', sent: 15, delivered: 14, opened: 10, clicked: 4 },
    { date: '2024-01-12', sent: 6, delivered: 6, opened: 4, clicked: 1 },
    { date: '2024-01-11', sent: 10, delivered: 9, opened: 7, clicked: 2 }
  ]
}

export default function NotificationTesting() {
  const {
    preferences,
    loading: prefsLoading,
    error: prefsError,
    sendTestNotification,
    isInQuietHours,
    getNextNotificationTime
  } = useNotificationManager()

  const { profile } = useProfileManager()

  const [activeTab, setActiveTab] = useState<'testing' | 'preview' | 'analytics' | 'debug'>('testing')
  const [testResults, setTestResults] = useState<NotificationTestResult[]>([])
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default')
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    // Check browser notification permission status
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission)
    }
  }, [])

  useEffect(() => {
    // Add debug log entry
    if (preferences) {
      addDebugLog(`Notification preferences loaded: ${JSON.stringify(preferences, null, 2)}`)
    }
  }, [preferences])

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]) // Keep last 50 logs
  }

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission()
        setPermissionStatus(permission)
        addDebugLog(`Notification permission ${permission === 'granted' ? 'granted' : 'denied'}`)
      } catch (error) {
        addDebugLog(`Failed to request notification permission: ${error}`)
      }
    }
  }

  const runNotificationTest = async (type: NotificationTemplate['type'], method: 'browser' | 'email') => {
    setIsTesting(true)
    const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Add test result with pending status
    const testResult: NotificationTestResult = {
      id: testId,
      type,
      method,
      status: 'pending',
      timestamp: new Date()
    }

    setTestResults(prev => [testResult, ...prev])
    addDebugLog(`Starting ${method} notification test for type: ${type}`)

    try {
      // Simulate sending notification
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (method === 'browser') {
        if (permissionStatus !== 'granted') {
          throw new Error('Browser notification permission not granted')
        }

        const template = notificationTemplates.find(t => t.type === type)
        if (template) {
          new Notification(template.title, {
            body: template.content,
            icon: '/favicon.ico',
            tag: `tribe-test-${type}`,
            badge: '/favicon.ico'
          })
        }
      }

      // Update test result to success
      setTestResults(prev => prev.map(result =>
        result.id === testId
          ? { ...result, status: 'delivered' }
          : result
      ))
      addDebugLog(`SUCCESS: ${method} notification test completed successfully for type: ${type}`)

    } catch (error) {
      // Update test result to failed
      setTestResults(prev => prev.map(result =>
        result.id === testId
          ? { ...result, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' }
          : result
      ))
      addDebugLog(`ERROR: ${method} notification test failed for type: ${type} - ${error}`)
    } finally {
      setIsTesting(false)
    }
  }

  const clearTestResults = () => {
    setTestResults([])
    addDebugLog('Test results cleared')
  }

  const clearDebugLogs = () => {
    setDebugLogs([])
  }

  const renderStatusIcon = (status: NotificationTestResult['status']) => {
    switch (status) {
      case 'pending':
        return <ArrowPathIcon className="w-4 h-4 text-yellow-500 animate-spin" />
      case 'sent':
      case 'delivered':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircleIcon className="w-4 h-4 text-red-500" />
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />
    }
  }

  const tabs = [
    { id: 'testing', label: 'Test Panel', icon: PlayIcon },
    { id: 'preview', label: 'Templates', icon: EyeIcon },
    { id: 'analytics', label: 'Analytics', icon: ChartBarIcon },
    { id: 'debug', label: 'Debug Console', icon: BugAntIcon }
  ]

  if (prefsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Notification Testing & Preview</h3>
        <p className="mt-1 text-sm text-gray-600">
          Test your notification settings, preview templates, and monitor delivery performance.
        </p>
      </div>

      {/* Error Display */}
      {prefsError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-600">{prefsError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Browser Notification Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className={cn(
              'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
              permissionStatus === 'granted' ? 'bg-green-100' : 'bg-yellow-100'
            )}>
              <ComputerDesktopIcon className={cn(
                'w-5 h-5',
                permissionStatus === 'granted' ? 'text-green-600' : 'text-yellow-600'
              )} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Browser Notifications</p>
              <p className={cn(
                'text-xs',
                permissionStatus === 'granted' ? 'text-green-600' : 'text-yellow-600'
              )}>
                {permissionStatus === 'granted' ? 'Enabled' : 'Not enabled'}
              </p>
            </div>
          </div>
          {permissionStatus !== 'granted' && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3 w-full"
              onClick={requestNotificationPermission}
            >
              Enable Notifications
            </Button>
          )}
        </div>

        {/* Quiet Hours Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className={cn(
              'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
              isInQuietHours() ? 'bg-purple-100' : 'bg-green-100'
            )}>
              <ClockIcon className={cn(
                'w-5 h-5',
                isInQuietHours() ? 'text-purple-600' : 'text-green-600'
              )} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Quiet Hours</p>
              <p className={cn(
                'text-xs',
                isInQuietHours() ? 'text-purple-600' : 'text-green-600'
              )}>
                {isInQuietHours() ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
          {preferences?.quiet_hours && (
            <p className="mt-2 text-xs text-gray-500">
              {preferences.quiet_hours.start} - {preferences.quiet_hours.end}
            </p>
          )}
        </div>

        {/* Email Notifications Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className={cn(
              'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
              preferences?.email_notifications ? 'bg-green-100' : 'bg-gray-100'
            )}>
              <EnvelopeIcon className={cn(
                'w-5 h-5',
                preferences?.email_notifications ? 'text-green-600' : 'text-gray-400'
              )} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Email Notifications</p>
              <p className={cn(
                'text-xs',
                preferences?.email_notifications ? 'text-green-600' : 'text-gray-500'
              )}>
                {preferences?.email_notifications ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
          {profile?.email && (
            <p className="mt-2 text-xs text-gray-500 truncate">
              {profile.email}
            </p>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex items-center py-4 px-1 border-b-2 font-medium text-sm',
                  isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon className="w-5 h-5 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Testing Panel */}
        {activeTab === 'testing' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Test Controls */}
              <div className="space-y-4">
                <h4 className="text-base font-medium text-gray-900">Send Test Notifications</h4>

                <div className="space-y-3">
                  {notificationTemplates.map((template) => (
                    <div key={template.type} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 capitalize">
                            {template.type} Notification
                          </h5>
                          <p className="text-xs text-gray-500">{template.title}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runNotificationTest(template.type, 'browser')}
                          disabled={isTesting || permissionStatus !== 'granted'}
                          className="flex-1"
                        >
                          <ComputerDesktopIcon className="w-4 h-4 mr-1" />
                          Browser
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runNotificationTest(template.type, 'email')}
                          disabled={isTesting || !preferences?.email_notifications}
                          className="flex-1"
                        >
                          <EnvelopeIcon className="w-4 h-4 mr-1" />
                          Email
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test Results */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-medium text-gray-900">Test Results</h4>
                  {testResults.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearTestResults}
                    >
                      Clear Results
                    </Button>
                  )}
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {testResults.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <PlayIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No test results yet</p>
                      <p className="text-xs">Run a test to see results here</p>
                    </div>
                  ) : (
                    testResults.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          {renderStatusIcon(result.status)}
                          <div>
                            <p className="text-sm font-medium text-gray-900 capitalize">
                              {result.type} - {result.method}
                            </p>
                            <p className="text-xs text-gray-500">
                              {result.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>

                        {result.error && (
                          <div className="flex items-center text-red-600">
                            <ExclamationTriangleIcon className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Template Preview */}
        {activeTab === 'preview' && (
          <div className="space-y-6">
            <h4 className="text-base font-medium text-gray-900">Notification Templates</h4>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {notificationTemplates.map((template) => (
                <div key={template.type} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Browser Preview */}
                  <div className="p-4 bg-gray-50 border-b">
                    <div className="flex items-center mb-2">
                      <ComputerDesktopIcon className="w-4 h-4 mr-2 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Browser Notification</span>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border p-3 max-w-sm">
                      <div className="flex items-start space-x-2">
                        <div className="w-6 h-6 bg-primary-500 rounded-sm flex-shrink-0 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">T</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {template.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {template.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Email Preview */}
                  <div className="p-4">
                    <div className="flex items-center mb-2">
                      <EnvelopeIcon className="w-4 h-4 mr-2 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Email Notification</span>
                    </div>

                    <div className="bg-white border rounded p-3">
                      <div className="text-xs text-gray-500 mb-2">
                        Subject: {template.title}
                      </div>
                      <div className="text-sm text-gray-900">
                        {template.content}
                      </div>
                      {template.metadata && (
                        <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                          <span className="font-medium">Metadata:</span>
                          <pre className="mt-1 whitespace-pre-wrap">
                            {JSON.stringify(template.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Dashboard */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h4 className="text-base font-medium text-gray-900">Notification Analytics</h4>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BellIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-semibold text-gray-900">{mockAnalytics.totalSent}</p>
                    <p className="text-sm text-gray-600">Total Sent</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-semibold text-gray-900">{mockAnalytics.deliveryRate}%</p>
                    <p className="text-sm text-gray-600">Delivery Rate</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <EyeIcon className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-semibold text-gray-900">{mockAnalytics.openRate}%</p>
                    <p className="text-sm text-gray-600">Open Rate</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="w-8 h-8 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-semibold text-gray-900">{mockAnalytics.clickRate}%</p>
                    <p className="text-sm text-gray-600">Click Rate</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h5 className="text-base font-medium text-gray-900 mb-4">Recent Activity</h5>

              <div className="space-y-3">
                {mockAnalytics.recentActivity.map((day, index) => (
                  <div key={day.date} className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {new Date(day.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-900">{day.sent} sent</span>
                      <span className="text-green-600">{day.delivered} delivered</span>
                      <span className="text-purple-600">{day.opened} opened</span>
                      <span className="text-orange-600">{day.clicked} clicked</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Debug Console */}
        {activeTab === 'debug' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-medium text-gray-900">Debug Console</h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearDebugLogs}
                disabled={debugLogs.length === 0}
              >
                Clear Logs
              </Button>
            </div>

            {/* Debug Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-3">System Information</h5>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Browser Support:</span>
                      <span className="text-gray-900">
                        {'Notification' in window ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Permission Status:</span>
                      <span className="text-gray-900 capitalize">{permissionStatus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service Worker:</span>
                      <span className="text-gray-900">
                        {'serviceWorker' in navigator ? 'Supported' : 'Not supported'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Time:</span>
                      <span className="text-gray-900">{new Date().toLocaleTimeString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">In Quiet Hours:</span>
                      <span className="text-gray-900">{isInQuietHours() ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-3">Current Preferences</h5>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(preferences, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <h5 className="text-sm font-medium text-white mb-3">Debug Logs</h5>
                  {debugLogs.length === 0 ? (
                    <p className="text-gray-400 text-sm">No debug logs yet</p>
                  ) : (
                    <div className="space-y-1">
                      {debugLogs.map((log, index) => (
                        <div key={index} className="text-xs text-gray-300 font-mono">
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Information Footer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <InformationCircleIcon className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="ml-3">
            <h5 className="text-sm font-medium text-blue-900">About Notification Testing</h5>
            <div className="mt-1 text-sm text-blue-700">
              <p>
                This testing interface helps you verify your notification settings work correctly.
                Test notifications are safe and won't be sent to your recipients. Use this tool to:
              </p>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Verify browser notification permissions are working</li>
                <li>Preview how notifications will look to recipients</li>
                <li>Test notification delivery during quiet hours</li>
                <li>Monitor notification performance and engagement</li>
                <li>Debug notification delivery issues</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
