# Email Distribution System

A comprehensive email distribution system for the Tribe MVP platform, enabling parents to send baby updates to family members via email with real-time delivery tracking.

## 🚀 Features

- **Intelligent Email Distribution**: Send personalized emails to selected recipients via Supabase Edge Functions
- **Real-time Delivery Tracking**: Monitor email delivery status with live updates using Supabase real-time subscriptions
- **Recipient Management**: Select recipients with email preferences and channel filtering
- **Email Preview**: Preview emails in mobile and desktop formats before sending
- **Step-by-step Workflow**: Guided sending process with recipient selection, preview, and confirmation
- **Error Handling**: Comprehensive error handling and user feedback
- **TypeScript Support**: Full TypeScript interfaces and type safety
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support

## 📁 Components Overview

### 1. **useEmailDistribution Hook** (`src/hooks/useEmailDistribution.ts`)
React hook for managing email distribution state and calling the Edge Function.

```typescript
const { distributeUpdate, loading, error, success, deliveryJobs, resetState } = useEmailDistribution()

// Send update to recipients
const result = await distributeUpdate({
  update_id: 'update_123',
  recipient_ids: ['recipient_1', 'recipient_2']
})
```

**Features:**
- State management for loading, success, error states
- Calls `distribute-email` Supabase Edge Function
- Returns delivery job information
- Error handling with user-friendly messages

### 2. **DeliveryStatusBadge Component** (`src/components/ui/DeliveryStatusBadge.tsx`)
Visual status indicators for email delivery states.

```typescript
<DeliveryStatusBadge
  status="delivered"
  size="md"
  showIcon={true}
/>
```

**Status Types:**
- `queued` - Email queued for sending (gray)
- `sent` - Email sent via SendGrid (blue)
- `delivered` - Email delivered to recipient (green)
- `failed` - Email delivery failed (red)

### 3. **DeliveryStatus Component** (`src/components/updates/DeliveryStatus.tsx`)
Real-time delivery status tracking with Supabase subscriptions.

```typescript
<DeliveryStatus
  updateId="update_123"
  onStatusChange={(jobs) => console.log('Status updated:', jobs)}
/>
```

**Features:**
- Real-time updates via Supabase subscriptions
- Shows delivery timeline and timestamps
- Error message display for failed deliveries
- Recipient details with contact information
- Summary statistics (total, delivered, sent, failed)

### 4. **EmailPreview Component** (`src/components/updates/EmailPreview.tsx`)
Preview email content with mobile/desktop responsive views.

```typescript
<EmailPreview
  updateContent="Your update content..."
  milestoneType="first_steps"
  mediaUrls={['photo1.jpg', 'video1.mp4']}
  childName="Emma"
  childBirthDate="2022-12-15"
  childPhotoUrl="profile.jpg"
  recipientName="Grandma Mary"
  recipientRelationship="grandmother"
/>
```

**Features:**
- Mobile and desktop preview modes
- Personalized greeting and content
- Media attachment display
- Milestone-specific styling
- Responsive design testing

### 5. **SendUpdateModal Component** (`src/components/updates/SendUpdateModal.tsx`)
Complete modal workflow for email distribution.

```typescript
<SendUpdateModal
  updateId="update_123"
  updateContent="Update content..."
  milestoneType="first_steps"
  mediaUrls={['photo.jpg']}
  childName="Emma"
  childBirthDate="2022-12-15"
  childPhotoUrl="profile.jpg"
  onClose={() => setShowModal(false)}
  onSent={() => console.log('Update sent!')}
/>
```

**Workflow Steps:**
1. **Recipient Selection**: Choose from active recipients with email addresses
2. **Email Preview**: Preview how the email will look to recipients
3. **Send Confirmation**: Send emails and show progress
4. **Delivery Tracking**: Real-time status updates

## 🔧 Integration Guide

### Step 1: Import Components
```typescript
import {
  SendUpdateModal,
  DeliveryStatus,
  EmailPreview
} from '@/components/updates'
import { useEmailDistribution } from '@/hooks/useEmailDistribution'
```

### Step 2: Basic Usage in Update Creation
```typescript
function UpdateCreationPage() {
  const [showSendModal, setShowSendModal] = useState(false)
  const [updateData, setUpdateData] = useState(null)

  const handleSendUpdate = () => {
    setShowSendModal(true)
  }

  return (
    <div>
      {/* Your update creation form */}
      <Button onClick={handleSendUpdate}>
        Send Update
      </Button>

      {showSendModal && updateData && (
        <SendUpdateModal
          updateId={updateData.id}
          updateContent={updateData.content}
          milestoneType={updateData.milestone_type}
          mediaUrls={updateData.media_urls}
          childName={updateData.child.name}
          childBirthDate={updateData.child.birth_date}
          childPhotoUrl={updateData.child.profile_photo_url}
          onClose={() => setShowSendModal(false)}
          onSent={() => {
            console.log('Update sent successfully!')
            setShowSendModal(false)
          }}
        />
      )}
    </div>
  )
}
```

### Step 3: Dashboard Integration
```typescript
function UpdateDashboard() {
  return (
    <div>
      {updates.map(update => (
        <div key={update.id} className="update-card">
          {/* Update content */}

          {/* Show delivery status if update was sent */}
          {update.is_sent && (
            <DeliveryStatus updateId={update.id} />
          )}
        </div>
      ))}
    </div>
  )
}
```

## 🗃️ Database Schema

### delivery_jobs Table
```sql
CREATE TABLE delivery_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id UUID REFERENCES updates(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES recipients(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
  external_id TEXT, -- SendGrid message ID
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_delivery_jobs_update_id ON delivery_jobs(update_id);
CREATE INDEX idx_delivery_jobs_recipient_id ON delivery_jobs(recipient_id);
CREATE INDEX idx_delivery_jobs_status ON delivery_jobs(status);
```

### updates Table (additions)
```sql
-- Add is_sent column to track if update has been distributed
ALTER TABLE updates ADD COLUMN is_sent BOOLEAN DEFAULT FALSE;
```

## 🔗 Backend Integration

### Edge Function: distribute-email
Location: `supabase/functions/distribute-email/index.ts`

**Input:**
```typescript
{
  update_id: string,
  recipient_ids: string[]
}
```

**Output:**
```typescript
{
  success: boolean,
  delivery_jobs?: DeliveryJobInfo[],
  error?: string
}
```

**Features:**
- Validates recipient email addresses and preferences
- Generates personalized email content using templates
- Sends emails via SendGrid API
- Creates delivery job records for tracking
- Handles errors and provides detailed feedback

### Real-time Subscriptions
The system uses Supabase real-time subscriptions to track delivery status changes:

```typescript
const subscription = supabase
  .channel(`delivery_jobs_${updateId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'delivery_jobs',
    filter: `update_id=eq.${updateId}`
  }, (payload) => {
    // Handle real-time updates
  })
  .subscribe()
```

## 🎨 Styling and Design

### Design System Integration
- Uses existing Button, Input, LoadingSpinner components
- Follows established Tailwind CSS patterns
- Consistent with existing modal patterns (see EditChildModal)
- Responsive design with mobile-first approach

### Color Coding
- **Queued**: Gray (`bg-gray-100`, `text-gray-800`)
- **Sent**: Blue (`bg-blue-100`, `text-blue-800`)
- **Delivered**: Green (`bg-green-100`, `text-green-800`)
- **Failed**: Red (`bg-red-100`, `text-red-800`)

## ♿ Accessibility Features

- **ARIA Labels**: All interactive elements have appropriate labels
- **Keyboard Navigation**: Full keyboard support for all interactions
- **Screen Reader Support**: Status announcements and content descriptions
- **Focus Management**: Proper focus flow and visual indicators
- **Color Contrast**: WCAG compliant color combinations
- **Semantic HTML**: Proper heading hierarchy and landmark regions

## 🧪 Testing Considerations

### Unit Tests
```typescript
// Example test for useEmailDistribution hook
describe('useEmailDistribution', () => {
  test('should send update successfully', async () => {
    const { result } = renderHook(() => useEmailDistribution())

    await act(async () => {
      const response = await result.current.distributeUpdate({
        update_id: 'test_update',
        recipient_ids: ['test_recipient']
      })

      expect(response.success).toBe(true)
    })
  })
})
```

### Integration Tests
- Test email sending workflow end-to-end
- Verify real-time subscription functionality
- Test error handling and edge cases
- Validate recipient filtering logic

## 📱 Mobile Responsiveness

- **SendUpdateModal**: Responsive layout with mobile-optimized spacing
- **EmailPreview**: Mobile/desktop preview toggle for testing
- **DeliveryStatus**: Compact mobile layout with stacked information
- **Recipient Selection**: Touch-friendly checkboxes and tap targets

## 🔒 Security Considerations

- **Input Validation**: All user inputs are validated
- **Authentication**: All operations require authenticated users
- **Authorization**: Users can only send updates for their own children
- **Rate Limiting**: Implement rate limiting in Edge Functions
- **Email Validation**: Robust email address validation
- **XSS Prevention**: All user content is properly escaped

## 🚀 Performance Optimizations

- **Lazy Loading**: Components are loaded only when needed
- **Memoization**: Expensive calculations are memoized
- **Efficient Queries**: Optimized database queries with proper indexes
- **Real-time Subscriptions**: Minimal subscription scope for efficiency
- **Image Optimization**: Lazy loading for media previews

## 📈 Analytics and Monitoring

Consider implementing:
- Email delivery rate tracking
- User engagement metrics
- Error rate monitoring
- Performance metrics (send time, delivery time)
- A/B testing for email templates

## 🔄 Future Enhancements

1. **SMS Support**: Extend system to support SMS distribution
2. **Email Templates**: Multiple email template options
3. **Scheduling**: Schedule emails for future delivery
4. **Bulk Operations**: Send to multiple recipient groups
5. **Email Analytics**: Open rates, click tracking
6. **Offline Support**: Queue emails when offline
7. **Push Notifications**: Native mobile push notifications

## 📚 Example Usage

See `/examples/EmailDistributionUsage.tsx` for a complete working example demonstrating all components and features.

## 🛠️ Development Setup

1. Ensure Supabase Edge Functions are deployed
2. Configure SendGrid API credentials
3. Set up real-time subscriptions
4. Import components and hooks as needed
5. Follow the integration guide above

## 📝 Notes

- All components follow existing codebase patterns
- TypeScript interfaces ensure type safety
- Error handling provides user-friendly feedback
- Real-time updates enhance user experience
- Mobile-responsive design works across devices
- Accessibility features ensure inclusive design