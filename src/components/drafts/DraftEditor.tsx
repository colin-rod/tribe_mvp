'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import MediaUpload from '@/components/updates/MediaUpload'
import { ChildProfileSelector } from '@/components/children/ChildProfileSelector'
import VoiceNoteRecorder from '@/components/drafts/VoiceNoteRecorder'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  PhotoIcon,
  PencilSquareIcon,
  MicrophoneIcon,
  TagIcon,
  CheckCircleIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { milestoneTypes, getMilestoneLabel } from '@/lib/validation/update'
import type { DraftUpdate } from '@/lib/types/digest'
import type { MilestoneType } from '@/lib/validation/update'
import { createLogger } from '@/lib/logger'

const logger = createLogger('DraftEditor')

type Tab = 'media' | 'content' | 'voice' | 'details'

interface DraftEditorProps {
  draft: DraftUpdate
  onSave: (updates: Partial<DraftUpdate>) => Promise<boolean>
  onAddMedia: (mediaUrls: string[]) => Promise<boolean>
  onMarkReady: () => Promise<void>
  onDelete: () => Promise<void>
  loading?: boolean
}

export default function DraftEditor({
  draft,
  onSave,
  onAddMedia,
  onMarkReady,
  onDelete,
  loading = false
}: DraftEditorProps) {
  const [activeTab, setActiveTab] = useState<Tab>('content')
  const [localContent, setLocalContent] = useState(draft.content)
  const [localSubject, setLocalSubject] = useState(draft.subject || '')
  const [localChildId, setLocalChildId] = useState(draft.child_id)
  const [localMilestone, setLocalMilestone] = useState<MilestoneType | undefined>(
    draft.milestone_type as MilestoneType
  )
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<string[]>(draft.media_urls || [])
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const isReady = draft.distribution_status === 'ready'

  // Auto-save effect
  useEffect(() => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Don't auto-save on initial mount
    if (localContent === draft.content && localSubject === draft.subject) {
      return
    }

    // Set new timeout for auto-save (2 seconds after last change)
    saveTimeoutRef.current = setTimeout(() => {
      handleAutoSave()
    }, 2000)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localContent, localSubject])

  const handleAutoSave = async () => {
    if (isSaving) return

    setSaveStatus('saving')
    setIsSaving(true)

    try {
      const updates: Partial<DraftUpdate> = {}

      if (localContent !== draft.content) {
        updates.content = localContent
      }

      if (localSubject !== draft.subject) {
        updates.subject = localSubject
      }

      if (Object.keys(updates).length > 0) {
        const success = await onSave(updates)
        setSaveStatus(success ? 'saved' : 'error')

        if (success) {
          logger.info('Auto-saved draft', { draftId: draft.id })
          setTimeout(() => setSaveStatus('idle'), 2000)
        }
      }
    } catch (error) {
      logger.error('Auto-save failed', { error, draftId: draft.id })
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleManualSave = async () => {
    if (isSaving) return

    setSaveStatus('saving')
    setIsSaving(true)

    try {
      const updates: Partial<DraftUpdate> = {
        content: localContent,
        subject: localSubject,
        child_id: localChildId,
        milestone_type: localMilestone
      }

      const success = await onSave(updates)
      setSaveStatus(success ? 'saved' : 'error')

      if (success) {
        logger.info('Manually saved draft', { draftId: draft.id })
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    } catch (error) {
      logger.error('Manual save failed', { error, draftId: draft.id })
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleMediaFilesChange = useCallback((files: File[]) => {
    setMediaFiles(files)

    // Create preview URLs
    const newUrls = files.map(file => URL.createObjectURL(file))
    setMediaPreviewUrls([...draft.media_urls, ...newUrls])
  }, [draft.media_urls])

  const handleMediaFileRemove = useCallback((index: number) => {
    const totalExisting = draft.media_urls.length

    if (index < totalExisting) {
      // Removing existing media - need to update on server
      const newMediaUrls = draft.media_urls.filter((_, i) => i !== index)
      onSave({ media_urls: newMediaUrls })
      setMediaPreviewUrls(newMediaUrls)
    } else {
      // Removing newly added file
      const newFileIndex = index - totalExisting
      const newFiles = mediaFiles.filter((_, i) => i !== newFileIndex)
      setMediaFiles(newFiles)

      const newUrls = [...draft.media_urls, ...newFiles.map(file => URL.createObjectURL(file))]
      setMediaPreviewUrls(newUrls)
    }
  }, [draft.media_urls, mediaFiles, onSave])

  const handleUploadMedia = async () => {
    if (mediaFiles.length === 0) return

    setIsSaving(true)
    try {
      // In a real implementation, you would upload files to storage here
      // For now, we'll just use the preview URLs
      const newUrls = mediaFiles.map(file => URL.createObjectURL(file))
      const success = await onAddMedia(newUrls)

      if (success) {
        setMediaFiles([])
        logger.info('Uploaded media to draft', { draftId: draft.id, count: mediaFiles.length })
      }
    } catch (error) {
      logger.error('Failed to upload media', { error, draftId: draft.id })
    } finally {
      setIsSaving(false)
    }
  }

  const handleVoiceNote = (transcript: string, _audioUrl: string) => {
    // Add voice note transcript to content
    const newContent = localContent
      ? `${localContent}\n\n${transcript}`
      : transcript

    setLocalContent(newContent)

    // Switch to content tab to show the result
    setActiveTab('content')
  }

  const tabs = [
    { id: 'content' as Tab, label: 'Content', icon: PencilSquareIcon },
    { id: 'media' as Tab, label: 'Media', icon: PhotoIcon, badge: mediaPreviewUrls.length },
    { id: 'voice' as Tab, label: 'Voice', icon: MicrophoneIcon },
    { id: 'details' as Tab, label: 'Details', icon: TagIcon }
  ]

  const canMarkReady = localContent.trim().length > 0 && localChildId

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isReady ? 'bg-green-500' : 'bg-orange-500'
              }`} />
              <span className={`text-sm font-medium ${
                isReady ? 'text-green-700' : 'text-orange-700'
              }`}>
                {isReady ? 'Ready to Compile' : 'Draft'}
              </span>
            </div>

            {saveStatus !== 'idle' && (
              <div className="flex items-center space-x-2">
                {saveStatus === 'saving' && (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="text-sm text-neutral-600">Saving...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-600">Saved</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <span className="text-sm text-red-600">Failed to save</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={handleManualSave}
              variant="outline"
              size="sm"
              disabled={isSaving || loading}
            >
              Save Draft
            </Button>

            {!isReady && (
              <Button
                onClick={onMarkReady}
                variant="success"
                size="sm"
                disabled={!canMarkReady || loading}
                title={!canMarkReady ? 'Add content and select child first' : ''}
              >
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                Mark Ready
              </Button>
            )}

            <Button
              onClick={onDelete}
              variant="destructive"
              size="sm"
              disabled={loading}
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabbed Editor */}
      <Card className="overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-neutral-200 bg-neutral-50">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                    transition-colors
                    ${isActive
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-orange-500 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <CardContent className="p-6">
          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-neutral-700 mb-2">
                  Subject Line (Optional)
                </label>
                <input
                  id="subject"
                  type="text"
                  value={localSubject}
                  onChange={(e) => setLocalSubject(e.target.value)}
                  placeholder="Add a catchy subject line..."
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-medium text-neutral-700 mb-2">
                  Content
                </label>
                <Textarea
                  id="content"
                  value={localContent}
                  onChange={(e) => setLocalContent(e.target.value)}
                  placeholder="Share what's happening..."
                  rows={12}
                  className="w-full"
                  disabled={loading}
                />
                <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
                  <span>Auto-saves as you type</span>
                  <span>{localContent.length} characters</span>
                </div>
              </div>
            </div>
          )}

          {/* Media Tab */}
          {activeTab === 'media' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-neutral-600 mb-4">
                  Upload photos and videos to include with this update. Drag to reorder.
                </p>
                <MediaUpload
                  files={mediaFiles}
                  previewUrls={mediaPreviewUrls}
                  onFilesChange={handleMediaFilesChange}
                  onFileRemove={handleMediaFileRemove}
                  disabled={loading}
                />
                {mediaFiles.length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={handleUploadMedia}
                      loading={isSaving}
                      disabled={loading}
                    >
                      Upload {mediaFiles.length} file{mediaFiles.length > 1 ? 's' : ''}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Voice Tab */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-neutral-600 mb-4">
                  Record a voice note and we&apos;ll transcribe it for you.
                </p>
                <VoiceNoteRecorder
                  onRecordingComplete={handleVoiceNote}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-3">
                  Child <span className="text-red-500">*</span>
                </label>
                <ChildProfileSelector
                  selectedChildId={localChildId}
                  onChildSelect={setLocalChildId}
                  placeholder="Select which child this update is about"
                  size="md"
                />
              </div>

              <div>
                <label htmlFor="milestone" className="block text-sm font-medium text-neutral-700 mb-2">
                  Milestone Type (Optional)
                </label>
                <select
                  id="milestone"
                  value={localMilestone || 'none'}
                  onChange={(e) => setLocalMilestone(
                    e.target.value === 'none' ? undefined : e.target.value as MilestoneType
                  )}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  disabled={loading}
                >
                  <option value="none">No specific milestone</option>
                  {milestoneTypes.map((milestone) => (
                    <option key={milestone} value={milestone}>
                      {getMilestoneLabel(milestone)}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-neutral-500">
                  Selecting a milestone helps categorize this update
                </p>
              </div>

              <div className="pt-4 border-t border-neutral-200">
                <Button
                  onClick={handleManualSave}
                  loading={isSaving}
                  disabled={loading}
                  className="w-full"
                >
                  Save Details
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}