# CRO-31: Profile Management System

## Issue URL
https://linear.app/crod/issue/CRO-31/phase-34-profile-management-system

## Agents Required
- `react-developer` (Primary)
- `security-developer` (Supporting)
- `ui-ux-designer` (Supporting)

## Dependencies
- **CRO-18**: Supabase Project Setup & Database Schema (COMPLETE)
- **CRO-20**: Next.js Project Setup & Authentication (COMPLETE)
- All Phase 2 issues (COMPLETE)

## Objective
Build comprehensive profile management system allowing users to edit personal information, account settings, notification preferences, and handle account security including password changes and account deletion.

## Context
Parents need full control over their account settings, personal information, and privacy preferences. The system should be secure, user-friendly, and comply with data protection requirements while maintaining the family-focused nature of the platform.

## Database Schema Reference
From CRO-18, the profiles table:
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  notification_preferences JSONB DEFAULT '{
    "response_notifications": "immediate",
    "prompt_frequency": "every_3_days",
    "enabled_prompt_types": ["milestone", "activity", "fun"],
    "quiet_hours": {"start": "22:00", "end": "07:00"}
  }'::jsonb,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 0,
  onboarding_skipped BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Tasks

### 1. Profile Information Management
- [ ] Create profile editing interface with form validation
- [ ] Implement name and email update functionality
- [ ] Add profile photo upload and management
- [ ] Build timezone selection and display preferences
- [ ] Handle profile update confirmations and error states

### 2. Account Security Settings
- [ ] Password change functionality with current password verification
- [ ] Two-factor authentication preparation (UI only for MVP)
- [ ] Login history and device management display
- [ ] Security settings overview and recommendations
- [ ] Account recovery information management

### 3. Notification Preferences Management
- [ ] Comprehensive notification settings interface
- [ ] Quiet hours configuration with timezone awareness
- [ ] AI prompt frequency and type preferences
- [ ] Response notification timing options
- [ ] Email vs in-app notification toggles

### 4. Privacy and Data Management
- [ ] Data export functionality (GDPR compliance)
- [ ] Account deletion workflow with data retention options
- [ ] Privacy settings and data sharing preferences
- [ ] Download personal data archive
- [ ] Account deactivation (temporary) vs deletion (permanent)

### 5. Account Preferences
- [ ] Dashboard customization options
- [ ] Language and localization settings (preparation)
- [ ] Theme preferences (light/dark mode preparation)
- [ ] Email communication preferences
- [ ] Feature opt-in/opt-out toggles

### 6. Family Platform Settings
- [ ] Default sharing settings for new updates
- [ ] Default recipient group preferences
- [ ] Child privacy settings and consent management
- [ ] Platform usage analytics (opt-in)
- [ ] Beta feature access preferences

## Component Specifications

### ProfileManager.tsx - Main Settings Interface
```typescript
interface ProfileManagerProps {
  user: User
  profile: Profile
}

// Features:
// - Tabbed interface for different setting categories
// - Real-time save indicators
// - Form validation and error handling
// - Confirmation dialogs for destructive actions
// - Mobile-responsive accordion layout
// - Breadcrumb navigation
```

### PersonalInfoForm.tsx - Basic Profile Information
```typescript
interface PersonalInfoFormProps {
  profile: Profile
  onUpdate: (updates: Partial<Profile>) => Promise<void>
  loading: boolean
}

// Features:
// - Name editing with validation
// - Email change with verification flow
// - Profile photo upload with crop/resize
// - Timezone selection with auto-detection
// - Real-time validation feedback
// - Save state management
```

### SecuritySettings.tsx - Account Security
```typescript
interface SecuritySettingsProps {
  onPasswordChange: (currentPassword: string, newPassword: string) => Promise<void>
  onExportData: () => Promise<void>
  loading: boolean
}

// Features:
// - Password change form with strength indicator
// - Current password verification
// - Login history display (read-only for MVP)
// - Two-factor auth placeholder (future)
// - Security recommendations
// - Account recovery options
```

## Core Functionality Implementation

### Profile Management Hook
```typescript
// src/hooks/useProfileManager.ts
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

interface ProfileUpdates {
  name?: string
  notification_preferences?: any
  profile_photo_url?: string
}

export function useProfileManager() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const updateProfile = async (updates: ProfileUpdates) => {
    if (!user) throw new Error('Not authenticated')
    
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error
      
      setSuccessMessage('Profile updated successfully')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile'
      setError(message)
      return false
    } finally {
      setLoading(false)
      // Clear messages after delay
      setTimeout(() => {
        setSuccessMessage(null)
        setError(null)
      }, 5000)
    }
  }

  const updateEmail = async (newEmail: string) => {
    if (!user) throw new Error('Not authenticated')
    
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Update auth email (requires email confirmation)
      const { error: authError } = await supabase.auth.updateUser({ 
        email: newEmail 
      })
      
      if (authError) throw authError
      
      // Update profile email will be handled by database trigger
      setSuccessMessage('Please check your new email address to confirm the change')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update email'
      setError(message)
      return false
    } finally {
      setLoading(false)
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error('Not authenticated')
    
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Supabase requires current session to change password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) throw error
      
      setSuccessMessage('Password changed successfully')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change password'
      setError(message)
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    updateProfile,
    updateEmail,
    changePassword,
    loading,
    error,
    successMessage
  }
}
```

### Data Export Utility
```typescript
// src/lib/data-export.ts
import { createClient } from '@/lib/supabase/client'

export interface UserDataExport {
  profile: any
  children: any[]
  recipients: any[]
  updates: any[]
  responses: any[]
  exportDate: string
  dataRetentionInfo: string
}

export async function exportUserData(): Promise<UserDataExport> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  // Fetch all user data
  const [
    { data: profile },
    { data: children },
    { data: recipients },
    { data: updates },
    { data: responses }
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('children').select('*').eq('parent_id', user.id),
    supabase.from('recipients').select('*').eq('parent_id', user.id),
    supabase.from('updates').select('*').eq('parent_id', user.id),
    supabase.from('responses').select(`
      *,
      updates!inner(parent_id)
    `).eq('updates.parent_id', user.id)
  ])

  return {
    profile: sanitizeProfileData(profile),
    children: children || [],
    recipients: recipients?.map(sanitizeRecipientData) || [],
    updates: updates?.map(sanitizeUpdateData) || [],
    responses: responses || [],
    exportDate: new Date().toISOString(),
    dataRetentionInfo: 'This export contains all your data as of the export date. Some data may be retained for legal compliance even after account deletion.'
  }
}

function sanitizeProfileData(profile: any) {
  // Remove sensitive fields that shouldn't be in export
  const { id, ...publicProfile } = profile || {}
  return publicProfile
}

function sanitizeRecipientData(recipient: any) {
  // Remove preference tokens and other sensitive data
  const { preference_token, ...publicRecipient } = recipient
  return publicRecipient
}

function sanitizeUpdateData(update: any) {
  return update
}

export function downloadDataExport(data: UserDataExport) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { 
    type: 'application/json' 
  })
  
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `tribe-data-export-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
```

### Account Deletion System
```typescript
// src/lib/account-deletion.ts
import { createClient } from '@/lib/supabase/client'

export interface DeletionOptions {
  deleteChildren: boolean
  deleteUpdates: boolean
  anonymizeData: boolean
  reason?: string
}

export async function initiateAccountDeletion(options: DeletionOptions) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  // Create deletion request record (for audit trail)
  const { error: requestError } = await supabase
    .from('account_deletion_requests')
    .insert({
      user_id: user.id,
      deletion_options: options,
      requested_at: new Date().toISOString(),
      status: 'pending'
    })

  if (requestError) throw requestError

  // Send confirmation email
  const { error: emailError } = await supabase.functions.invoke('send-deletion-confirmation', {
    body: { user_id: user.id, options }
  })

  if (emailError) console.warn('Failed to send deletion confirmation email:', emailError)

  return {
    message: 'Account deletion initiated. Please check your email to confirm within 7 days.',
    confirmationRequired: true
  }
}

export async function confirmAccountDeletion(token: string) {
  const supabase = createClient()
  
  // Verify deletion token and process deletion
  const { error } = await supabase.functions.invoke('confirm-account-deletion', {
    body: { confirmation_token: token }
  })

  if (error) throw error

  // Sign out user
  await supabase.auth.signOut()
  
  return { message: 'Account successfully deleted' }
}
```

## UI Components Implementation

### ProfileManager Component
```typescript
// src/app/dashboard/profile/page.tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { PersonalInfoForm } from '@/components/profile/PersonalInfoForm'
import { SecuritySettings } from '@/components/profile/SecuritySettings'
import { NotificationSettings } from '@/components/profile/NotificationSettings'
import { DataManagement } from '@/components/profile/DataManagement'
import { User, Shield, Bell, Database, Settings } from 'lucide-react'

export default function ProfilePage() {
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState('personal')

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'data', label: 'Data & Privacy', icon: Database },
    { id: 'preferences', label: 'Preferences', icon: Settings }
  ]

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your account information, security, and privacy settings.
        </p>
      </div>

      <div className="lg:flex lg:gap-8">
        {/* Tab Navigation */}
        <div className="lg:w-64 mb-6 lg:mb-0">
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {activeTab === 'personal' && (
              <PersonalInfoForm user={user} profile={profile} />
            )}
            {activeTab === 'security' && (
              <SecuritySettings user={user} />
            )}
            {activeTab === 'notifications' && (
              <NotificationSettings profile={profile} />
            )}
            {activeTab === 'data' && (
              <DataManagement user={user} />
            )}
            {activeTab === 'preferences' && (
              <PlatformPreferences profile={profile} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

### PersonalInfoForm Component
```typescript
// src/components/profile/PersonalInfoForm.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProfileManager } from '@/hooks/useProfileManager'
import { ProfilePhotoUpload } from './ProfilePhotoUpload'
import { TimezoneSelector } from './TimezoneSelector'
import { AlertCircle, Check } from 'lucide-react'

const personalInfoSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  email: z.string()
    .email('Invalid email address'),
  timezone: z.string().optional()
})

type PersonalInfoData = z.infer<typeof personalInfoSchema>

interface PersonalInfoFormProps {
  user: any
  profile: any
}

export function PersonalInfoForm({ user, profile }: PersonalInfoFormProps) {
  const { updateProfile, updateEmail, loading, error, successMessage } = useProfileManager()
  const [emailChangeRequested, setEmailChangeRequested] = useState(false)

  const form = useForm<PersonalInfoData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      name: profile?.name || '',
      email: user?.email || '',
      timezone: profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  })

  const handleSubmit = async (data: PersonalInfoData) => {
    const emailChanged = data.email !== user.email
    
    if (emailChanged) {
      const success = await updateEmail(data.email)
      if (success) {
        setEmailChangeRequested(true)
      }
    }

    // Update profile data (excluding email which is handled separately)
    if (data.name !== profile?.name || data.timezone !== profile?.timezone) {
      await updateProfile({
        name: data.name,
        timezone: data.timezone
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Personal Information</h2>
        <p className="text-gray-600 text-sm">
          Update your personal details and profile information.
        </p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <Check className="h-5 w-5 text-green-600" />
          <span className="text-green-800">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {emailChangeRequested && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">
            Please check your new email address and click the confirmation link to complete the email change.
          </p>
        </div>
      )}

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Profile Photo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Profile Photo
          </label>
          <ProfilePhotoUpload
            currentPhotoUrl={profile?.profile_photo_url}
            onPhotoUpdate={(url) => updateProfile({ profile_photo_url: url })}
          />
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <input
            {...form.register('name')}
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Your full name"
          />
          {form.formState.errors.name && (
            <p className="text-red-600 text-sm mt-1">{form.formState.errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            {...form.register('email')}
            type="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="your.email@example.com"
          />
          {form.formState.errors.email && (
            <p className="text-red-600 text-sm mt-1">{form.formState.errors.email.message}</p>
          )}
          <p className="text-gray-500 text-xs mt-1">
            Changing your email will require confirmation from your new email address.
          </p>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timezone
          </label>
          <TimezoneSelector
            value={form.watch('timezone')}
            onChange={(timezone) => form.setValue('timezone', timezone)}
          />
          <p className="text-gray-500 text-xs mt-1">
            Used for scheduling and displaying times correctly.
          </p>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading || !form.formState.isDirty}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
```

### SecuritySettings Component
```typescript
// src/components/profile/SecuritySettings.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProfileManager } from '@/hooks/useProfileManager'
import { Eye, EyeOff, Shield, Key, AlertTriangle } from 'lucide-react'

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

type PasswordChangeData = z.infer<typeof passwordChangeSchema>

export function SecuritySettings({ user }: { user: any }) {
  const { changePassword, loading, error, successMessage } = useProfileManager()
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })

  const form = useForm<PasswordChangeData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  })

  const handlePasswordChange = async (data: PasswordChangeData) => {
    const success = await changePassword(data.currentPassword, data.newPassword)
    if (success) {
      form.reset()
    }
  }

  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength += 25
    if (/[a-z]/.test(password)) strength += 25
    if (/[A-Z]/.test(password)) strength += 25
    if (/\d/.test(password)) strength += 25
    
    return {
      score: strength,
      label: strength < 50 ? 'Weak' : strength < 75 ? 'Good' : 'Strong',
      color: strength < 50 ? 'red' : strength < 75 ? 'yellow' : 'green'
    }
  }

  const passwordStrength = getPasswordStrength(form.watch('newPassword') || '')

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Security Settings</h2>
        <p className="text-gray-600 text-sm">
          Manage your account security and password settings.
        </p>
      </div>

      {/* Password Change Section */}
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Key className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium">Change Password</h3>
        </div>

        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-800">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={form.handleSubmit(handlePasswordChange)} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <div className="relative">
              <input
                {...form.register('currentPassword')}
                type={showPasswords.current ? 'text' : 'password'}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your current password"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.currentPassword && (
              <p className="text-red-600 text-sm mt-1">{form.formState.errors.currentPassword.message}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                {...form.register('newPassword')}
                type={showPasswords.new ? 'text' : 'password'}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter a strong password"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {form.watch('newPassword') && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        passwordStrength.color === 'red' ? 'bg-red-500' :
                        passwordStrength.color === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${passwordStrength.score}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    passwordStrength.color === 'red' ? 'text-red-600' :
                    passwordStrength.color === 'yellow' ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
              </div>
            )}
            
            {form.formState.errors.newPassword && (
              <p className="text-red-600 text-sm mt-1">{form.formState.errors.newPassword.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                {...form.register('confirmPassword')}
                type={showPasswords.confirm ? 'text' : 'password'}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm your new password"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.confirmPassword && (
              <p className="text-red-600 text-sm mt-1">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !form.formState.isValid}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Security Recommendations */}
      <div className="border border-yellow-200 rounded-lg p-6 bg-yellow-50">
        <div className="flex items-center gap-3 mb-3">
          <Shield className="h-5 w-5 text-yellow-600" />
          <h3 className="text-lg font-medium text-yellow-800">Security Recommendations</h3>
        </div>
        
        <ul className="space-y-2 text-sm text-yellow-700">
          <li>• Use a unique password that you don't use anywhere else</li>
          <li>• Consider using a password manager to generate and store strong passwords</li>
          <li>• Enable two-factor authentication when it becomes available</li>
          <li>• Regularly review your account activity</li>
        </ul>
      </div>

      {/* Account Created Info */}
      <div className="text-sm text-gray-500">
        <p>Account created: {new Date(user.created_at).toLocaleDateString()}</p>
        <p>Last sign in: {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Unknown'}</p>
      </div>
    </div>
  )
}
```

## Testing Strategy

### Profile Management Tests
1. **Personal Info Updates**:
   - Update name and verify changes persist
   - Change email and verify confirmation flow
   - Upload profile photo and verify display
   - Update timezone and verify in notifications

2. **Password Change Tests**:
   - Test with correct current password
   - Test with incorrect current password
   - Test password strength validation
   - Verify new password works for login

3. **Data Export Tests**:
   - Export data and verify completeness
   - Check JSON structure and sanitization
   - Verify file download functionality
   - Test export with different data volumes

### Security Testing
- Test form validation with various inputs
- Verify password requirements enforcement
- Check error handling for API failures
- Validate user can only access own profile data

### UI/UX Testing
- Test responsive design on mobile devices
- Verify tab navigation works smoothly
- Check loading states and error messages
- Validate accessibility with screen readers

## Success Criteria
- [ ] ✅ Users can edit all profile information successfully
- [ ] ✅ Password changes work securely with proper validation
- [ ] ✅ Profile photos upload and display correctly across app
- [ ] ✅ Email changes require proper verification flow
- [ ] ✅ Data export provides complete user data in JSON format
- [ ] ✅ Account deletion workflow works with proper confirmations
- [ ] ✅ All form validations prevent invalid data submission
- [ ] ✅ Mobile-responsive design works on all screen sizes
- [ ] ✅ Loading states and error handling provide good UX
- [ ] ✅ Security recommendations help users protect accounts

## Security Considerations
- Current password verification for sensitive changes
- Email confirmation for email address changes
- Secure password requirements and strength indicators
- Data sanitization in exports (remove sensitive tokens)
- Account deletion audit trail
- Rate limiting on password change attempts

## Privacy and GDPR Compliance
- Complete data export functionality
- Clear data retention policies
- Account deletion with data removal options
- Privacy settings and consent management
- User control over data sharing preferences

## Next Steps After Completion
- Ready for CRO-32 (Notification Management System)
- Profile system prepared for advanced features
- Security foundation set for enterprise features
- User data management compliant with privacy regulations