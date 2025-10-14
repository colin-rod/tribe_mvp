/**
 * Right Pane Components
 * CRO-298: Right Pane - Activity View Context
 * CRO-299: Right Pane - Other View Contexts
 *
 * Export all right pane components for easier imports
 */

// Main content router
export { RightPaneContent } from './RightPaneContent';

// View-specific right pane components
export { ActivityRightPane } from './ActivityRightPane';
export type { ActivityRightPaneProps } from './ActivityRightPane';

export { SummaryRightPane } from './SummaryRightPane';
export { RecipientsRightPane } from './RecipientsRightPane';
export { DraftsRightPane } from './DraftsRightPane';
export { SettingsRightPane } from './SettingsRightPane';

// Activity view specific components
export { FiltersPanel } from './FiltersPanel';
export type { FiltersPanelProps } from './FiltersPanel';

export { QuickStatsCard } from './QuickStatsCard';
export type { QuickStatsCardProps, ActivityStats } from './QuickStatsCard';

export { QuickActionsPanel } from './QuickActionsPanel';
export type { QuickActionsPanelProps } from './QuickActionsPanel';
export { ReflectionPromptsPanel } from './ReflectionPromptsPanel';
export type { ReflectionPromptsPanelProps } from './ReflectionPromptsPanel';

export { AISuggestionsPanel } from './AISuggestionsPanel';
export type { AISuggestionsPanelProps, AIPromptSuggestion } from './AISuggestionsPanel';

export { SummaryNarrative } from './SummaryNarrative';
export type { SummaryNarrativeProps } from './SummaryNarrative';

// Shared components
export { DetailCard, DetailRow } from './shared/DetailCard';
export { StatCard } from './shared/StatCard';
