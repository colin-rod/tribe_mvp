# CRO-265 Scope: Loading States and Micro-interactions

## Overview
- **Priority**: P2 (Medium)
- **Type**: User Experience
- **Problem**: Users receive little to no feedback when the application is busy processing async tasks. This creates uncertainty, repeat actions, and a lack of polish that erodes confidence.

## Objectives
1. Provide immediate, context-aware loading feedback for async flows across the product.
2. Introduce subtle micro-interactions that reinforce responsiveness without harming performance or accessibility.
3. Standardize success and error feedback so that users trust that actions completed (or failed) reliably.

## Success Metrics
- ✅ All critical async flows display skeletons, spinners, or progress indicators within 200 ms of triggering.
- ✅ Form submissions disable actionable controls and show progress feedback until completion.
- ✅ Hover and focus states exist for primary interactive components with 150–250 ms transitions.
- ✅ Toast notifications (success + error) fire for all mutations in monitored funnels (Create Update, Recipients, Settings) with copy pulled from existing UX guidelines.
- ✅ No Lighthouse performance or accessibility regression (>2 point drop) after implementation.

## In-Scope Experience Areas
| Area | Key Interactions | Required Feedback |
| --- | --- | --- |
| **Dashboard Updates Feed** | Initial load, filters, pagination, refresh | Skeleton cards, infinite-scroll "Loading more" indicator, button spinners |
| **Create / Edit Update Flow** | AI suggestions, file uploads, form submission | Section skeletons, upload progress bars, button loading states, blocking overlay |
| **Recipients Management** | List fetch, add/update recipient, bulk actions | Table skeletons, row-level progress, disabled bulk controls |
| **Settings Pages** | Section fetch, toggles, webhooks actions | Inline skeletons, toggle debounce animation, toast notifications |
| **Global Navigation** | Page transitions, search modal | Next.js `loading.tsx` fallbacks, search field spinner |

## Out of Scope
- Backend performance tuning beyond providing loading hooks.
- Replacing the existing toast provider (reuse or extend current solution).
- Custom animation redesigns unrelated to feedback (e.g., marketing visuals).

## Dependencies & Inputs
- Audit of current async calls (instrumentation via React Query and Supabase mutations).
- Confirmation of design tokens for motion (duration, easing) from design system.
- Review existing toast provider (likely `sonner` or Chakra `useToast` depending on codebase) to confirm API.
- Verify accessibility checklist with product design (ARIA labels, reduced motion preferences).

## Implementation Plan
1. **Foundation Audit (1–2 days)**
   - Inventory async flows using `rg` for `useQuery`, `useMutation`, `fetch`, `supabase` calls.
   - Document missing loading/error handling per component.
   - Align with design on skeleton layouts and transition tokens.

2. **Component Library Enhancements (2–3 days)**
   - Build reusable primitives in `src/components/ui`:
     - `<Skeleton variants="card|table|text" />`
     - `<LoadingOverlay message />`
     - `<ProgressBar variant="linear|circular" />`
     - `<ToastProvider />` additions for success/error defaults.
   - Ensure components respect `prefers-reduced-motion` and expose ARIA attributes.

3. **Integrate Loading States (3–4 days)**
   - Dashboard: add skeleton placeholders in data fetching boundary, integrate infinite scroll indicator.
   - Create/Update flows: wrap forms in submission state manager, wire upload progress from Supabase storage hooks.
   - Recipients: add table skeleton and disable bulk controls while `isMutating`.
   - Settings + Misc pages: plug in skeletons for server components, add nav-level fallback.

4. **Micro-interactions & Transitions (1–2 days)**
   - Apply Tailwind/Framer Motion transitions to buttons, cards, and hover states (150–200 ms ease-out).
   - Add focus-visible outlines with soft scale (max 1.02) for primary cards.
   - Respect reduced-motion preferences; use opacity fades instead of transforms when enabled.

5. **Toast Notifications (0.5–1 day)**
   - Centralize mutation success/error handling to trigger toasts (wrap React Query `onSuccess/onError`).
   - Define message templates per domain ("Update published", "Recipients synced", etc.).
   - Ensure toasts auto-dismiss (5–6s) and are focus-trap accessible.

6. **QA & Accessibility Review (1 day)**
   - Manual walkthrough of flows on slow network using Chrome DevTools throttling.
   - Screen reader smoke test (VoiceOver/NVDA) verifying announcements.
   - Run automated checks: `pnpm lint`, `pnpm test`, `pnpm test:e2e` (if configured), Lighthouse quick run.

## Acceptance Criteria Traceability
| Acceptance Criterion | Coverage in Plan |
| --- | --- |
| Add skeleton loading states for async content | Steps 2 & 3: Skeleton primitives + integration |
| Implement smooth transitions and animations | Step 4: Motion tokens and hover/focus updates |
| Add hover and focus micro-interactions | Step 4: Focus outlines, scale, transitions |
| Create loading indicators for form submissions | Steps 2 & 3: Loading overlay & button states |
| Add success/error toast notifications | Step 5: Toast standardization |

## Risks & Mitigations
- **Risk**: Skeletons increase bundle size. **Mitigation**: Tree-shake components, lazy load large skeletons.
- **Risk**: Animations impact performance. **Mitigation**: Keep transitions under 200 ms, avoid expensive CSS properties.
- **Risk**: Toast spam during batch operations. **Mitigation**: Debounce notifications, summarize when >3 operations.
- **Risk**: Accessibility regressions. **Mitigation**: Pair with accessibility checklist, ensure ARIA live regions.

## Estimation
- **Total Effort**: ~8–12 engineering days (single FE engineer) + 0.5 design day for skeleton/motion review.
- **Suggested Staffing**: 1 senior FE owning implementation, QA/Design support for review cycles.

