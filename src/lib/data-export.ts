import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type Child = Database['public']['Tables']['children']['Row']
type Recipient = Database['public']['Tables']['recipients']['Row']
type RecipientGroup = Database['public']['Tables']['recipient_groups']['Row']
type Update = Database['public']['Tables']['updates']['Row']
type Response = Database['public']['Tables']['responses']['Row']

interface ExportData {
  profile: Profile | null
  children: Child[]
  recipients: Recipient[]
  groups: RecipientGroup[]
  updates: Update[]
  responses: Response[]
  exportedAt: string
}

/**
 * Export all user data as a JSON file
 */
export async function exportUserData(userId: string): Promise<void> {
  const supabase = createClient()

  try {
    // Fetch all user data in parallel
    const [
      profileResult,
      childrenResult,
      recipientsResult,
      groupsResult,
      updatesResult,
      responsesResult
    ] = await Promise.all([
      // Profile
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single(),

      // Children
      supabase
        .from('children')
        .select('*')
        .eq('parent_id', userId)
        .order('created_at', { ascending: false }),

      // Recipients
      supabase
        .from('recipients')
        .select('*')
        .eq('parent_id', userId)
        .order('created_at', { ascending: false }),

      // Groups
      supabase
        .from('recipient_groups')
        .select('*')
        .eq('parent_id', userId)
        .order('created_at', { ascending: false }),

      // Updates
      supabase
        .from('updates')
        .select('*')
        .eq('parent_id', userId)
        .order('created_at', { ascending: false }),

      // Responses (need to join with updates to get user's responses)
      supabase
        .from('responses')
        .select(`
          *,
          updates!inner(parent_id)
        `)
        .eq('updates.parent_id', userId)
        .order('received_at', { ascending: false })
    ])

    // Check for errors
    if (profileResult.error) {
      console.warn('Failed to fetch profile:', profileResult.error)
    }
    if (childrenResult.error) {
      console.warn('Failed to fetch children:', childrenResult.error)
    }
    if (recipientsResult.error) {
      console.warn('Failed to fetch recipients:', recipientsResult.error)
    }
    if (groupsResult.error) {
      console.warn('Failed to fetch groups:', groupsResult.error)
    }
    if (updatesResult.error) {
      console.warn('Failed to fetch updates:', updatesResult.error)
    }
    if (responsesResult.error) {
      console.warn('Failed to fetch responses:', responsesResult.error)
    }

    // Prepare export data
    const exportData: ExportData = {
      profile: profileResult.data || null,
      children: childrenResult.data || [],
      recipients: recipientsResult.data || [],
      groups: groupsResult.data || [],
      updates: updatesResult.data || [],
      responses: responsesResult.data || [],
      exportedAt: new Date().toISOString()
    }

    // Create and download the file
    await downloadJSON(exportData, `tribe-data-export-${formatDate(new Date())}.json`)

  } catch (error) {
    console.error('Error exporting user data:', error)
    throw new Error('Failed to export data. Please try again.')
  }
}

/**
 * Export specific data type as CSV
 */
export async function exportCSV(
  userId: string,
  dataType: 'recipients' | 'children' | 'updates'
): Promise<void> {
  const supabase = createClient()

  try {
    let data: any[] = []
    let filename = ''

    switch (dataType) {
      case 'recipients': {
        const { data: recipients, error } = await supabase
          .from('recipients')
          .select(`
            *,
            recipient_groups(name)
          `)
          .eq('parent_id', userId)
          .order('created_at', { ascending: false })

        if (error) throw error
        data = recipients || []
        filename = `recipients-${formatDate(new Date())}.csv`
        break
      }

      case 'children': {
        const { data: children, error } = await supabase
          .from('children')
          .select('*')
          .eq('parent_id', userId)
          .order('created_at', { ascending: false })

        if (error) throw error
        data = children || []
        filename = `children-${formatDate(new Date())}.csv`
        break
      }

      case 'updates': {
        const { data: updates, error } = await supabase
          .from('updates')
          .select(`
            *,
            children(name)
          `)
          .eq('parent_id', userId)
          .order('created_at', { ascending: false })

        if (error) throw error
        data = updates || []
        filename = `updates-${formatDate(new Date())}.csv`
        break
      }
    }

    if (data.length === 0) {
      throw new Error(`No ${dataType} found to export`)
    }

    const csv = convertToCSV(data)
    await downloadCSV(csv, filename)

  } catch (error) {
    console.error(`Error exporting ${dataType}:`, error)
    throw new Error(`Failed to export ${dataType}. Please try again.`)
  }
}

/**
 * Convert array of objects to CSV string
 */
function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''

  // Get all unique keys from all objects
  const keys = Array.from(
    new Set(data.flatMap(obj => Object.keys(obj)))
  )

  // Create CSV header
  const csvHeader = keys.map(key => `"${key}"`).join(',')

  // Create CSV rows
  const csvRows = data.map(obj => {
    return keys.map(key => {
      const value = obj[key]

      // Handle different data types
      if (value === null || value === undefined) {
        return '""'
      } else if (Array.isArray(value)) {
        return `"${value.join('; ')}"`
      } else if (typeof value === 'object') {
        return `"${JSON.stringify(value)}"`
      } else {
        return `"${String(value).replace(/"/g, '""')}"`
      }
    }).join(',')
  })

  return [csvHeader, ...csvRows].join('\n')
}

/**
 * Download JSON data as a file
 */
async function downloadJSON(data: any, filename: string): Promise<void> {
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  await downloadBlob(blob, filename)
}

/**
 * Download CSV data as a file
 */
async function downloadCSV(csv: string, filename: string): Promise<void> {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  await downloadBlob(blob, filename)
}

/**
 * Download a blob as a file
 */
async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  // Create download link
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename

  // Trigger download
  document.body.appendChild(link)
  link.click()

  // Cleanup
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * Format date for filenames (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Get data export statistics
 */
export async function getExportStats(userId: string): Promise<{
  totalRecords: number
  breakdown: {
    children: number
    recipients: number
    groups: number
    updates: number
    responses: number
  }
}> {
  const supabase = createClient()

  try {
    const [
      childrenResult,
      recipientsResult,
      groupsResult,
      updatesResult,
      responsesResult
    ] = await Promise.all([
      supabase
        .from('children')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', userId),

      supabase
        .from('recipients')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', userId),

      supabase
        .from('recipient_groups')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', userId),

      supabase
        .from('updates')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', userId),

      supabase
        .from('responses')
        .select(`
          id,
          updates!inner(parent_id)
        `, { count: 'exact', head: true })
        .eq('updates.parent_id', userId)
    ])

    const breakdown = {
      children: childrenResult.count || 0,
      recipients: recipientsResult.count || 0,
      groups: groupsResult.count || 0,
      updates: updatesResult.count || 0,
      responses: responsesResult.count || 0
    }

    const totalRecords = Object.values(breakdown).reduce((sum, count) => sum + count, 0)

    return {
      totalRecords,
      breakdown
    }
  } catch (error) {
    console.error('Error getting export stats:', error)
    throw new Error('Failed to get export statistics')
  }
}