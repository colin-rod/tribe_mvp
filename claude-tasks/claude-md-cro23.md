# CRO-23: Update Creation & AI Integration

## Issue URL
https://linear.app/crod/issue/CRO-23/phase-24-update-creation-and-ai-integration

## Agents Required
- `react-developer` (Primary)
- `api-developer` (Supporting)
- `ui-ux-designer` (Supporting)

## Dependencies
- **CRO-18**: Supabase Project Setup & Database Schema (COMPLETE)
- **CRO-20**: Next.js Project Setup & Authentication (COMPLETE)
- **CRO-21**: Child Management System (COMPLETE)
- **CRO-22**: Recipient & Group Management (COMPLETE)
- **CRO-19**: AI Analysis Edge Function (COMPLETE)

## Objective
Build the core update creation system with photo upload, AI analysis integration, and recipient suggestion review. This is the heart of the Tribe MVP - where parents create and distribute updates.

## Context
Parents create updates about their children, including photos, text content, and milestone markers. The system uses AI to analyze content and suggest recipients, but parents maintain full control over who receives each update.

## Database Schema Reference
From CRO-18, the `updates` table:
```sql
CREATE TABLE updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  content TEXT,
  media_urls VARCHAR[],
  milestone_type VARCHAR,
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  suggested_recipients UUID[],
  confirmed_recipients UUID[],
  distribution_status VARCHAR DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP
);
```

## Tasks

### 1. Media Upload System
- [ ] Create photo upload component with compression
- [ ] Implement drag-and-drop functionality
- [ ] Add image preview and editing capabilities
- [ ] Integrate with Supabase Storage
- [ ] Handle multiple photo uploads
- [ ] Add loading states and progress indicators

### 2. Update Creation Form
- [ ] `UpdateForm.tsx` - Main update creation interface
- [ ] Child selection dropdown
- [ ] Milestone type selector
- [ ] Rich text content input
- [ ] Photo upload integration
- [ ] Form validation and error handling

### 3. AI Analysis Integration
- [ ] Connect to CRO-19 AI Analysis Edge Function
- [ ] Display AI analysis results
- [ ] Show suggested recipients with reasoning
- [ ] Allow manual override of AI suggestions
- [ ] Handle AI analysis errors gracefully

### 4. Recipient Review Interface
- [ ] `AIReview.tsx` - Review AI suggestions
- [ ] Recipient selection with group organization
- [ ] Preview of what each recipient will receive
- [ ] Channel-specific delivery options
- [ ] Distribution confirmation workflow

### 5. Update Preview System
- [ ] `UpdatePreview.tsx` - Show final update appearance
- [ ] Email preview mockup
- [ ] Mobile-responsive preview
- [ ] Recipient list confirmation
- [ ] Send/schedule options

## Component Specifications

### UpdateForm.tsx - Main Creation Interface
```typescript
interface UpdateFormProps {
  onUpdateCreated: (update: Update) => void
  onCancel: () => void
}

interface UpdateFormData {
  child_id: string
  content: string
  milestone_type?: string
  photos: File[]
}

// Features:
// - Child selection (required)
// - Text content input with character counter
// - Milestone type dropdown (optional)
// - Multi-photo upload with previews
// - Auto-save draft functionality
// - Real-time validation
```

### MediaUpload.tsx - Photo Upload System
```typescript
interface MediaUploadProps {
  photos: File[]
  onPhotosChange: (photos: File[]) => void
  maxPhotos?: number
  maxFileSize?: number
}

// Features:
// - Drag and drop photo upload
// - Click to browse files
// - Image preview with thumbnails
// - Photo reordering (drag to reorder)
// - Photo deletion
// - Image compression before upload
// - Progress indicators during upload
// - Error handling for invalid files
```

### AIReview.tsx - Recipient Suggestion Review
```typescript
interface AIReviewProps {
  analysis: AIAnalysisResult
  suggestedRecipients: string[]
  allRecipients: Recipient[]
  onRecipientsConfirm: (recipientIds: string[]) => void
  onBack: () => void
}

// Features:
// - Display AI analysis (keywords, tone, importance)
// - Show suggested recipients with reasoning
// - Allow manual recipient selection/deselection
// - Group recipients by relationship/group
// - Show delivery preferences per recipient
// - Confidence indicator for AI suggestions
```

### UpdatePreview.tsx - Final Review
```typescript
interface UpdatePreviewProps {
  update: UpdateDraft
  selectedRecipients: Recipient[]
  onConfirm: () => void
  onBack: () => void
}

// Features:
// - Email template preview
// - Mobile preview
// - Recipient list summary
// - Delivery channel breakdown
// - Schedule delivery option
// - Final confirmation before sending
```

## Core Functionality Implementation

### Update Creation Flow
```typescript
// src/lib/updates.ts

export interface UpdateDraft {
  child_id: string
  content: string
  milestone_type?: string
  media_files: File[]
  media_urls?: string[]
  ai_analysis?: AIAnalysisResult
  suggested_recipients?: string[]
  confirmed_recipients?: string[]
}

export interface Update extends UpdateDraft {
  id: string
  parent_id: string
  distribution_status: string
  created_at: string
  sent_at?: string
}

// Create update draft
export async function createUpdateDraft(draftData: Omit<UpdateDraft, 'media_urls'>): Promise<Update> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  // Upload photos first
  const mediaUrls = await uploadUpdatePhotos(draftData.media_files, user.id)
  
  // Create update record
  const { data, error } = await supabase
    .from('updates')
    .insert({
      parent_id: user.id,
      child_id: draftData.child_id,
      content: draftData.content,
      milestone_type: draftData.milestone_type,
      media_urls: mediaUrls,
      distribution_status: 'draft'
    })
    .select()
    .single()
    
  if (error) throw error
  return data
}

// Trigger AI analysis
export async function analyzeUpdate(updateId: string, childAgeMonths: number): Promise<AIAnalysisResponse> {
  const supabase = createClient()
  
  // Get update content
  const { data: update, error: fetchError } = await supabase
    .from('updates')
    .select('*')
    .eq('id', updateId)
    .single()
    
  if (fetchError) throw fetchError
  
  // Call AI analysis Edge Function
  const { data, error } = await supabase.functions.invoke('ai-analyze-update', {
    body: {
      update_id: updateId,
      content: update.content,
      child_age_months: childAgeMonths,
      milestone_type: update.milestone_type,
      parent_id: update.parent_id
    }
  })
  
  if (error) throw error
  return data
}

// Confirm recipients and prepare for distribution
export async function confirmUpdateRecipients(
  updateId: string, 
  recipientIds: string[]
): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('updates')
    .update({
      confirmed_recipients: recipientIds,
      distribution_status: 'confirmed'
    })
    .eq('id', updateId)
    
  if (error) throw error
}
```

### Photo Upload System
```typescript
// src/lib/photo-upload.ts

export async function uploadUpdatePhotos(files: File[], userId: string): Promise<string[]> {
  const supabase = createClient()
  const uploadPromises = files.map((file, index) => uploadSinglePhoto(file, userId, index))
  
  const results = await Promise.all(uploadPromises)
  return results.filter(url => url !== null) as string[]
}

async function uploadSinglePhoto(file: File, userId: string, index: number): Promise<string | null> {
  try {
    // Compress image
    const compressedFile = await compressImage(file, {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.85
    })
    
    // Generate unique filename
    const timestamp = Date.now()
    const fileName = `${timestamp}-${index}.jpg`
    const filePath = `${userId}/updates/${fileName}`
    
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, compressedFile, {
        contentType: 'image/jpeg',
        upsert: false
      })
      
    if (error) throw error
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(filePath)
      
    return publicUrl
  } catch (error) {
    console.error('Failed to upload photo:', error)
    return null
  }
}

// Image compression utility
async function compressImage(file: File, options: {
  maxWidth: number
  maxHeight: number
  quality: number
}): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img
      
      if (width > options.maxWidth) {
        height = (height * options.maxWidth) / width
        width = options.maxWidth
      }
      
      if (height > options.maxHeight) {
        width = (width * options.maxHeight) / height
        height = options.maxHeight
      }
      
      // Set canvas size and draw image
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)
      
      // Convert to blob and create new file
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }))
          }
        },
        'image/jpeg',
        options.quality
      )
    }
    
    img.src = URL.createObjectURL(file)
  })
}
```

### Form Validation
```typescript
// src/lib/validation/update.ts
import { z } from 'zod'

export const updateFormSchema = z.object({
  child_id: z.string()
    .uuid('Please select a child'),
    
  content: z.string()
    .min(1, 'Please add some content to your update')
    .max(2000, 'Update content must be less than 2000 characters'),
    
  milestone_type: z.enum([
    'first_smile',
    'rolling', 
    'sitting',
    'crawling',
    'first_steps',
    'first_words',
    'first_tooth',
    'walking',
    'potty_training',
    'first_day_school',
    'birthday',
    'other'
  ]).optional(),
  
  photos: z.array(z.instanceof(File))
    .max(10, 'Maximum 10 photos per update')
    .refine((files) => {
      return files.every(file => file.size <= 10 * 1024 * 1024) // 10MB per file
    }, 'Each photo must be less than 10MB')
    .refine((files) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
      return files.every(file => allowedTypes.includes(file.type))
    }, 'Only JPEG, PNG, WebP, and HEIC images are allowed')
})

export type UpdateFormData = z.infer<typeof updateFormSchema>
```

## React Hook Implementation

### useUpdateCreation Hook
```typescript
// src/hooks/useUpdateCreation.ts
import { useState } from 'react'
import { UpdateDraft, createUpdateDraft, analyzeUpdate, confirmUpdateRecipients } from '@/lib/updates'
import { calculateAge } from '@/lib/age-utils'

interface UseUpdateCreationReturn {
  // State
  draft: UpdateDraft | null
  step: 'create' | 'ai-review' | 'preview'
  loading: boolean
  error: string | null
  
  // Actions
  createDraft: (data: UpdateFormData) => Promise<void>
  triggerAnalysis: () => Promise<void>
  confirmRecipients: (recipientIds: string[]) => Promise<void>
  goBack: () => void
  reset: () => void
}

export function useUpdateCreation(): UseUpdateCreationReturn {
  const [draft, setDraft] = useState<UpdateDraft | null>(null)
  const [step, setStep] = useState<'create' | 'ai-review' | 'preview'>('create')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createDraft = async (data: UpdateFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      const update = await createUpdateDraft({
        child_id: data.child_id,
        content: data.content,
        milestone_type: data.milestone_type,
        media_files: data.photos
      })
      
      setDraft(update)
      setStep('ai-review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create update')
    } finally {
      setLoading(false)
    }
  }

  const triggerAnalysis = async () => {
    if (!draft) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Get child age for AI context
      const child = await getChildById(draft.child_id)
      const age = calculateAge(child.birth_date)
      
      const analysis = await analyzeUpdate(draft.id, age.totalMonths)
      
      setDraft(prev => prev ? {
        ...prev,
        ai_analysis: analysis.analysis,
        suggested_recipients: analysis.suggested_recipients
      } : null)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze update')
    } finally {
      setLoading(false)
    }
  }

  const confirmRecipients = async (recipientIds: string[]) => {
    if (!draft) return
    
    setLoading(true)
    setError(null)
    
    try {
      await confirmUpdateRecipients(draft.id, recipientIds)
      
      setDraft(prev => prev ? {
        ...prev,
        confirmed_recipients: recipientIds
      } : null)
      
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm recipients')
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => {
    if (step === 'ai-review') setStep('create')
    if (step === 'preview') setStep('ai-review')
  }

  const reset = () => {
    setDraft(null)
    setStep('create')
    setError(null)
  }

  return {
    draft,
    step,
    loading,
    error,
    createDraft,
    triggerAnalysis,
    confirmRecipients,
    goBack,
    reset
  }
}
```

### useChildren Hook for Child Selection
```typescript
// src/hooks/useChildren.ts
import { useState, useEffect } from 'react'
import { getChildren, Child } from '@/lib/children'

export function useChildren() {
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadChildren() {
      try {
        const data = await getChildren()
        setChildren(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load children')
      } finally {
        setLoading(false)
      }
    }

    loadChildren()
  }, [])

  return { children, loading, error, refetch: loadChildren }
}
```

## UI Components Implementation

### Main Update Creation Flow
```typescript
// src/app/dashboard/create-update/page.tsx
'use client'

import { useUpdateCreation } from '@/hooks/useUpdateCreation'
import { UpdateForm } from '@/components/updates/UpdateForm'
import { AIReview } from '@/components/updates/AIReview'
import { UpdatePreview } from '@/components/updates/UpdatePreview'

export default function CreateUpdatePage() {
  const {
    draft,
    step,
    loading,
    error,
    createDraft,
    triggerAnalysis,
    confirmRecipients,
    goBack,
    reset
  } = useUpdateCreation()

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create Update</h1>
        
        {/* Progress indicator */}
        <div className="flex items-center mt-4 space-x-4">
          <StepIndicator active={step === 'create'} completed={step !== 'create'}>
            1. Create
          </StepIndicator>
          <StepIndicator active={step === 'ai-review'} completed={step === 'preview'}>
            2. Review
          </StepIndicator>
          <StepIndicator active={step === 'preview'}>
            3. Send
          </StepIndicator>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {step === 'create' && (
        <UpdateForm
          onSubmit={createDraft}
          loading={loading}
          onCancel={() => router.back()}
        />
      )}

      {step === 'ai-review' && draft && (
        <AIReview
          draft={draft}
          onAnalyze={triggerAnalysis}
          onConfirmRecipients={confirmRecipients}
          onBack={goBack}
          loading={loading}
        />
      )}

      {step === 'preview' && draft && (
        <UpdatePreview
          draft={draft}
          onSend={handleSend}
          onBack={goBack}
          loading={loading}
        />
      )}
    </div>
  )
}
```

### UpdateForm Component
```typescript
// src/components/updates/UpdateForm.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateFormSchema, UpdateFormData } from '@/lib/validation/update'
import { useChildren } from '@/hooks/useChildren'
import { MediaUpload } from './MediaUpload'
import { ChildSelector } from '@/components/children/ChildSelector'
import { MilestoneSelector } from './MilestoneSelector'

interface UpdateFormProps {
  onSubmit: (data: UpdateFormData) => Promise<void>
  loading: boolean
  onCancel: () => void
}

export function UpdateForm({ onSubmit, loading, onCancel }: UpdateFormProps) {
  const { children } = useChildren()
  const [photos, setPhotos] = useState<File[]>([])
  
  const form = useForm<UpdateFormData>({
    resolver: zodResolver(updateFormSchema),
    defaultValues: {
      child_id: '',
      content: '',
      milestone_type: undefined,
      photos: []
    }
  })

  const handleSubmit = async (data: UpdateFormData) => {
    await onSubmit({ ...data, photos })
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Child Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Which child is this update about? *
        </label>
        <ChildSelector
          children={children}
          selectedChildId={form.watch('child_id')}
          onChildSelect={(childId) => form.setValue('child_id', childId)}
          error={form.formState.errors.child_id?.message}
        />
      </div>

      {/* Content Input */}
      <div>
        <label className="block text-sm font-medium mb-2">
          What's happening? *
        </label>
        <textarea
          {...form.register('content')}
          placeholder="Share what's new with your little one..."
          className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          maxLength={2000}
        />
        <div className="flex justify-between items-center mt-1">
          {form.formState.errors.content && (
            <p className="text-red-600 text-sm">{form.formState.errors.content.message}</p>
          )}
          <p className="text-gray-500 text-sm">
            {form.watch('content')?.length || 0}/2000 characters
          </p>
        </div>
      </div>

      {/* Milestone Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Is this a special milestone?
        </label>
        <MilestoneSelector
          selectedMilestone={form.watch('milestone_type')}
          onMilestoneSelect={(milestone) => form.setValue('milestone_type', milestone)}
          childId={form.watch('child_id')}
        />
      </div>

      {/* Photo Upload */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Add photos
        </label>
        <MediaUpload
          photos={photos}
          onPhotosChange={(newPhotos) => {
            setPhotos(newPhotos)
            form.setValue('photos', newPhotos)
          }}
          maxPhotos={10}
          maxFileSize={10 * 1024 * 1024} // 10MB
        />
        {form.formState.errors.photos && (
          <p className="text-red-600 text-sm mt-1">
            {form.formState.errors.photos.message}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          disabled={loading}
        >
          Cancel
        </button>
        
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          disabled={loading || !form.formState.isValid}
        >
          {loading ? 'Creating...' : 'Continue to Review'}
        </button>
      </div>
    </form>
  )
}
```

### AIReview Component
```typescript
// src/components/updates/AIReview.tsx
'use client'

import { useState, useEffect } from 'react'
import { UpdateDraft } from '@/lib/updates'
import { useRecipients } from '@/hooks/useRecipients'
import { RecipientCard } from '@/components/recipients/RecipientCard'

interface AIReviewProps {
  draft: UpdateDraft
  onAnalyze: () => Promise<void>
  onConfirmRecipients: (recipientIds: string[]) => Promise<void>
  onBack: () => void
  loading: boolean
}

export function AIReview({ 
  draft, 
  onAnalyze, 
  onConfirmRecipients, 
  onBack, 
  loading 
}: AIReviewProps) {
  const { recipients } = useRecipients()
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>(
    draft.suggested_recipients || []
  )
  const [analysisTriggered, setAnalysisTriggered] = useState(false)

  // Trigger AI analysis when component mounts
  useEffect(() => {
    if (!draft.ai_analysis && !analysisTriggered) {
      setAnalysisTriggered(true)
      onAnalyze()
    }
  }, [draft.ai_analysis, analysisTriggered, onAnalyze])

  const toggleRecipient = (recipientId: string) => {
    setSelectedRecipients(prev => 
      prev.includes(recipientId)
        ? prev.filter(id => id !== recipientId)
        : [...prev, recipientId]
    )
  }

  return (
    <div className="space-y-6">
      {/* Update Preview */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Your Update</h2>
        <div className="prose max-w-none">
          <p>{draft.content}</p>
          {draft.milestone_type && (
            <div className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mt-2">
              Milestone: {draft.milestone_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
          )}
        </div>
        {draft.media_urls && draft.media_urls.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">{draft.media_urls.length} photo(s) attached</p>
            <div className="flex gap-2 overflow-x-auto">
              {draft.media_urls.map((url, index) => (
                <img 
                  key={index}
                  src={url} 
                  alt={`Photo ${index + 1}`}
                  className="h-20 w-20 object-cover rounded-lg flex-shrink-0"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Analysis Results */}
      {loading && !draft.ai_analysis && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
            <p className="text-blue-800">AI is analyzing your update and suggesting recipients...</p>
          </div>
        </div>
      )}

      {draft.ai_analysis && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 text-green-800">AI Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium text-green-700">Keywords</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {draft.ai_analysis.keywords.map((keyword, index) => (
                  <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium text-green-700">Tone</p>
              <p className="capitalize text-green-800">{draft.ai_analysis.emotional_tone}</p>
            </div>
            <div>
              <p className="font-medium text-green-700">Importance</p>
              <div className="flex items-center">
                <div className="w-full bg-green-200 rounded-full h-2 mr-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${draft.ai_analysis.importance_level * 10}%` }}
                  ></div>
                </div>
                <span className="text-green-800">{draft.ai_analysis.importance_level}/10</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recipient Selection */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Who should receive this update?</h3>
          <p className="text-sm text-gray-600">
            {selectedRecipients.length} of {recipients.length} selected
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recipients.map((recipient) => (
            <div
              key={recipient.id}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                selectedRecipients.includes(recipient.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => toggleRecipient(recipient.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{recipient.name}</p>
                  <p className="text-sm text-gray-600 capitalize">{recipient.relationship}</p>
                  <p className="text-xs text-gray-500">
                    {recipient.frequency} via {recipient.preferred_channels.join(', ')}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={selectedRecipients.includes(recipient.id)}
                  onChange={() => toggleRecipient(recipient.id)}
                  className="h-5 w-5 text-blue-600"
                />
              </div>
            </div>
          ))}
        </div>

        {recipients.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No recipients found. Add some recipients first.</p>
            <button className="mt-2 text-blue-600 hover:text-blue-700">
              Manage Recipients
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-6">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          disabled={loading}
        >
          Back
        </button>
        
        <button
          onClick={() => onConfirmRecipients(selectedRecipients)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          disabled={loading || selectedRecipients.length === 0}
        >
          {loading ? 'Processing...' : `Continue with ${selectedRecipients.length} Recipients`}
        </button>
      </div>
    </div>
  )
}
```

## Success Criteria
- [ ] ✅ Can upload and compress photos successfully
- [ ] ✅ AI analysis triggers automatically and displays results
- [ ] ✅ AI suggestions display correctly with reasoning
- [ ] ✅ User can override AI recipient suggestions
- [ ] ✅ Update saves with all metadata correctly
- [ ] ✅ Preview shows exactly what will be sent
- [ ] ✅ Form validation prevents invalid data submission
- [ ] ✅ Loading states provide good user feedback
- [ ] ✅ Error handling works gracefully
- [ ] ✅ Responsive design works on all devices
- [ ] ✅ Integration with child management and recipient systems works
- [ ] ✅ Image compression reduces file sizes appropriately

## Testing Instructions

### Basic Update Creation
1. Navigate to create update page
2. Select a child from dropdown
3. Add text content (test with various lengths)
4. Upload 1-5 photos of different sizes
5. Select milestone type (optional)
6. Verify AI analysis triggers automatically
7. Review suggested recipients
8. Modify recipient selection
9. Confirm and verify update creation

### Photo Upload Testing
1. Test drag and drop photo upload
2. Test click to browse file upload
3. Upload large photos (>5MB) - verify compression
4. Upload multiple photos - verify all process
5. Test photo reordering
6. Test photo deletion
7. Verify photo previews display correctly

### AI Integration Testing
1. Create update with milestone content - verify high importance
2. Create routine update - verify lower importance
3. Test with various content types (funny, medical, activity)
4. Verify recipient suggestions match content appropriately
5. Test AI analysis error handling (network issues)

### Form Validation Testing
1. Try submitting without child selection
2. Try submitting with empty content
3. Test content length limits (2000+ characters)
4. Upload invalid file types
5. Upload files that are too large
6. Verify all validation messages display correctly

## Next Steps After Completion
- Ready for CRO-24 (Email Distribution System)
- Update creation flow prepared for actual sending
- Foundation set for scheduling and batch operations