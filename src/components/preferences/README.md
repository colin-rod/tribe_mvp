# Preference Components

This directory contains components for the magic link preference management system (CRO-22).

## Components

### PreferenceLayout.tsx
- Simple layout for preference pages without dashboard navigation
- Includes minimal header with Tribe branding
- Mobile-first responsive design
- Help and support contact information

### PreferenceForm.tsx
- Main form component for updating recipient preferences
- Features:
  - Frequency selection (radio buttons)
  - Channel preferences with validation (checkboxes)
  - Content type preferences (checkboxes)
  - Group defaults display and reset functionality
  - Real-time validation with error messages
  - Loading states and success feedback
  - Accessibility features (ARIA labels, focus management)

### index.ts
- Barrel export file for clean imports

## Routes

### /preferences/[token]/page.tsx
- Server component that validates tokens and fetches recipient data
- Redirects to 404 for invalid tokens
- Passes data to client component

### /preferences/[token]/PreferencesPageClient.tsx
- Client component handling the preference interface
- Success/thank you state management
- User-friendly explanations and contact information
- Security and privacy messaging

### /preferences/[token]/not-found.tsx
- Error page for invalid or expired preference tokens
- Clear explanation and next steps for users
- Support contact information

## Features

✅ Token-based authentication (no login required)
✅ Mobile-first responsive design
✅ Clear, family-friendly language
✅ Real-time form validation
✅ Group defaults display and reset
✅ Accessibility compliance (WCAG)
✅ Loading states and error handling
✅ Success confirmation page
✅ Security and privacy messaging

## Integration

- Uses `/lib/preference-links.ts` for data operations
- Uses `/lib/validation/recipients.ts` for form validation
- Integrates with existing UI component library
- Compatible with Supabase database schema