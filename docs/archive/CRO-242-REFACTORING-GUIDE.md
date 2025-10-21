# CRO-242 Invitation System - Refactoring Guide

## Current Status

### ✅ Completed
1. **All 5 API Routes** - Production ready, tested, lint + type-check passing
2. **Database Migration** - Executed and working
3. **Core Services** - invitationService, qrCodeService, email/SMS updates
4. **Frontend Structure** - All 7 components created with full logic
5. **Integration** - "Invite Recipients" button added to RecipientManager
6. **Partial Refactoring** - Fixed imports and Alert components

### ⚠️ Remaining Work

The frontend components need refactoring to use native HTML elements instead of shadcn/ui components. The codebase uses:
- Native `<label>`, `<input type="radio">`, `<input type="checkbox">`, `<select>` with Tailwind CSS
- No component library - just styled HTML elements
- Simple modal patterns with state management

## Files Requiring Refactoring

### 1. SendInvitationForm.tsx (Radio buttons)
**Location**: `src/components/invitations/SendInvitationForm.tsx`

**Replace this pattern**:
```tsx
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

<RadioGroup value={selectedChannel} onValueChange={setValue}>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="email" id="email" />
    <Label htmlFor="email">Email</Label>
  </div>
</RadioGroup>
```

**With this pattern** (see `src/components/preferences/PreferenceForm.tsx:157-194`):
```tsx
<fieldset>
  <legend className="sr-only">Delivery Method</legend>
  <div className="space-y-3">
    <div className="flex items-start">
      <div className="flex items-center h-5">
        <input
          id="channel-email"
          name="channel"
          type="radio"
          checked={selectedChannel === 'email'}
          onChange={() => setSelectedChannel('email')}
          className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
        />
      </div>
      <div className="ml-3 text-sm">
        <label htmlFor="channel-email" className="font-medium text-gray-700 cursor-pointer">
          Email
        </label>
      </div>
    </div>
    {/* Repeat for SMS and WhatsApp */}
  </div>
</fieldset>
```

###  2. InviteAcceptanceForm.tsx (Radio + Checkbox)
**Location**: `src/app/invite/[token]/InviteAcceptanceForm.tsx`

**Checkbox Pattern** (see `src/components/preferences/PreferenceForm.tsx:218-248`):
```tsx
<div className="flex items-start">
  <div className="flex items-center h-5">
    <input
      id="channel-email"
      name="channels"
      type="checkbox"
      checked={preferredChannels.includes('email')}
      onChange={(e) => handleChannelChange('email', e.target.checked)}
      className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
    />
  </div>
  <div className="ml-3 text-sm">
    <label htmlFor="channel-email" className="font-medium text-gray-700 cursor-pointer">
      Email
    </label>
  </div>
</div>
```

### 3. InvitationHistory.tsx (Select dropdowns)
**Location**: `src/components/invitations/InvitationHistory.tsx`

**Replace this**:
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

<Select value={typeFilter} onValueChange={setTypeFilter}>
  <SelectTrigger><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Types</SelectItem>
  </SelectContent>
</Select>
```

**With this** (see `src/components/admin/TemplateManager.tsx:78-86`):
```tsx
<select
  value={typeFilter}
  onChange={(e) => setTypeFilter(e.target.value)}
  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
>
  <option value="all">All Types</option>
  <option value="single_use">Single-use</option>
  <option value="reusable">Reusable</option>
</select>
```

### 4. QRCodeDisplay.tsx (Dialog → Modal)
**Location**: `src/components/invitations/QRCodeDisplay.tsx`

**Replace this**:
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

<Dialog open={true} onOpenChange={onClose}>
  <DialogContent>
    <DialogHeader><DialogTitle>QR Code</DialogTitle></DialogHeader>
    {/* content */}
  </DialogContent>
</Dialog>
```

**With this pattern** (see `src/components/ui/ConfirmationDialog.tsx` or create simple modal):
```tsx
{/* Backdrop */}
<div
  className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
  onClick={onClose}
>
  {/* Modal */}
  <div
    className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative"
    onClick={(e) => e.stopPropagation()}
  >
    {/* Close button */}
    <button
      onClick={onClose}
      className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    {/* Content */}
    <h3 className="text-lg font-semibold text-gray-900 mb-4">QR Code for Invitation Link</h3>
    {/* Rest of content */}
  </div>
</div>
```

### 5. ReusableLinkManager.tsx (Label only)
**Location**: `src/components/invitations/ReusableLinkManager.tsx`

Simple find/replace:
- `<Label htmlFor="...">Text</Label>` → `<label htmlFor="..." className="block text-sm font-medium text-gray-700 mb-1">Text</label>`

## Quick Refactoring Steps

1. **Run the auto-fix script**:
```bash
# Already completed - Alert and import fixes applied
```

2. **Manual refactoring order** (easiest to hardest):
   - ✅ InvitationManager.tsx - DONE (tabs replaced)
   - ReusableLinkManager.tsx - Just labels, 5 minutes
   - InvitationHistory.tsx - Select dropdowns, 10 minutes
   - SendInvitationForm.tsx - Radio buttons, 15 minutes
   - QRCodeDisplay.tsx - Modal pattern, 15 minutes
   - InviteAcceptanceForm.tsx - Radio + checkbox, 20 minutes

3. **Test after each file**:
```bash
npm run lint
npx tsc --noEmit | grep -E "(invitation|invite)"
```

## Reference Files

Copy patterns from these existing files:
- **Radio buttons**: `src/components/preferences/PreferenceForm.tsx:157-194`
- **Checkboxes**: `src/components/preferences/PreferenceForm.tsx:218-248`
- **Select dropdowns**: `src/components/admin/TemplateManager.tsx:78-86`
- **Modal/Dialog**: `src/components/ui/ConfirmationDialog.tsx:49-110`
- **Form labels**: `src/components/ui/FormFieldWrapper.tsx:42-61`

## Estimated Time

- Total refactoring time: ~1.5 hours
- Testing: 30 minutes
- **Total to completion**: 2 hours

## Alternative: Simplified MVP

If time is constrained, you can:
1. Comment out the problematic components temporarily
2. Keep only the working parts (API routes, backend)
3. Add a simple "Copy link" feature using just buttons and inputs
4. Defer full UI to next sprint

The backend is 100% ready and can be tested via API calls or Postman.
