# CRO-22: Recipient & Group Management

## Issue URL
https://linear.app/crod/issue/CRO-22/phase-22-recipient-and-group-management

## Agents Required
- `react-developer` (Primary)
- `ui-ux-designer` (Supporting)
- `typescript-developer` (Supporting)

## Dependencies
- **CRO-18**: Supabase Project Setup & Database Schema (COMPLETE)
- **CRO-20**: Next.js Project Setup & Authentication (COMPLETE)
- **CRO-21**: Child Management System (COMPLETE)

## Objective
Build the recipient management system with groups, individual preferences, and magic link access for recipients to set their own preferences without needing accounts.

## Context
Parents need to manage family members and friends who will receive updates. The system uses groups (Close Family, Extended Family, Friends) with default settings, but allows individual recipients to override group preferences. Recipients can set preferences via magic links without creating accounts.

## Database Schema Reference
From CRO-18, these tables are already created:
```sql
-- Recipient Groups
CREATE TABLE recipient_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  default_frequency VARCHAR DEFAULT 'weekly_digest',
  default_channels VARCHAR[] DEFAULT ARRAY['email'],
  is_default_group BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Recipients
CREATE TABLE recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email VARCHAR,
  phone VARCHAR,
  name VARCHAR NOT NULL,
  relationship VARCHAR NOT NULL,
  group_id UUID REFERENCES recipient_groups(id),
  frequency VARCHAR DEFAULT 'weekly_digest',
  preferred_channels VARCHAR[] DEFAULT ARRAY['email'],
  content_types VARCHAR[] DEFAULT ARRAY['photos', 'text'],
  overrides_group_default BOOLEAN DEFAULT false,
  preference_token VARCHAR UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT email_or_phone_required CHECK (email IS NOT NULL OR phone IS NOT NULL)
);
```

## Tasks

### 1. Default Group Creation System
- [ ] Create function to auto-generate default groups on user signup
- [ ] Integrate with existing user registration flow
- [ ] Test default group creation for new users
- [ ] Handle existing users without default groups

### 2. Recipient CRUD Operations
- [ ] Create recipient management database functions
- [ ] Implement preference token generation and validation
- [ ] Build recipient search and filtering
- [ ] Add bulk recipient operations

### 3. Group Management Interface
- [ ] `GroupManager.tsx` - Create, edit, delete groups
- [ ] `GroupCard.tsx` - Display group info and settings
- [ ] Group default preference configuration
- [ ] Recipient assignment to groups

### 4. Recipient Management Interface
- [ ] `RecipientManager.tsx` - Main recipient management interface
- [ ] `AddRecipientForm.tsx` - Add recipients with group assignment
- [ ] `RecipientCard.tsx` - Display recipient with preferences
- [ ] `RecipientSearch.tsx` - Search and filter recipients

### 5. Magic Link Preference System
- [ ] `PreferencePage.tsx` - No-auth preference setting page
- [ ] Token validation and security
- [ ] Preference update system for external users
- [ ] Email notification system for preference links

### 6. Group Override System
- [ ] Individual preference override interface
- [ ] Clear indication when preferences differ from group
- [ ] Reset to group defaults functionality
- [ ] Preference inheritance and cascading

## Component Specifications

### GroupManager.tsx
```typescript
interface Group {
  id: string
  parent_id: string
  name: string
  default_frequency: 'every_update' | 'daily_digest' | 'weekly_digest' | 'milestones_only'
  default_channels: ('email' | 'sms' | 'whatsapp')[]
  is_default_group: boolean
  recipient_count?: number
  created_at: string
}

// Features:
// - List all user's groups
// - Create new custom groups
// - Edit group settings and defaults
// - Delete groups (with recipient reassignment)
// - Show recipient count per group
```

### AddRecipientForm.tsx
```typescript
interface AddRecipientFormProps {
  onRecipientAdded: (recipient: Recipient) => void
  onCancel: () => void
  groups: Group[]
}

// Features:
// - Name, email, phone input with validation
// - Relationship type selection
// - Group assignment dropdown
// - Channel preference checkboxes
// - Frequency selection
// - Preview of magic link that will be sent
```

### RecipientCard.tsx
```typescript
interface RecipientCardProps {
  recipient: Recipient
  group?: Group
  onEdit: (recipient: Recipient) => void
  onDelete: (recipientId: string) => void
  onSendPreferenceLink: (recipientId: string) => void
}

// Features:
// - Contact info display
// - Group membership indicator
// - Preference summary (with override indicators)
// - Quick actions (edit, delete, send preference link)
// - Status indicator (active/inactive)
```

### PreferencePage.tsx
```typescript
interface PreferencePageProps {
  token: string // From URL params
}

// Features:
// - Token validation and recipient lookup
// - No authentication required
// - All preference options available
// - Save preferences without account
// - Clear explanation of what preferences do
// - Thank you confirmation after saving
```

## Database Operations

### Group Management Functions
```typescript
// src/lib/recipient-groups.ts

export interface RecipientGroup {
  id: string
  parent_id: string
  name: string
  default_frequency: string
  default_channels: string[]
  is_default_group: boolean
  created_at: string
}

// Create default groups for new user
export async function createDefaultGroups(userId: string): Promise<RecipientGroup[]> {
  const supabase = createClient()
  
  const defaultGroups = [
    {
      parent_id: userId,
      name: 'Close Family',
      default_frequency: 'daily_digest',
      default_channels: ['email'],
      is_default_group: true
    },
    {
      parent_id: userId,
      name: 'Extended Family', 
      default_frequency: 'weekly_digest',
      default_channels: ['email'],
      is_default_group: true
    },
    {
      parent_id: userId,
      name: 'Friends',
      default_frequency: 'weekly_digest',
      default_channels: ['email'],
      is_default_group: true
    }
  ]
  
  const { data, error } = await supabase
    .from('recipient_groups')
    .insert(defaultGroups)
    .select()
    
  if (error) throw error
  return data
}

// Get user's groups with recipient counts
export async function getUserGroups(): Promise<(RecipientGroup & { recipient_count: number })[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  const { data, error } = await supabase
    .from('recipient_groups')
    .select(`
      *,
      recipients!group_id(count)
    `)
    .eq('parent_id', user.id)
    .order('is_default_group', { ascending: false })
    .order('name')
    
  if (error) throw error
  
  return data?.map(group => ({
    ...group,
    recipient_count: group.recipients?.[0]?.count || 0
  })) || []
}
```

### Recipient Management Functions
```typescript
// src/lib/recipients.ts

export interface Recipient {
  id: string
  parent_id: string
  email?: string
  phone?: string
  name: string
  relationship: string
  group_id?: string
  frequency: string
  preferred_channels: string[]
  content_types: string[]
  overrides_group_default: boolean
  preference_token: string
  is_active: boolean
  created_at: string
  group?: RecipientGroup
}

// Create recipient
export async function createRecipient(recipientData: {
  name: string
  email?: string
  phone?: string
  relationship: string
  group_id?: string
}): Promise<Recipient> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  // Generate unique preference token
  const preferenceToken = generatePreferenceToken()
  
  const { data, error } = await supabase
    .from('recipients')
    .insert({
      parent_id: user.id,
      ...recipientData,
      preference_token: preferenceToken
    })
    .select(`
      *,
      recipient_groups(*)
    `)
    .single()
    
  if (error) throw error
  
  // Send preference link email
  await sendPreferenceLink(data.email, data.name, preferenceToken)
  
  return data
}

// Get recipients with groups
export async function getRecipients(): Promise<Recipient[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  const { data, error } = await supabase
    .from('recipients')
    .select(`
      *,
      recipient_groups(*)
    `)
    .eq('parent_id', user.id)
    .eq('is_active', true)
    .order('name')
    
  if (error) throw error
  return data || []
}

// Generate secure preference token
function generatePreferenceToken(): string {
  return crypto.randomUUID() + '-' + Date.now().toString(36)
}
```

### Magic Link Preference System
```typescript
// src/lib/preference-links.ts

// Get recipient by token (no auth required)
export async function getRecipientByToken(token: string): Promise<Recipient | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('recipients')
    .select(`
      *,
      recipient_groups(*)
    `)
    .eq('preference_token', token)
    .eq('is_active', true)
    .single()
    
  if (error) return null
  return data
}

// Update recipient preferences via token
export async function updateRecipientPreferences(
  token: string, 
  preferences: {
    frequency: string
    preferred_channels: string[]
    content_types: string[]
  }
): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('recipients')
    .update({
      ...preferences,
      overrides_group_default: true
    })
    .eq('preference_token', token)
    .eq('is_active', true)
    
  return !error
}

// Send preference link email
async function sendPreferenceLink(email: string, name: string, token: string) {
  // Integration with SendGrid (implemented in future phases)
  const preferenceUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/preferences/${token}`
  
  console.log(`Send preference link to ${email}: ${preferenceUrl}`)
  // TODO: Implement actual email sending in CRO-24
}
```

## Form Validation Schemas
```typescript
// src/lib/validation/recipients.ts
import { z } from 'zod'

export const addRecipientSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
    
  email: z.string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
    
  phone: z.string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
    
  relationship: z.enum([
    'grandparent',
    'parent', 
    'sibling',
    'friend',
    'family',
    'colleague',
    'other'
  ]),
  
  group_id: z.string().uuid().optional(),
  
  frequency: z.enum([
    'every_update',
    'daily_digest',
    'weekly_digest', 
    'milestones_only'
  ]).default('weekly_digest'),
  
  preferred_channels: z.array(z.enum(['email', 'sms', 'whatsapp']))
    .min(1, 'At least one channel is required'),
    
  content_types: z.array(z.enum(['photos', 'text', 'milestones']))
    .min(1, 'At least one content type is required')
}).refine((data) => {
  return data.email || data.phone
}, {
  message: 'Either email or phone number is required',
  path: ['email']
})

export const updatePreferencesSchema = z.object({
  frequency: z.enum(['every_update', 'daily_digest', 'weekly_digest', 'milestones_only']),
  preferred_channels: z.array(z.enum(['email', 'sms', 'whatsapp'])).min(1),
  content_types: z.array(z.enum(['photos', 'text', 'milestones'])).min(1)
})
```

## Magic Link System

### URL Structure
```
https://www.colinrodrigues.com/preferences/[token]
```

### PreferencePage Component
```typescript
// src/app/preferences/[token]/page.tsx
'use client'

export default function PreferencePage({ params }: { params: { token: string } }) {
  const [recipient, setRecipient] = useState<Recipient | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  useEffect(() => {
    async function loadRecipient() {
      try {
        const data = await getRecipientByToken(params.token)
        setRecipient(data)
      } catch (error) {
        console.error('Invalid or expired link')
      } finally {
        setLoading(false)
      }
    }
    
    loadRecipient()
  }, [params.token])
  
  if (loading) return <LoadingSpinner />
  if (!recipient) return <InvalidLinkMessage />
  
  return (
    <div className="max-w-md mx-auto p-6">
      <h1>Update Your Preferences</h1>
      <p>Hi {recipient.name}! Set how you'd like to receive updates.</p>
      
      <PreferenceForm 
        recipient={recipient}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  )
}
```

## UI/UX Design Requirements

### Group Management Interface
- Card-based layout for groups
- Clear group names and member counts
- Easy group creation and editing
- Visual distinction for default vs custom groups

### Recipient Management Interface
- Searchable recipient list
- Filter by group or relationship
- Batch operations (select multiple recipients)
- Import/export functionality for large lists

### Add Recipient Form
- Step-by-step wizard for complex setups
- Smart defaults based on group selection
- Contact validation with helpful error messages
- Preview of what recipient will receive

### Magic Link Preferences Page
- No-auth, clean interface
- Clear explanation of each preference option
- Mobile-optimized for easy use
- Success confirmation and contact info for questions

### Preference Override Indicators
- Clear visual distinction when recipient overrides group settings
- "Reset to group defaults" option
- Tooltip explanations for different preference combinations

## Success Criteria
- [ ] ✅ Default groups created automatically on user signup
- [ ] ✅ Can add recipients with all required fields
- [ ] ✅ Recipients can be assigned to groups
- [ ] ✅ Magic link preferences work without authentication
- [ ] ✅ Individual preferences can override group defaults
- [ ] ✅ All database operations secure with RLS
- [ ] ✅ Form validation prevents invalid recipient data
- [ ] ✅ Search and filtering work efficiently
- [ ] ✅ Preference links are secure and expire appropriately
- [ ] ✅ Mobile-responsive design for all interfaces

## Testing Instructions

### Group Management Tests
1. Create new user account
2. Verify default groups are created automatically
3. Create custom group with specific settings
4. Edit group preferences and verify inheritance
5. Delete group and verify recipient reassignment

### Recipient Management Tests
1. Add recipient with email only
2. Add recipient with phone only
3. Add recipient with both email and phone
4. Test form validation with invalid data
5. Assign recipients to different groups
6. Verify RLS (users can only see their recipients)

### Magic Link Tests
1. Create recipient and capture preference token
2. Visit preference URL without authentication
3. Update preferences and verify changes save
4. Test with invalid/expired token
5. Verify mobile-responsive preference page

### Override System Tests
1. Set group default preferences
2. Override individual recipient preferences
3. Verify override indicators display correctly
4. Reset recipient to group defaults
5. Test preference inheritance when group changes

## Integration Points
- **Dashboard**: Add "Recipients" and "Groups" navigation
- **Future Updates**: Recipient selection for distribution
- **Email System**: Preference link sending (CRO-24)
- **Profile**: Link to recipient management