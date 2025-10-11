/**
 * Template Management Admin Interface
 * Comprehensive template management system for curating and maintaining AI prompt templates
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { cn } from '@/lib/utils'
import { testTemplateSubstitution } from '@/lib/prompt-context'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UserGroupIcon,
  SparklesIcon,
  EyeIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface PromptTemplate {
  id: string
  prompt_type: 'milestone' | 'activity' | 'fun' | 'seasonal'
  template_text: string
  age_range_min: number | null
  age_range_max: number | null
  category: string | null
  tags: string[]
  variables: string[]
  usage_count: number
  effectiveness_score: number
  is_community_contributed: boolean
  community_prompt_id?: string
  created_by?: string
  created_at: string
  updated_at: string
}

interface TemplateFormData {
  prompt_type: 'milestone' | 'activity' | 'fun' | 'seasonal'
  template_text: string
  age_range_min: number | null
  age_range_max: number | null
  category: string
  tags: string[]
}

interface TemplateStats {
  total_templates: number
  community_templates: number
  most_effective_type: string
  average_effectiveness: number
  total_usage: number
}

type FilterType = TemplateFormData['prompt_type'] | 'all' | 'community'
type SortOption = 'created_at' | 'effectiveness_score' | 'usage_count'
type TemplateSummaryRow = Pick<PromptTemplate, 'prompt_type' | 'effectiveness_score' | 'usage_count' | 'is_community_contributed'>

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TemplateManager() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [stats, setStats] = useState<TemplateStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortOption>('effectiveness_score')

  const supabase = useMemo(() => createClient(), [])

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('prompt_type, effectiveness_score, usage_count, is_community_contributed')

      if (error) {
        throw error
      }

      const summary = (data ?? []) as TemplateSummaryRow[]

      if (summary.length === 0) {
        setStats({
          total_templates: 0,
          community_templates: 0,
          most_effective_type: '',
          average_effectiveness: 0,
          total_usage: 0
        })
        return
      }

      const totalEffectiveness = summary.reduce((acc, template) => acc + (template.effectiveness_score || 0), 0)
      const totalUsage = summary.reduce((acc, template) => acc + (template.usage_count || 0), 0)

      setStats({
        total_templates: summary.length,
        community_templates: summary.filter(template => template.is_community_contributed).length,
        most_effective_type: getMostEffectiveType(summary),
        average_effectiveness: totalEffectiveness / summary.length,
        total_usage: totalUsage
      })
    } catch {
      // Stats are optional; ignore errors so user can still manage templates
    }
  }, [supabase])

  const fetchTemplates = useCallback(async (searchValue: string) => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('prompt_templates')
        .select('*')
        .order(sortBy, { ascending: false })

      if (filterType !== 'all') {
        if (filterType === 'community') {
          query = query.eq('is_community_contributed', true)
        } else {
          query = query.eq('prompt_type', filterType)
        }
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      const fetchedTemplates = (data ?? []) as PromptTemplate[]
      const normalizedSearch = searchValue.trim().toLowerCase()

      const filteredData = normalizedSearch
        ? fetchedTemplates.filter((template) =>
            template.template_text.toLowerCase().includes(normalizedSearch) ||
            template.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch))
          )
        : fetchedTemplates

      setTemplates(filteredData)

      // Fetch stats
      await fetchStats()

    } catch (fetchError) {
      // console.error('Error fetching templates:', error)
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch templates')
    } finally {
      setLoading(false)
    }
  }, [filterType, fetchStats, sortBy, supabase])

  // =============================================================================
  // TEMPLATE OPERATIONS
  // =============================================================================

  const createTemplate = async (formData: TemplateFormData) => {
    setSaving(true)
    try {
      const variables = extractVariablesFromTemplate(formData.template_text)

      const { error } = await supabase
        .from('prompt_templates')
        .insert([{
          ...formData,
          variables,
          age_range_min: formData.age_range_min || null,
          age_range_max: formData.age_range_max || null,
          effectiveness_score: 7.0 // Default score for new templates
        }])

      if (error) {
        throw error
      }

      setShowForm(false)
      await fetchTemplates(debouncedSearchTerm)
    } catch (error) {
      // console.error('Error creating template:', error)
      setError(error instanceof Error ? error.message : 'Failed to create template')
    } finally {
      setSaving(false)
    }
  }

  const updateTemplate = async (id: string, formData: TemplateFormData) => {
    setSaving(true)
    try {
      const variables = extractVariablesFromTemplate(formData.template_text)

      const { error } = await supabase
        .from('prompt_templates')
        .update({
          ...formData,
          variables,
          age_range_min: formData.age_range_min || null,
          age_range_max: formData.age_range_max || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        throw error
      }

      setSelectedTemplate(null)
      setShowForm(false)
      await fetchTemplates(debouncedSearchTerm)
    } catch (error) {
      // console.error('Error updating template:', error)
      setError(error instanceof Error ? error.message : 'Failed to update template')
    } finally {
      setSaving(false)
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('prompt_templates')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      await fetchTemplates(debouncedSearchTerm)
    } catch (error) {
      // console.error('Error deleting template:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete template')
    } finally {
      setSaving(false)
    }
  }

  const recalculateEffectiveness = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.rpc('recalculate_template_effectiveness')

      if (error) {
        throw error
      }

      await fetchTemplates(debouncedSearchTerm)
    } catch (error) {
      // console.error('Error recalculating effectiveness:', error)
      setError(error instanceof Error ? error.message : 'Failed to recalculate effectiveness')
    } finally {
      setSaving(false)
    }
  }

  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================

  const extractVariablesFromTemplate = (templateText: string): string[] => {
    const matches = templateText.match(/\[([^\]]+)\]/g)
    return matches ? matches.map(match => match.slice(1, -1)) : []
  }

  function getMostEffectiveType(templates: TemplateSummaryRow[]): string {
    const typeScores = templates.reduce((acc, template) => {
      const type = template.prompt_type
      if (!acc[type]) {
        acc[type] = { total: 0, count: 0 }
      }
      acc[type].total += template.effectiveness_score || 0
      acc[type].count += 1
      return acc
    }, {} as Record<string, { total: number; count: number }>)

    let bestType = ''
    let bestAvg = 0

    Object.entries(typeScores).forEach(([type, { total, count }]) => {
      const avg = total / count
      if (avg > bestAvg) {
        bestAvg = avg
        bestType = type
      }
    })

    return bestType
  }

  // =============================================================================
  // EFFECTS
  // =============================================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    fetchTemplates(debouncedSearchTerm)
  }, [debouncedSearchTerm, fetchTemplates])

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const renderStats = () => {
    if (!stats) return null

    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total_templates}</div>
          <div className="text-sm text-gray-600">Total Templates</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.community_templates}</div>
          <div className="text-sm text-gray-600">Community</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.average_effectiveness.toFixed(1)}</div>
          <div className="text-sm text-gray-600">Avg Rating</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.total_usage}</div>
          <div className="text-sm text-gray-600">Total Usage</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-lg font-bold text-orange-600 capitalize">{stats.most_effective_type}</div>
          <div className="text-sm text-gray-600">Top Type</div>
        </div>
      </div>
    )
  }

  const renderFilters = () => (
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
      <div className="flex flex-col sm:flex-row gap-2 flex-1">
        <input
          type="text"
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as FilterType)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Types</option>
          <option value="milestone">Milestone</option>
          <option value="activity">Activity</option>
          <option value="fun">Fun</option>
          <option value="seasonal">Seasonal</option>
          <option value="community">Community</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="effectiveness_score">By Effectiveness</option>
          <option value="usage_count">By Usage</option>
          <option value="created_at">By Date</option>
        </select>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={recalculateEffectiveness}
          disabled={saving}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <ChartBarIcon className="h-4 w-4" />
          Recalculate
        </Button>

        <Button
          onClick={() => setShowForm(true)}
          size="sm"
          className="flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          Add Template
        </Button>
      </div>
    </div>
  )

  const renderTemplateCard = (template: PromptTemplate) => {
    const config = {
      milestone: { color: 'border-purple-200 bg-purple-50', badge: 'bg-purple-100 text-purple-700' },
      activity: { color: 'border-blue-200 bg-blue-50', badge: 'bg-blue-100 text-blue-700' },
      fun: { color: 'border-yellow-200 bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700' },
      seasonal: { color: 'border-green-200 bg-green-50', badge: 'bg-green-100 text-green-700' }
    }[template.prompt_type]

    return (
      <div
        key={template.id}
        className={cn('border rounded-lg p-4 hover:shadow-sm transition-shadow', config.color)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-1">
            <span className={cn('text-xs font-medium px-2 py-1 rounded-full', config.badge)}>
              {template.prompt_type}
            </span>

            {template.is_community_contributed && (
              <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                <UserGroupIcon className="h-3 w-3" />
                Community
              </span>
            )}

            {template.effectiveness_score > 8 && (
              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                <SparklesIcon className="h-3 w-3" />
                Top Rated
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTemplate(template)}
            >
              <EyeIcon className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedTemplate(template)
                setShowForm(true)
              }}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteTemplate(template.id)}
              disabled={saving}
              className="text-red-600 hover:text-red-700"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-sm text-gray-800 leading-relaxed">
            {template.template_text}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>Rating: {template.effectiveness_score.toFixed(1)}</span>
            <span>Used: {template.usage_count} times</span>
            {template.age_range_min !== null && template.age_range_max !== null && (
              <span>Age: {template.age_range_min}-{template.age_range_max}mo</span>
            )}
          </div>
          <div>
            {template.variables.length} variables
          </div>
        </div>
      </div>
    )
  }

  const renderTemplatePreview = () => {
    if (!selectedTemplate) return null

    const testResult = testTemplateSubstitution(selectedTemplate.template_text)

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Template Preview</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTemplate(null)}
              >
                <XMarkIcon className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Template Details</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div><strong>Type:</strong> {selectedTemplate.prompt_type}</div>
                  <div><strong>Effectiveness:</strong> {selectedTemplate.effectiveness_score.toFixed(1)}</div>
                  <div><strong>Usage Count:</strong> {selectedTemplate.usage_count}</div>
                  <div><strong>Variables:</strong> {selectedTemplate.variables.join(', ')}</div>
                  {selectedTemplate.age_range_min && selectedTemplate.age_range_max && (
                    <div><strong>Age Range:</strong> {selectedTemplate.age_range_min}-{selectedTemplate.age_range_max} months</div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Original Template</h4>
                <div className="bg-blue-50 rounded-lg p-4 text-sm">
                  {selectedTemplate.template_text}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Preview with Sample Data</h4>
                <div className="bg-green-50 rounded-lg p-4 text-sm">
                  {testResult.substitutedText}
                </div>
              </div>

              {testResult.missingVariables.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    Missing Variables
                  </h4>
                  <div className="bg-red-50 rounded-lg p-4 text-sm text-red-700">
                    {testResult.missingVariables.join(', ')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert
        variant="error"
        className="m-4"
        title="Failed to load templates"
      >
        {error}
      </Alert>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Template Management</h1>
        <p className="text-gray-600">
          Manage AI prompt templates for cost-effective, personalized user engagement
        </p>
      </div>

      {renderStats()}
      {renderFilters()}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(renderTemplateCard)}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12">
          <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || filterType !== 'all'
              ? 'Try adjusting your filters or search term.'
              : 'Get started by creating your first template.'
            }
          </p>
          <Button onClick={() => setShowForm(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      )}

      {renderTemplatePreview()}

      {/* Template Form Modal */}
      {showForm && (
        <TemplateForm
          template={selectedTemplate}
          onSave={selectedTemplate
            ? (formData: TemplateFormData) => updateTemplate(selectedTemplate.id, formData)
            : createTemplate
          }
          onCancel={() => {
            setShowForm(false)
            setSelectedTemplate(null)
          }}
          saving={saving}
        />
      )}

      {saving && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 flex items-center">
          <LoadingSpinner size="sm" className="mr-2" />
          <span className="text-sm text-gray-600">Saving...</span>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// TEMPLATE FORM COMPONENT
// =============================================================================

interface TemplateFormProps {
  template?: PromptTemplate | null
  onSave: (formData: TemplateFormData) => Promise<void>
  onCancel: () => void
  saving: boolean
}

function TemplateForm({ template, onSave, onCancel, saving }: TemplateFormProps) {
  const [formData, setFormData] = useState<TemplateFormData>({
    prompt_type: template?.prompt_type || 'milestone',
    template_text: template?.template_text || '',
    age_range_min: template?.age_range_min || null,
    age_range_max: template?.age_range_max || null,
    category: template?.category || '',
    tags: template?.tags || []
  })

  const [tagInput, setTagInput] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(formData)
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {template ? 'Edit Template' : 'Create Template'}
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
            >
              <XMarkIcon className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt Type
              </label>
              <select
                value={formData.prompt_type}
                onChange={(e) => setFormData(prev => ({ ...prev, prompt_type: e.target.value as TemplateFormData['prompt_type'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="milestone">Milestone</option>
                <option value="activity">Activity</option>
                <option value="fun">Fun</option>
                <option value="seasonal">Seasonal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Text
              </label>
              <textarea
                value={formData.template_text}
                onChange={(e) => setFormData(prev => ({ ...prev, template_text: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Use [variable_name] for dynamic substitution..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Use square brackets like [child_name] for variable substitution
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Age (months)
                </label>
                <input
                  type="number"
                  value={formData.age_range_min || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    age_range_min: e.target.value ? parseInt(e.target.value) : null
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="60"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Age (months)
                </label>
                <input
                  type="number"
                  value={formData.age_range_max || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    age_range_max: e.target.value ? parseInt(e.target.value) : null
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="60"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., newborn, infant, toddler, all_ages"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add a tag..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={addTag}
                  disabled={!tagInput.trim()}
                  size="sm"
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-blue-900"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !formData.template_text.trim()}
              className="flex items-center gap-2"
            >
              {saving ? (
                <LoadingSpinner size="sm" />
              ) : (
                <CheckIcon className="h-4 w-4" />
              )}
              {template ? 'Update' : 'Create'} Template
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TemplateManager
