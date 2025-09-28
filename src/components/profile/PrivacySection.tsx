'use client'

import React, { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/Button'
import { FormMessage } from '@/components/ui/FormMessage'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'
import type { PrivacyFormData, FormState } from '@/lib/types/profile'
import {
  getPrivacySettings,
  updatePrivacySettings,
  updateUserMetadataPrivacySettings,
  requestDataExport,
  requestDataDeletion,
  downloadBlob,
  convertPrivacySettingsToForm,
  PrivacyAPIError
} from '@/lib/api/privacy'
import {
  LockClosedIcon,
  EyeIcon,
  ShareIcon,
  ChartBarIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

interface PrivacySectionProps {
  user: User
}

const VISIBILITY_OPTIONS = [
  {
    value: 'public' as const,
    label: 'Public',
    description: 'Anyone can see your public updates',
    icon: EyeIcon
  },
  {
    value: 'private' as const,
    label: 'Private',
    description: 'Only you can see your profile',
    icon: LockClosedIcon
  },
  {
    value: 'friends' as const,
    label: 'Friends Only',
    description: 'Only people you share updates with can see your profile',
    icon: ShareIcon
  }
]

export function PrivacySection({ user }: PrivacySectionProps) {
  const [formData, setFormData] = useState<PrivacyFormData>({
    profileVisibility: 'friends',
    dataSharing: false,
    analyticsOptOut: false,
    deleteAfterInactivity: false
  })

  const [initialLoading, setInitialLoading] = useState(true)

  const [formState, setFormState] = useState<FormState>({
    loading: false,
    success: false,
    error: null
  })

  const [showDataExportDialog, setShowDataExportDialog] = useState(false)
  const [showDataDeleteDialog, setShowDataDeleteDialog] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Load privacy settings on component mount
  useEffect(() => {
    loadPrivacySettings()
  }, [])

  const loadPrivacySettings = async () => {
    try {
      setInitialLoading(true)
      const settings = await getPrivacySettings()

      if (settings) {
        setFormData(convertPrivacySettingsToForm(settings))
      } else {
        // Use user metadata as fallback
        setFormData({
          profileVisibility: user.user_metadata?.profileVisibility || 'friends',
          dataSharing: user.user_metadata?.dataSharing ?? false,
          analyticsOptOut: user.user_metadata?.analyticsOptOut ?? false,
          deleteAfterInactivity: user.user_metadata?.deleteAfterInactivity ?? false
        })
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error)
      setFormState({
        loading: false,
        success: false,
        error: error instanceof PrivacyAPIError ? error.message : 'Failed to load privacy settings'
      })
    } finally {
      setInitialLoading(false)
    }
  }

  const handleInputChange = (field: keyof PrivacyFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear form state when user makes changes
    if (formState.success || formState.error) {
      setFormState(prev => ({ ...prev, success: false, error: null }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setFormState({ loading: true, success: false, error: null })

    try {
      // Update privacy settings in database
      await updatePrivacySettings(formData)

      // Also update user metadata for backward compatibility
      await updateUserMetadataPrivacySettings(formData)

      setFormState({
        loading: false,
        success: true,
        error: null,
        lastSaved: new Date()
      })

      // Clear success message after 3 seconds
      setTimeout(() => {
        setFormState(prev => ({ ...prev, success: false }))
      }, 3000)
    } catch (error) {
      console.error('Error updating privacy settings:', error)
      setFormState({
        loading: false,
        success: false,
        error: error instanceof PrivacyAPIError ? error.message : 'Failed to update privacy settings'
      })
    }
  }

  const handleDataExport = async () => {
    setExportLoading(true)

    try {
      // Request full data export
      const exportBlob = await requestDataExport('full')

      // Generate filename with current date
      const today = new Date().toISOString().split('T')[0]
      const filename = `tribe_data_export_${today}.zip`

      // Trigger download
      downloadBlob(exportBlob, filename)

      setFormState({
        loading: false,
        success: true,
        error: null
      })

      setTimeout(() => {
        setFormState(prev => ({ ...prev, success: false }))
      }, 3000)
    } catch (error) {
      console.error('Error exporting data:', error)
      setFormState({
        loading: false,
        success: false,
        error: error instanceof PrivacyAPIError ? error.message : 'Failed to export data. Please try again or contact support.'
      })
    } finally {
      setExportLoading(false)
      setShowDataExportDialog(false)
    }
  }

  const handleDataDeletion = async () => {
    setDeleteLoading(true)

    try {
      // Request data deletion with confirmation
      await requestDataDeletion('user_requested', true)

      setFormState({
        loading: false,
        success: true,
        error: null
      })

      setTimeout(() => {
        setFormState(prev => ({ ...prev, success: false }))
      }, 3000)
    } catch (error) {
      console.error('Error deleting data:', error)
      setFormState({
        loading: false,
        success: false,
        error: error instanceof PrivacyAPIError ? error.message : 'Failed to delete data. Please try again or contact support.'
      })
    } finally {
      setDeleteLoading(false)
      setShowDataDeleteDialog(false)
    }
  }

  const ToggleSwitch = ({
    checked,
    onChange,
    'aria-labelledby': ariaLabelledBy
  }: {
    checked: boolean
    onChange: (checked: boolean) => void
    'aria-labelledby'?: string
  }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2',
        checked ? 'bg-primary-600' : 'bg-gray-200'
      )}
      role="switch"
      aria-checked={checked}
      aria-labelledby={ariaLabelledBy}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )

  // Show loading state while initial data is being fetched
  if (initialLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading privacy settings...</span>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Privacy Settings</h2>
        <p className="text-sm text-gray-600">
          Control how your data is used and who can see your information.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Profile Visibility */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-base font-medium text-gray-900">Profile Visibility</h3>
            <p className="text-sm text-gray-600">Choose who can see your profile and updates</p>
          </div>

          <div className="space-y-3">
            {VISIBILITY_OPTIONS.map((option) => {
              const Icon = option.icon
              const isSelected = formData.profileVisibility === option.value

              return (
                <label
                  key={option.value}
                  className={cn(
                    'relative flex cursor-pointer rounded-lg border p-4 focus:outline-none',
                    isSelected
                      ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-600'
                      : 'border-gray-300 bg-white hover:bg-gray-50'
                  )}
                >
                  <input
                    type="radio"
                    name="profileVisibility"
                    value={option.value}
                    checked={isSelected}
                    onChange={(e) => handleInputChange('profileVisibility', e.target.value)}
                    className="sr-only"
                    aria-describedby={`${option.value}-description`}
                  />
                  <div className="flex items-start">
                    <Icon
                      className={cn(
                        'h-5 w-5 mt-0.5 mr-3',
                        isSelected ? 'text-primary-600' : 'text-gray-400'
                      )}
                      aria-hidden="true"
                    />
                    <div className="flex-1">
                      <span className={cn('block text-sm font-medium', isSelected ? 'text-primary-900' : 'text-gray-900')}>
                        {option.label}
                      </span>
                      <span
                        id={`${option.value}-description`}
                        className={cn('block text-sm', isSelected ? 'text-primary-700' : 'text-gray-500')}
                      >
                        {option.description}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="absolute -inset-px rounded-lg border-2 border-primary-600 pointer-events-none" aria-hidden="true" />
                  )}
                </label>
              )
            })}
          </div>
        </div>

        {/* Data Usage */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="mb-6">
            <h3 className="text-base font-medium text-gray-900">Data Usage</h3>
            <p className="text-sm text-gray-600">Control how your data is used to improve our service</p>
          </div>

          <div className="space-y-6">
            {/* Data Sharing */}
            <div className="flex items-center justify-between">
              <div className="flex items-start flex-1">
                <ShareIcon className="w-5 h-5 text-gray-400 mr-3 mt-0.5" aria-hidden="true" />
                <div>
                  <label htmlFor="dataSharing" className="text-sm font-medium text-gray-900">
                    Anonymous Data Sharing
                  </label>
                  <p className="text-sm text-gray-600">
                    Allow us to use anonymized data to improve our service and features
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={formData.dataSharing}
                onChange={(checked) => handleInputChange('dataSharing', checked)}
                aria-labelledby="dataSharing"
              />
            </div>

            {/* Analytics Opt-out */}
            <div className="flex items-center justify-between">
              <div className="flex items-start flex-1">
                <ChartBarIcon className="w-5 h-5 text-gray-400 mr-3 mt-0.5" aria-hidden="true" />
                <div>
                  <label htmlFor="analyticsOptOut" className="text-sm font-medium text-gray-900">
                    Opt Out of Analytics
                  </label>
                  <p className="text-sm text-gray-600">
                    Disable collection of usage analytics and behavioral data
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={formData.analyticsOptOut}
                onChange={(checked) => handleInputChange('analyticsOptOut', checked)}
                aria-labelledby="analyticsOptOut"
              />
            </div>

            {/* Auto-delete after inactivity */}
            <div className="flex items-center justify-between">
              <div className="flex items-start flex-1">
                <ClockIcon className="w-5 h-5 text-gray-400 mr-3 mt-0.5" aria-hidden="true" />
                <div>
                  <label htmlFor="deleteAfterInactivity" className="text-sm font-medium text-gray-900">
                    Auto-delete After Inactivity
                  </label>
                  <p className="text-sm text-gray-600">
                    Automatically delete your account after 2 years of inactivity
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={formData.deleteAfterInactivity}
                onChange={(checked) => handleInputChange('deleteAfterInactivity', checked)}
                aria-labelledby="deleteAfterInactivity"
              />
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="mb-6">
            <h3 className="text-base font-medium text-gray-900">Data Management</h3>
            <p className="text-sm text-gray-600">Export or delete your personal data</p>
          </div>

          <div className="space-y-4">
            {/* Export Data */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
              <div className="flex items-center">
                <DocumentArrowDownIcon className="w-5 h-5 text-gray-400 mr-3" aria-hidden="true" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Export Your Data</h4>
                  <p className="text-sm text-gray-600">Download a copy of all your data</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDataExportDialog(true)}
              >
                Export Data
              </Button>
            </div>

            {/* Delete All Data */}
            <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <TrashIcon className="w-5 h-5 text-red-400 mr-3" aria-hidden="true" />
                <div>
                  <h4 className="text-sm font-medium text-red-900">Delete All Data</h4>
                  <p className="text-sm text-red-700">Permanently delete all your personal data</p>
                </div>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setShowDataDeleteDialog(true)}
              >
                Delete Data
              </Button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={formState.loading}
            className="min-w-[120px]"
          >
            {formState.loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </form>

      {/* Form Messages */}
      {formState.success && (
        <FormMessage
          type="success"
          message="Privacy settings updated successfully!"
          details={formState.lastSaved ? `Last saved at ${formState.lastSaved.toLocaleTimeString()}` : undefined}
          className="mt-6"
        />
      )}

      {formState.error && (
        <FormMessage
          type="error"
          message="Failed to update privacy settings"
          details={formState.error}
          className="mt-6"
        />
      )}

      {/* Data Export Confirmation Dialog */}
      <ConfirmationDialog
        open={showDataExportDialog}
        onClose={() => setShowDataExportDialog(false)}
        onConfirm={handleDataExport}
        title="Export Your Data"
        description="We&apos;ll create a downloadable ZIP file containing all your personal data, including profiles, updates, photos, and settings. The download will start immediately."
        confirmText="Export Data"
        cancelText="Cancel"
        variant="info"
        loading={exportLoading}
      >
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800 font-medium">
            Your export will include:
          </p>
          <ul className="mt-2 text-sm text-blue-700 list-disc list-inside">
            <li>Profile information and settings</li>
            <li>Children profiles and updates</li>
            <li>Photos and media files</li>
            <li>Recipient lists and groups</li>
            <li>All sent updates and responses</li>
          </ul>
          <p className="mt-2 text-sm text-blue-700">
            The download will start automatically when ready.
          </p>
        </div>
      </ConfirmationDialog>

      {/* Data Deletion Confirmation Dialog */}
      <ConfirmationDialog
        open={showDataDeleteDialog}
        onClose={() => setShowDataDeleteDialog(false)}
        onConfirm={handleDataDeletion}
        title="Delete All Personal Data"
        description="This will permanently delete all your personal data while keeping your account active. You can continue using Tribe, but all your updates, photos, and settings will be removed. This action cannot be undone."
        confirmText="Delete All Data"
        cancelText="Keep Data"
        variant="destructive"
        loading={deleteLoading}
      >
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800 font-medium">
            This will permanently delete:
          </p>
          <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
            <li>All children profiles and updates</li>
            <li>Photos and media files</li>
            <li>Recipient lists and groups</li>
            <li>All sent updates and conversations</li>
            <li>Personal preferences and settings</li>
          </ul>
          <p className="mt-2 text-sm text-red-700 font-medium">
            Your account will remain active but will be reset to default state.
          </p>
        </div>
      </ConfirmationDialog>
    </div>
  )
}
