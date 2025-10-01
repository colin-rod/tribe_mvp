# Digest Frontend Implementation

## Overview

This document describes the frontend implementation for displaying AI-generated digest narratives (CRO-267 continuation). The backend was already implemented with AI narrative generation, and this work adds the UI components to beautifully display those narratives to users.

## What Was Built

### 1. Core Components

#### `DigestNarrativeView.tsx`
- **Purpose**: Displays recipient-facing AI-generated narratives
- **Features**:
  - Large, readable typography (18px, 1.75 line height)
  - Distinct styling for intro, narrative, and closing sections
  - Media references displayed as clickable cards with icons
  - AI attribution footer
  - Warm orange/amber color scheme

#### `EmailPreview.tsx`
- **Purpose**: Safe iframe rendering of email HTML previews
- **Features**:
  - Sandboxed iframe for security
  - Fullscreen mode for detailed review
  - Subject line display
  - Matches actual email recipient will receive

#### `ParentNarrativeView.tsx`
- **Purpose**: Print-ready display of parent archival narratives
- **Features**:
  - Serif fonts (Georgia) for elegance
  - Cover page with child photo
  - Print-optimized layout with page breaks
  - Media gallery grid
  - "Print to PDF" button
  - Signature section

### 2. Updated Components

#### `RecipientDigestPreview.tsx`
- Added narrative/list view toggle
- Shows `DigestNarrativeView` by default when narrative exists
- Collapsible "Individual Updates" section
- Integrated `EmailPreview` component
- Removed unsafe HTML rendering in favor of iframe

### 3. New Pages

#### `/dashboard/digests/[id]/parent-view`
- **Purpose**: Dedicated page for parent archival narrative
- **Features**:
  - Full-page print-ready layout
  - Navigation back to digest preview
  - Auto-extraction of child name and date range
  - Print CSS optimizations

### 4. Updated Pages

#### `/dashboard/digests/[id]/preview`
- Added "View Parent Archival Story" button
- Shows AI narrative count stat
- Enhanced header with narrative indicators

### 5. Utilities

#### `src/lib/utils/emailTemplates.ts`
- **Purpose**: Frontend version of backend email template renderer
- **Function**: `renderRecipientDigestEmail()`
- Generates HTML email preview from narrative data
- Matches backend template styling exactly
- Used by `EmailPreview` component

## User Experience Flow

### Viewing Recipient Narratives

1. Parent compiles digest → AI generates narratives
2. Navigate to digest preview page
3. Select recipient from sidebar
4. **Default View**: Beautiful narrative display
   - Warm intro greeting
   - Cohesive narrative weaving updates together
   - Media references as clickable cards
   - Warm closing message
5. **Toggle to List View**: See individual updates
6. **Email Preview**: See exact email recipient will receive
7. **Collapsible Updates**: Expand to see source updates

### Viewing Parent Archival Narrative

1. From digest preview, click "View Parent Archival Story"
2. See print-ready document with:
   - Cover page with child photo and title
   - Detailed chronological narrative
   - Media gallery
   - Warm closing and signature
3. Click "Print to PDF" to save or print

## Technical Details

### Data Flow

```
Database (digests table)
├─ parent_narrative (JSONB) → ParentNarrativeView
└─ digest_updates table
   └─ narrative_data (JSONB) → DigestNarrativeView

digestService.getDigestPreview()
├─ Fetches digest with parent_narrative
├─ Fetches digest_updates with narrative_data
└─ Returns DigestPreviewData with narratives

RecipientDigestPreview
├─ Renders DigestNarrativeView (recipient.narrative)
└─ Renders EmailPreview (renderRecipientDigestEmail())
```

### Type Definitions

All types already exist in `src/lib/types/digest.ts`:
- `DigestNarrative` - Recipient-facing narrative
- `ParentDigestNarrative` - Parent-facing archival narrative
- `MediaReference` - Media embedded in narratives
- `RecipientDigestPreview` - Includes optional `narrative` field

### Styling Approach

**Recipient Narratives**:
- Modern, warm design
- Orange/amber gradients
- Sans-serif fonts (system fonts)
- Optimized for screen reading

**Parent Narratives**:
- Classic, elegant design
- Serif fonts (Georgia)
- Print-optimized
- Suitable for memory books

## Files Created

1. `src/components/digests/DigestNarrativeView.tsx` - Recipient narrative component
2. `src/components/digests/EmailPreview.tsx` - Email preview iframe
3. `src/components/digests/ParentNarrativeView.tsx` - Parent archival component
4. `src/lib/utils/emailTemplates.ts` - Email template renderer
5. `src/app/dashboard/digests/[id]/parent-view/page.tsx` - Parent narrative page

## Files Modified

1. `src/components/digests/RecipientDigestPreview.tsx` - Added narrative display
2. `src/app/dashboard/digests/[id]/preview/page.tsx` - Added parent view button

## Testing Checklist

- [x] Components compile without TypeScript errors
- [ ] Narrative view renders correctly with real data
- [ ] View toggle (narrative/list) works smoothly
- [ ] Email preview displays in iframe correctly
- [ ] Parent narrative page loads and displays
- [ ] Print to PDF works from parent narrative view
- [ ] Responsive layout works on mobile
- [ ] Accessibility: keyboard navigation and screen readers
- [ ] Empty states: no narrative available
- [ ] Loading states during digest compilation

## Future Enhancements

1. **Narrative Editing**: Allow parents to edit AI-generated narratives
2. **Send Test Email**: Button to send actual test email to parent
3. **Share Archival PDF**: Direct PDF export without print dialog
4. **Narrative Regeneration**: Re-run AI if parent doesn't like it
5. **Multiple Formats**: Export as Word doc, Markdown, etc.
6. **Narrative Comparison**: Show before/after if regenerated
7. **Media Gallery**: Enhanced gallery view in parent narrative
8. **Print Preview**: Show exactly how it will print before printing

## Related Documentation

- [docs/digest-narrative-workflow.md](./digest-narrative-workflow.md) - Backend AI workflow
- Backend template: `supabase/functions/_shared/digest-templates.ts`
- Backend AI functions: `supabase/functions/_shared/digest-ai.ts`
- Database migration: `supabase/migrations/20251001000004_add_digest_narratives.sql`

## Performance Considerations

- Email preview iframe is sandboxed for security
- Narrative text uses `whitespace: pre-wrap` to preserve formatting
- Print CSS uses page breaks to prevent awkward splits
- Images in parent narrative should be optimized
- Long narratives may need scroll optimization

## Accessibility

- Semantic HTML structure (h1, h2, p tags)
- ARIA labels on interactive elements
- Keyboard navigation support
- Print-friendly high contrast
- Screen reader friendly text
- Focus indicators on buttons
