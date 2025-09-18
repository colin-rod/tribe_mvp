# CRO-33: Community Prompts & Milestones (MVP)

## Issue URL
https://linear.app/crod/issue/CRO-33/phase-42-community-prompts-milestones

## Agents Required
- `react-developer` (Primary)
- `community-developer` (Supporting)
- `moderation-developer` (Supporting)

## Dependencies
- **CRO-27**: AI Prompt Generation System (COMPLETE)
- **CRO-32**: Notification Management System (COMPLETE)
- All Phase 3 issues (COMPLETE)

## Objective
Create a simplified community-driven system where users can submit custom prompts and milestones that other users can benefit from, building a shared knowledge base of parenting moments and creative ideas with basic moderation.

## MVP Scope Reduction
**Removed from MVP:**
- Voting and rating system
- Community leaderboards and gamification
- Advanced analytics and trending algorithms
- User reputation systems
- Complex moderation workflows

**MVP Focus:**
- Simple prompt submission
- Basic content library browsing
- Admin moderation approval
- Integration with AI prompt system

## Database Schema Implementation

### Community Content Tables
```sql
-- Community-submitted prompts (simplified)
CREATE TABLE community_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submitted_by UUID REFERENCES profiles(id),
  prompt_text TEXT NOT NULL,
  prompt_type VARCHAR CHECK (prompt_type IN ('fun', 'milestone', 'activity', 'seasonal')),
  category VARCHAR, -- 'newborn', 'infant', 'toddler', 'preschool', 'all_ages'
  age_range_min INTEGER, -- minimum age in months
  age_range_max INTEGER, -- maximum age in months
  tags VARCHAR[],
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderated_by UUID REFERENCES profiles(id),
  moderation_reason TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Community milestone templates (simplified)
CREATE TABLE community_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submitted_by UUID REFERENCES profiles(id),
  milestone_name VARCHAR NOT NULL,
  milestone_description TEXT,
  typical_age_months INTEGER,
  age_range_min INTEGER,
  age_range_max INTEGER,
  category VARCHAR NOT NULL, -- 'physical', 'cognitive', 'social', 'emotional'
  tags VARCHAR[],
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderated_by UUID REFERENCES profiles(id),
  moderation_reason TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Content reports for moderation (simplified)
CREATE TABLE content_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reported_by UUID REFERENCES profiles(id),
  content_type VARCHAR CHECK (content_type IN ('prompt', 'milestone')),
  content_id UUID NOT NULL,
  reason VARCHAR NOT NULL CHECK (reason IN ('inappropriate', 'spam', 'duplicate', 'inaccurate', 'other')),
  description TEXT,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  reviewed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- User submissions tracking
CREATE TABLE user_submissions (
  user_id UUID REFERENCES profiles(id),
  daily_submission_count INTEGER DEFAULT 0,
  last_submission_date DATE DEFAULT CURRENT_DATE,
  total_approved_submissions INTEGER DEFAULT 0,
  PRIMARY KEY (user_id)
);

-- RLS policies
ALTER TABLE community_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- Users can view approved content
CREATE POLICY "Users can view approved prompts" ON community_prompts
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can view approved milestones" ON community_milestones
  FOR SELECT USING (status = 'approved');

-- Users can submit content
CREATE POLICY "Users can submit prompts" ON community_prompts
  FOR INSERT WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can submit milestones" ON community_milestones
  FOR INSERT WITH CHECK (auth.uid() = submitted_by);

-- Users can report content
CREATE POLICY "Users can report content" ON content_reports
  FOR INSERT WITH CHECK (auth.uid() = reported_by);
```

## Tasks

### 1. Community Content Submission System
- [ ] Build prompt submission interface with validation
- [ ] Create milestone submission form with age ranges
- [ ] Implement content categorization and tagging
- [ ] Add submission preview and confirmation
- [ ] Build submission rate limiting (5 per day)

### 2. Content Discovery and Browsing
- [ ] Create community prompt library interface
- [ ] Build milestone gallery with filtering
- [ ] Implement basic search functionality with tags and categories
- [ ] Add age-based content filtering
- [ ] Create chronological content listing

### 3. Basic Moderation System
- [ ] Build simple admin moderation dashboard
- [ ] Create content reporting system for users
- [ ] Implement basic approval/rejection workflow
- [ ] Add bulk moderation actions for admins
- [ ] Build moderation queue with filters

### 4. Integration with AI System
- [ ] Integrate approved community prompts with AI generation
- [ ] Add community milestone suggestions to users
- [ ] Create feedback loop from usage to community rankings
- [ ] Implement basic prompt recommendation system

## Component Specifications

### CommunityPrompts.tsx - Simplified Community Interface
```typescript
interface CommunityPromptsProps {
  category?: string
  ageRange?: { min: number, max: number }
  searchQuery?: string
}

// Features:
// - Browse approved community prompts
// - Filter by age, category, and tags
// - Basic search functionality
// - Report inappropriate content
// - Submit new prompt suggestions
// - Simple chronological listing
```

### SubmitPrompt.tsx - Simple Submission Interface
```typescript
interface SubmitPromptProps {
  onSubmit: (prompt: PromptSubmission) => Promise<void>
  onCancel: () => void
}

// Features:
// - Single-step submission form
// - Prompt text validation and guidelines
// - Age range and category selection
// - Basic tag input
// - Duplicate detection warning
// - Submission guidelines display
```

### AdminModerationDashboard.tsx - Basic Moderation
```typescript
interface AdminModerationDashboardProps {
  userRole: 'admin'
}

// Features:
// - Queue of pending submissions
// - Simple approve/reject actions
// - Basic content preview
// - Bulk actions for multiple items
// - Simple filtering by content type
```

## Core Functionality Implementation

### Simplified Community Content Management
```typescript
// src/lib/community-content.ts
import { createClient } from '@/lib/supabase/client'

export interface CommunityPrompt {
  id: string
  submitted_by: string
  prompt_text: string
  prompt_type: string
  category: string
  age_range_min: number
  age_range_max: number
  tags: string[]
  status: string
  usage_count: number
  created_at: string
  submitter_name?: string
}

export interface PromptSubmission {
  prompt_text: string
  prompt_type: 'fun' | 'milestone' | 'activity' | 'seasonal'
  category: 'newborn' | 'infant' | 'toddler' | 'preschool' | 'all_ages'
  age_range_min: number
  age_range_max: number
  tags: string[]
}

export async function getCommunityPrompts(filters: {
  category?: string
  ageRange?: { min: number, max: number }
  search?: string
  limit?: number
}): Promise<CommunityPrompt[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('community_prompts')
    .select(`
      *,
      profiles!submitted_by(name)
    `)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters.category && filters.category !== 'all_ages') {
    query = query.eq('category', filters.category)
  }

  if (filters.ageRange) {
    query = query
      .lte('age_range_min', filters.ageRange.max)
      .gte('age_range_max', filters.ageRange.min)
  }

  if (filters.search) {
    query = query.ilike('prompt_text', `%${filters.search}%`)
  }

  if (filters.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) throw error

  return data?.map(prompt => ({
    ...prompt,
    submitter_name: prompt.profiles?.name || 'Anonymous'
  })) || []
}

export async function submitCommunityPrompt(submission: PromptSubmission): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Must be authenticated to submit content')

  // Check for duplicates
  const { data: existingPrompt } = await supabase
    .from('community_prompts')
    .select('id')
    .ilike('prompt_text', submission.prompt_text.trim())
    .single()

  if (existingPrompt) {
    throw new Error('A similar prompt already exists in the community')
  }

  // Check daily submission limits
  const { data: submissions } = await supabase
    .from('user_submissions')
    .select('daily_submission_count, last_submission_date')
    .eq('user_id', user.id)
    .single()

  const today = new Date().toISOString().split('T')[0]
  
  if (submissions?.last_submission_date === today && submissions.daily_submission_count >= 5) {
    throw new Error('You can only submit 5 prompts per day')
  }

  // Submit the prompt
  const { error } = await supabase
    .from('community_prompts')
    .insert({
      submitted_by: user.id,
      ...submission,
      status: 'pending'
    })

  if (error) throw error

  // Update submission tracking
  await supabase
    .from('user_submissions')
    .upsert({
      user_id: user.id,
      daily_submission_count: submissions?.last_submission_date === today 
        ? (submissions.daily_submission_count || 0) + 1 
        : 1,
      last_submission_date: today
    })

  return true
}

export async function reportContent(
  contentType: 'prompt' | 'milestone',
  contentId: string,
  reason: string,
  description?: string
): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Must be authenticated to report content')

  const { error } = await supabase
    .from('content_reports')
    .insert({
      reported_by: user.id,
      content_type: contentType,
      content_id: contentId,
      reason,
      description
    })

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      throw new Error('You have already reported this content')
    }
    throw error
  }

  return true
}

// Admin functions
export async function moderateContent(
  contentType: 'prompt' | 'milestone',
  contentId: string,
  action: 'approve' | 'reject',
  reason?: string
): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Must be authenticated')

  const tableName = contentType === 'prompt' ? 'community_prompts' : 'community_milestones'
  
  const { error } = await supabase
    .from(tableName)
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      moderated_by: user.id,
      moderation_reason: reason,
      approved_at: action === 'approve' ? new Date().toISOString() : null
    })
    .eq('id', contentId)

  if (error) throw error

  // Update user's approved submission count if approved
  if (action === 'approve') {
    const { data: content } = await supabase
      .from(tableName)
      .select('submitted_by')
      .eq('id', contentId)
      .single()

    if (content) {
      await supabase
        .from('user_submissions')
        .upsert({
          user_id: content.submitted_by,
          total_approved_submissions: supabase.rpc('increment_approved_submissions')
        })
    }
  }

  return true
}
```

## UI Components Implementation

### Simplified CommunityPrompts Component
```typescript
// src/components/community/CommunityPrompts.tsx
'use client'

import { useState } from 'react'
import { useCommunityPrompts } from '@/hooks/useCommunityPrompts'
import { PromptFilters } from './PromptFilters'
import { SimplePromptCard } from './SimplePromptCard'
import { SubmitPromptModal } from './SubmitPromptModal'
import { Plus } from 'lucide-react'

export function CommunityPrompts() {
  const { prompts, loading, filters, updateFilters, refreshPrompts } = useCommunityPrompts()
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  const handlePromptSubmitted = () => {
    setShowSubmitModal(false)
    refreshPrompts()
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Community Ideas</h1>
            <p className="text-gray-600 mt-2">
              Creative prompts and milestones shared by our parent community
            </p>
          </div>
          
          <button
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Submit Idea
          </button>
        </div>

        {/* Simple Stats */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="text-2xl font-bold text-blue-600">{prompts.length}</div>
          <div className="text-sm text-gray-600">Community Ideas Available</div>
        </div>
      </div>

      {/* Filters */}
      <PromptFilters
        filters={filters}
        onFiltersChange={updateFilters}
        totalResults={prompts.length}
      />

      {/* Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-48 rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : prompts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">💡</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No ideas found</h3>
          <p className="text-gray-600 mb-4">
            Be the first to share a creative idea with the community!
          </p>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Submit First Idea
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prompts.map((prompt) => (
            <SimplePromptCard
              key={prompt.id}
              prompt={prompt}
            />
          ))}
        </div>
      )}

      {/* Submit Modal */}
      {showSubmitModal && (
        <SubmitPromptModal
          onSubmit={handlePromptSubmitted}
          onClose={() => setShowSubmitModal(false)}
        />
      )}
    </div>
  )
}
```

### SimplePromptCard Component (No Voting)
```typescript
// src/components/community/SimplePromptCard.tsx
'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { reportContent } from '@/lib/community-content'
import { Flag, User, Calendar } from 'lucide-react'

interface SimplePromptCardProps {
  prompt: CommunityPrompt
}

export function SimplePromptCard({ prompt }: SimplePromptCardProps) {
  const [reporting, setReporting] = useState(false)

  const handleReport = async () => {
    if (reporting) return
    
    setReporting(true)
    try {
      await reportContent('prompt', prompt.id, 'inappropriate')
      alert('Content reported successfully')
    } catch (error) {
      console.error('Failed to report:', error)
      alert('Failed to report content')
    } finally {
      setReporting(false)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'milestone': return 'bg-purple-100 text-purple-800'
      case 'activity': return 'bg-blue-100 text-blue-800'
      case 'fun': return 'bg-yellow-100 text-yellow-800'
      case 'seasonal': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryLabel = (category: string) => {
    return category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(prompt.prompt_type)}`}>
            {prompt.prompt_type}
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {getCategoryLabel(prompt.category)}
          </span>
        </div>
        
        <button
          onClick={handleReport}
          disabled={reporting}
          className="text-gray-400 hover:text-red-500 p-1 disabled:opacity-50"
          title="Report content"
        >
          <Flag className="h-3 w-3" />
        </button>
      </div>

      {/* Content */}
      <div className="mb-4">
        <p className="text-gray-800 leading-relaxed">
          {prompt.prompt_text}
        </p>
      </div>

      {/* Age Range */}
      <div className="mb-4 text-sm text-gray-600">
        <Calendar className="h-4 w-4 inline mr-1" />
        Ages: {prompt.age_range_min}-{prompt.age_range_max} months
      </div>

      {/* Tags */}
      {prompt.tags && prompt.tags.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {prompt.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
              >
                #{tag}
              </span>
            ))}
            {prompt.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{prompt.tags.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{prompt.submitter_name}</span>
          </div>
          <span>{formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true })}</span>
        </div>
      </div>

      {/* Usage Stats */}
      {prompt.usage_count > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            Used by {prompt.usage_count} {prompt.usage_count === 1 ? 'parent' : 'parents'}
          </span>
        </div>
      )}
    </div>
  )
}
```

## Testing Strategy

### Community Content Tests
1. **Submission Tests**:
   - Test prompt submission with validation
   - Verify duplicate detection
   - Check submission rate limiting
   - Test content moderation queue

2. **Content Discovery Tests**:
   - Test filtering by age and category
   - Verify search functionality
   - Check content ordering
   - Test pagination and performance

### Moderation Testing
- Test content reporting system
- Verify admin approval workflow
- Check bulk moderation actions
- Test content filtering

## Success Criteria
- [ ] ✅ Users can submit prompts with proper validation
- [ ] ✅ Content filtering and search functionality work
- [ ] ✅ Basic moderation system prevents inappropriate content
- [ ] ✅ Age-appropriate content filtering works correctly
- [ ] ✅ Integration with AI system enhances recommendations
- [ ] ✅ User attribution encourages participation
- [ ] ✅ Performance handles moderate volumes of community content
- [ ] ✅ Anti-spam measures (rate limiting) are effective

## Future Enhancements (Post-MVP)
- Voting and rating system
- User reputation and gamification
- Advanced analytics and trending
- Community challenges and contests
- Advanced moderation tools
- Multi-language support

## Next Steps After Completion
- MVP community system ready for user testing
- Foundation set for future voting/rating features
- Basic moderation tools ready for community management
- Integration points prepared for advanced features