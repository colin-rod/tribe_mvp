# CRO-21: Child Management System

## Issue URL
https://linear.app/crod/issue/CRO-21/phase-21-child-management-system

## Agents Required
- `react-developer` (Primary)
- `typescript-developer` (Supporting)
- `ui-ux-designer` (Supporting)

## Dependencies
- **CRO-18**: Supabase Project Setup & Database Schema (COMPLETE)
- **CRO-20**: Next.js Project Setup & Authentication (COMPLETE)

## Objective
Build the child management system - add, edit, and manage children associated with a parent account.

## Context
Parents need to manage multiple children on the platform. Each child will be associated with updates, and parents need to easily add, edit, and select children when creating updates. The system should be intuitive and handle profile photos.

## Database Schema Reference
From CRO-18, the `children` table is already created:
```sql
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  birth_date DATE NOT NULL,
  profile_photo_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Tasks

### 1. Database Operations Layer
- [ ] Create child CRUD operations using Supabase client
- [ ] Implement age calculation utilities
- [ ] Add photo upload functionality to Supabase Storage
- [ ] Create TypeScript types for child data
- [ ] Test all database operations with RLS policies

### 2. Core Components Development
- [ ] `AddChildForm.tsx` - Form to add new child with validation
- [ ] `ChildCard.tsx` - Display individual child info with photo
- [ ] `ChildManager.tsx` - List and manage all children
- [ ] `ChildSelector.tsx` - Select child when creating updates
- [ ] `EditChildModal.tsx` - Edit existing child details

### 3. Child Profile Photo System
- [ ] Photo upload component with preview
- [ ] Image resizing and optimization
- [ ] Default avatar system for children without photos
- [ ] Photo deletion and replacement functionality
- [ ] Proper storage path organization

### 4. User Experience Features
- [ ] Age calculation and display (years, months)
- [ ] Form validation with proper error handling
- [ ] Loading states during operations
- [ ] Confirmation dialogs for deletion
- [ ] Empty states when no children exist

### 5. Integration Points
- [ ] Connect to existing dashboard layout
- [ ] Prepare child selector for update creation
- [ ] Add child management to main navigation
- [ ] Responsive design for mobile use

## Component Specifications

### AddChildForm.tsx
```typescript
interface AddChildFormProps {
  onChildAdded: (child: Child) => void
  onCancel: () => void
}

// Features:
// - Name input with validation
// - Birth date picker
// - Optional photo upload with preview
// - Form submission with loading state
// - Error handling and display
```

### ChildCard.tsx  
```typescript
interface ChildCardProps {
  child: Child
  onEdit: (child: Child) => void
  onDelete: (childId: string) => void
  showActions?: boolean
}

// Features:
// - Profile photo display with fallback
// - Child name and calculated age
// - Edit and delete action buttons
// - Responsive card design
```

### ChildManager.tsx
```typescript
// Features:
// - List all user's children
// - Add new child button
// - Search/filter children (if many)
// - Grid layout for child cards
// - Empty state with call-to-action
// - Real-time updates when children change
```

### ChildSelector.tsx
```typescript
interface ChildSelectorProps {
  selectedChildId?: string
  onChildSelect: (childId: string) => void
  placeholder?: string
}

// Features:
// - Dropdown or radio selection
// - Child photos and names
// - Search functionality if many children
// - Required selection validation
```

## Database Operations

### Child CRUD Operations
```typescript
// src/lib/children.ts

export interface Child {
  id: string
  parent_id: string
  name: string
  birth_date: string
  profile_photo_url?: string
  created_at: string
}

// Create child
export async function createChild(childData: Omit<Child, 'id' | 'parent_id' | 'created_at'>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  const { data, error } = await supabase
    .from('children')
    .insert({
      parent_id: user.id,
      name: childData.name,
      birth_date: childData.birth_date,
      profile_photo_url: childData.profile_photo_url
    })
    .select()
    .single()
    
  if (error) throw error
  return data
}

// Get user's children
export async function getChildren(): Promise<Child[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('parent_id', user.id)
    .order('birth_date', { ascending: false })
    
  if (error) throw error
  return data || []
}

// Update child
export async function updateChild(childId: string, updates: Partial<Child>) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('children')
    .update(updates)
    .eq('id', childId)
    .select()
    .single()
    
  if (error) throw error
  return data
}

// Delete child
export async function deleteChild(childId: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('children')
    .delete()
    .eq('id', childId)
    
  if (error) throw error
}
```

### Photo Upload Utilities
```typescript
// src/lib/photo-upload.ts

export async function uploadChildPhoto(file: File, childId: string): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  // Resize and compress image
  const processedFile = await processImage(file, { maxWidth: 400, quality: 0.8 })
  
  const filePath = `${user.id}/children/${childId}/profile.jpg`
  
  const { data, error } = await supabase.storage
    .from('media')
    .upload(filePath, processedFile, { 
      upsert: true,
      contentType: 'image/jpeg'
    })
    
  if (error) throw error
  
  const { data: { publicUrl } } = supabase.storage
    .from('media')
    .getPublicUrl(filePath)
    
  return publicUrl
}

// Image processing utility
async function processImage(file: File, options: { maxWidth: number, quality: number }): Promise<File> {
  // Implementation for client-side image resizing
  // Using canvas or a library like browser-image-compression
}
```

### Age Calculation Utilities
```typescript
// src/lib/age-utils.ts

export interface Age {
  years: number
  months: number
  totalMonths: number
}

export function calculateAge(birthDate: string): Age {
  const birth = new Date(birthDate)
  const today = new Date()
  
  let years = today.getFullYear() - birth.getFullYear()
  let months = today.getMonth() - birth.getMonth()
  
  if (months < 0) {
    years--
    months += 12
  }
  
  const totalMonths = years * 12 + months
  
  return { years, months, totalMonths }
}

export function formatAge(age: Age): string {
  if (age.years === 0) {
    return `${age.months} month${age.months !== 1 ? 's' : ''}`
  } else if (age.months === 0) {
    return `${age.years} year${age.years !== 1 ? 's' : ''}`
  } else {
    return `${age.years} year${age.years !== 1 ? 's' : ''}, ${age.months} month${age.months !== 1 ? 's' : ''}`
  }
}
```

## Form Validation Schema
```typescript
// src/lib/validation/child.ts
import { z } from 'zod'

export const addChildSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  
  birth_date: z.string()
    .min(1, 'Birth date is required')
    .refine((date) => {
      const birthDate = new Date(date)
      const today = new Date()
      const maxAge = new Date()
      maxAge.setFullYear(today.getFullYear() - 18) // Max 18 years old
      
      return birthDate <= today && birthDate >= maxAge
    }, 'Birth date must be within the last 18 years'),
    
  profile_photo: z.instanceof(File)
    .optional()
    .refine((file) => {
      if (!file) return true
      return file.size <= 5 * 1024 * 1024 // 5MB limit
    }, 'File size must be less than 5MB')
    .refine((file) => {
      if (!file) return true
      return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    }, 'File must be a JPEG, PNG, or WebP image')
})

export type AddChildFormData = z.infer<typeof addChildSchema>
```

## UI/UX Specifications

### Design Requirements
- Clean, family-friendly interface
- Large, touch-friendly buttons for mobile
- Clear visual hierarchy
- Consistent with overall app design
- Accessibility compliance (WCAG 2.1)

### Child Card Design
- Photo: 80x80px with rounded corners
- Name: Prominent, easy to read
- Age: Secondary text below name
- Actions: Edit/delete icons in top-right corner
- Hover/focus states for interactivity

### Form Design
- Single-column layout for simplicity
- Clear labels and placeholder text
- Inline validation with helpful messages
- Photo upload with drag-and-drop
- Progress indicators during submission

### Responsive Behavior
- Mobile: Single column, larger touch targets
- Tablet: 2-column grid for child cards
- Desktop: 3-4 column grid, compact forms

## Success Criteria
- [ ] ✅ Can add children with name and birth date
- [ ] ✅ Profile photos upload to Supabase Storage correctly
- [ ] ✅ Child list displays with accurate ages calculated
- [ ] ✅ Can edit child details (name, birth date, photo)
- [ ] ✅ Can delete children with proper confirmation
- [ ] ✅ Child selector works for future update creation
- [ ] ✅ All operations respect RLS policies (user can only see their children)
- [ ] ✅ Form validation prevents invalid data
- [ ] ✅ Responsive design works on all device sizes
- [ ] ✅ Loading states and error handling work properly

## Testing Instructions
1. **Add Child Test**:
   - Navigate to child management
   - Add child with name and birth date
   - Verify child appears in list with correct age
   - Test with and without profile photo

2. **Photo Upload Test**:
   - Upload various image formats (JPG, PNG, WebP)
   - Test large file handling (should compress)
   - Verify photos display correctly
   - Test photo replacement

3. **Edit Child Test**:
   - Edit child name and birth date
   - Update profile photo
   - Verify changes persist after page refresh

4. **Delete Child Test**:
   - Delete child with confirmation dialog
   - Verify child removed from list
   - Verify associated photos cleaned up from storage

5. **Multiple Children Test**:
   - Add several children
   - Verify age calculations for different ages
   - Test child selector functionality

6. **RLS Security Test**:
   - Create two user accounts
   - Verify users can only see their own children
   - Test in browser dev tools with different user tokens

## Integration Points
- Dashboard navigation: Add "Children" link
- Update creation: Use ChildSelector component
- Profile management: Link to child management
- Navigation breadcrumbs: Children > Add/Edit Child

## File Structure
```
src/
├── components/
│   └── children/
│       ├── AddChildForm.tsx
│       ├── ChildCard.tsx
│       ├── ChildManager.tsx
│       ├── ChildSelector.tsx
│       ├── EditChildModal.tsx
│       └── PhotoUpload.tsx
├── lib/
│   ├── children.ts
│   ├── photo-upload.ts
│   ├── age-utils.ts
│   └── validation/
│       └── child.ts
├── hooks/
│   ├── useChildren.tsx
│   └── useChildPhoto.tsx
└── app/
    └── dashboard/
        └── children/
            ├── page.tsx
            └── add/
                └── page.tsx
```

## Next Steps After Completion
- Ready for CRO-22 (Recipient & Group Management)
- Child selector prepared for CRO-23 (Update Creation)
- Foundation set for child-specific content in future features