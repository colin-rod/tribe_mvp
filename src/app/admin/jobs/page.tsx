/**
 * Admin Jobs Dashboard - Monitor and manage background job processing
 *
 * Displays:
 * - Real-time job metrics (waiting, active, completed, failed)
 * - Recent job history with filtering
 * - Failed job management (retry/cancel)
 * - Queue health status
 * - Circuit breaker state
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { createLogger } from '@/lib/logger'
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

const logger = createLogger('AdminJobsPage')

interface JobMetrics {
  summary: {
    total_jobs: number
    success_rate_percent: number
    avg_processing_time_ms: number
    overdue_jobs: number
  }
  status_counts: {
    pending: number
    processing: number
    sent: number
    failed: number
  }
  delivery_methods: {
    email: number
    sms: number
    whatsapp: number
    push: number
  }
  queue_health: {
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
    circuit_breaker_state: string
  }
}

interface Job {
  id: string
  status: 'pending' | 'processing' | 'sent' | 'failed'
  delivery_method: string
  notification_type: string
  recipient_id: string
  scheduled_for: string
  processed_at?: string
  retry_count: number
  failure_reason?: string
  message_id?: string
  created_at: string
}

export default function AdminJobsPage() {
  const [metrics, setMetrics] = useState<JobMetrics | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'failed' | 'pending' | 'sent'>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)

  const loadMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/jobs/metrics?hours=24')
      if (!response.ok) throw new Error('Failed to fetch metrics')
      const data = await response.json()
      setMetrics(data)
    } catch (error) {
      logger.error('Error loading metrics', { error })
    }
  }, [])

  const loadJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: '50',
        sort: 'created_at',
        order: 'desc'
      })

      if (filter !== 'all') {
        params.append('status', filter)
      }

      const response = await fetch(`/api/jobs?${params}`)
      if (!response.ok) throw new Error('Failed to fetch jobs')
      const data = await response.json()
      setJobs(data.jobs || [])
    } catch (error) {
      logger.error('Error loading jobs', { error })
    }
  }, [filter])

  const loadData = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadMetrics(), loadJobs()])
    setLoading(false)
  }, [loadMetrics, loadJobs])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadData()
    }, 10000)

    return () => clearInterval(interval)
  }, [autoRefresh, loadData])

  const retryJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/retry`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Failed to retry job')

      await loadData()
    } catch (error) {
      logger.error('Error retrying job', { error, jobId })
      alert('Failed to retry job')
    }
  }

  const cancelJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to cancel this job?')) return

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to cancel job')

      await loadData()
    } catch (error) {
      logger.error('Error canceling job', { error, jobId })
      alert('Failed to cancel job')
    }
  }

  const getStatusIcon = (status: Job['status']) => {
    switch (status) {
      case 'sent':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-600" />
      case 'processing':
        return <ArrowPathIcon className="h-5 w-5 text-blue-600 animate-spin" />
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCircuitBreakerColor = (state: string) => {
    switch (state) {
      case 'closed':
        return 'text-green-600'
      case 'half-open':
        return 'text-yellow-600'
      case 'open':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Background Jobs</h1>
          <p className="text-sm text-gray-600 mt-1">Monitor and manage notification job processing</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            Auto-refresh
          </label>
          <Button onClick={loadData} variant="outline" size="sm">
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {metrics.summary.total_jobs}
                </div>
                <div className="text-sm text-gray-600">Total Jobs (24h)</div>
              </div>
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {metrics.summary.success_rate_percent}%
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {metrics.summary.avg_processing_time_ms}ms
                </div>
                <div className="text-sm text-gray-600">Avg Processing Time</div>
              </div>
              <ClockIcon className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {metrics.summary.overdue_jobs}
                </div>
                <div className="text-sm text-gray-600">Overdue Jobs</div>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>
      )}

      {/* Queue Health */}
      {metrics && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Queue Health</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {metrics.queue_health.waiting}
              </div>
              <div className="text-xs text-gray-600">Waiting</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {metrics.queue_health.active}
              </div>
              <div className="text-xs text-gray-600">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {metrics.queue_health.completed}
              </div>
              <div className="text-xs text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {metrics.queue_health.failed}
              </div>
              <div className="text-xs text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {metrics.queue_health.delayed}
              </div>
              <div className="text-xs text-gray-600">Delayed</div>
            </div>
            <div className="text-center">
              <div className={`text-xl font-bold capitalize ${getCircuitBreakerColor(metrics.queue_health.circuit_breaker_state)}`}>
                {metrics.queue_health.circuit_breaker_state}
              </div>
              <div className="text-xs text-gray-600">Circuit Breaker</div>
            </div>
          </div>

          {metrics.queue_health.circuit_breaker_state === 'open' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-900">
                    Circuit Breaker Open - Email Service Unavailable
                  </h3>
                  <p className="text-sm text-red-700 mt-1">
                    The circuit breaker is open due to repeated SendGrid failures.
                    Jobs will be automatically retried when the service recovers.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Breakdown */}
      {metrics && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Status</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-gray-600">
                {metrics.status_counts.pending}
              </div>
              <div className="text-sm text-gray-600 mt-1">Pending</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">
                {metrics.status_counts.processing}
              </div>
              <div className="text-sm text-blue-600 mt-1">Processing</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {metrics.status_counts.sent}
              </div>
              <div className="text-sm text-green-600 mt-1">Sent</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-3xl font-bold text-red-600">
                {metrics.status_counts.failed}
              </div>
              <div className="text-sm text-red-600 mt-1">Failed</div>
            </div>
          </div>
        </div>
      )}

      {/* Job List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Jobs</h2>

          <div className="flex gap-2">
            {(['all', 'pending', 'failed', 'sent'] as const).map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  filter === filterOption
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Processed</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retries</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(job.status)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {job.notification_type}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {job.delivery_method}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {new Date(job.scheduled_for).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {job.processed_at ? new Date(job.processed_at).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {job.retry_count}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      {job.status === 'failed' && (
                        <button
                          onClick={() => retryJob(job.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Retry
                        </button>
                      )}
                      {job.status === 'pending' && (
                        <button
                          onClick={() => cancelJob(job.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {jobs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No jobs found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
