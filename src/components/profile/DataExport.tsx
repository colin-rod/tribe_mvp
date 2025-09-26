'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('DataExport')
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useProfileManager } from '@/hooks/useProfileManager'
import { exportUserData, exportCSV, getExportStats } from '@/lib/data-export'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface DataExportProps {
  onSuccess?: () => void
}

export default function DataExport({ onSuccess }: DataExportProps) {
  const { user } = useAuth()
  const { loading: profileLoading } = useProfileManager()
  const [loading, setLoading] = useState(false)
  const [exportType, setExportType] = useState<string | null>(null)
  const [stats, setStats] = useState<{
    totalRecords: number
    breakdown: {
      children: number
      recipients: number
      groups: number
      updates: number
      responses: number
    }
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load export statistics
  const loadStats = useCallback(async () => {
    if (!user) return

    try {
      const exportStats = await getExportStats(user.id)
      setStats(exportStats)
    } catch (err) {
      logger.error('Failed to load export stats:', { error: err })
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadStats()
    }
  }, [user, loadStats])

  const handleExport = async (type: 'json' | 'recipients' | 'children' | 'updates') => {
    if (!user) return

    try {
      setLoading(true)
      setExportType(type)
      setError(null)

      if (type === 'json') {
        await exportUserData(user.id)
      } else {
        await exportCSV(user.id, type)
      }

      onSuccess?.()
    } catch (err) {
      logger.error(`Failed to export ${type}:`, { error: err })
      setError(err instanceof Error ? err.message : 'Export failed. Please try again.')
    } finally {
      setLoading(false)
      setExportType(null)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Data Export</h3>
        <p className="mt-1 text-sm text-gray-600">
          Download your data in various formats. All exports include only your data.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Export Statistics */}
      {stats && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Your Data Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">{stats.totalRecords}</div>
              <div className="text-sm text-gray-600">Total Records</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-gray-900">{stats.breakdown.children}</div>
              <div className="text-sm text-gray-600">Children</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-gray-900">{stats.breakdown.recipients}</div>
              <div className="text-sm text-gray-600">Recipients</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-gray-900">{stats.breakdown.groups}</div>
              <div className="text-sm text-gray-600">Groups</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-gray-900">{stats.breakdown.updates}</div>
              <div className="text-sm text-gray-600">Updates</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-gray-900">{stats.breakdown.responses}</div>
              <div className="text-sm text-gray-600">Responses</div>
            </div>
          </div>
        </div>
      )}

      {/* Export Options */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">Export Options</h4>

        {/* Complete Data Export */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h5 className="text-sm font-medium text-gray-900">Complete Data Export</h5>
              <p className="text-sm text-gray-600 mt-1">
                Download all your data in JSON format. Includes profile, children, recipients, groups, updates, and responses.
              </p>
            </div>
            <Button
              onClick={() => handleExport('json')}
              disabled={loading || profileLoading}
              variant="outline"
              size="sm"
              className="ml-4 flex-shrink-0"
            >
              {loading && exportType === 'json' ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download JSON
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Recipients CSV */}
        {stats && stats.breakdown.recipients > 0 && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h5 className="text-sm font-medium text-gray-900">Recipients List</h5>
                <p className="text-sm text-gray-600 mt-1">
                  Export your recipients list as a CSV file for import into other systems.
                </p>
              </div>
              <Button
                onClick={() => handleExport('recipients')}
                disabled={loading || profileLoading}
                variant="outline"
                size="sm"
                className="ml-4 flex-shrink-0"
              >
                {loading && exportType === 'recipients' ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download CSV
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Children CSV */}
        {stats && stats.breakdown.children > 0 && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h5 className="text-sm font-medium text-gray-900">Children Information</h5>
                <p className="text-sm text-gray-600 mt-1">
                  Export your children&apos;s information as a CSV file.
                </p>
              </div>
              <Button
                onClick={() => handleExport('children')}
                disabled={loading || profileLoading}
                variant="outline"
                size="sm"
                className="ml-4 flex-shrink-0"
              >
                {loading && exportType === 'children' ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download CSV
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Updates CSV */}
        {stats && stats.breakdown.updates > 0 && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h5 className="text-sm font-medium text-gray-900">Updates History</h5>
                <p className="text-sm text-gray-600 mt-1">
                  Export all your updates as a CSV file.
                </p>
              </div>
              <Button
                onClick={() => handleExport('updates')}
                disabled={loading || profileLoading}
                variant="outline"
                size="sm"
                className="ml-4 flex-shrink-0"
              >
                {loading && exportType === 'updates' ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download CSV
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">About Data Export</h4>
            <div className="mt-1 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>All exports are generated in real-time and include your latest data</li>
                <li>JSON exports include all data with full structure and relationships</li>
                <li>CSV exports are optimized for spreadsheet applications</li>
                <li>No personal data from other users is included in your export</li>
                <li>Export files are not stored on our servers</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
