# Memory Book Quick Actions

## Overview

The Memory Book right pane now exposes three fully-functional quick actions that provide parents with fast access to printing, exporting, and sharing their curated summaries. This document captures the user flows, technical hooks, and integration points for each action.

---

## Print Memory Book

**Flow**
1. User selects **Print Memory Book** from the right pane.
2. We open a dedicated `/dashboard/memory-book/print` route in a new tab.
3. The route loads all `sent` summaries, renders a print-optimized layout, and automatically triggers the browser print dialog once content is ready.

**Implementation Notes**
- The print route reuses `getSummaries()` and filters to `sent` status.
- If no sent summaries exist the page surfaces a retry state.
- Additional print-only styling removes navigation chrome and enforces page breaks between weeks.

---

## Export as PDF

**Flow**
1. User selects **Export as PDF**.
2. The client issues a `POST /api/memory-book/export` request.
3. The API authenticates via Supabase, gathers all sent summaries, and streams a generated PDF back to the browser.
4. The browser triggers a download using an object URL and revokes it after completion.

**Implementation Notes**
- The export endpoint is implemented as a Next.js Route Handler and runs in the Node.js runtime.
- PDF content is generated server-side (no client-side printing dependency) to comply with retention policies.
- Responses include a timestamped filename and descriptive error payloads for user feedback.

---

## Share Memory Book

**Flow**
1. User selects **Share Memory Book**.
2. The client calls `POST /api/memory-book/share` to assemble the latest summary metadata.
3. The handler returns share copy plus a canonical Memory Book URL based on `NEXT_PUBLIC_APP_URL`.
4. The client prioritizes the Web Share API for native app distribution; when unavailable it falls back to launching the default mail client with a pre-filled message.

**Implementation Notes**
- The share endpoint pulls the most recent sent summary to contextualize the share text.
- We integrate both social (Web Share API) and email modules (mailto fallback) to cover device diversity.
- Abort/cancel flows from the Web Share API surface clear feedback to the user.

---

## User Feedback & Error Handling

All quick actions surface success and failure states using the existing `sonner` toast system. Network and pop-up errors are captured with descriptive copy so support teams can triage issues quickly.

---

## Testing

`src/components/layout/rightPane/__tests__/MemoryBookRightPane.test.tsx` covers the critical paths:
- Opening the print view and toast confirmation.
- Successful PDF exports and associated cleanup.
- Error propagation from the export endpoint.
- Email fallback and Web Share API happy path for sharing.

Run `npm test -- MemoryBookRightPane` to execute the suite.
