/**
 * MiddlePane Component
 * CRO-296: Middle Pane - Content Router
 *
 * Dynamic content area that renders different views based on active navigation
 */

'use client';

import React, { Suspense } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import { ViewLoadingState } from './ViewLoadingState';
import { ViewErrorBoundary } from './ViewErrorBoundary';

// Lazy load view components for better performance
const ActivityFeedView = React.lazy(() => import('@/components/views/ActivityFeedView'));
const DigestsView = React.lazy(() => import('@/components/views/DigestsView'));
const ChildrenView = React.lazy(() => import('@/components/views/ChildrenView'));
const RecipientsView = React.lazy(() => import('@/components/views/RecipientsView'));
const GroupsView = React.lazy(() => import('@/components/views/GroupsView'));
const DraftsView = React.lazy(() => import('@/components/views/DraftsView'));
const SettingsView = React.lazy(() => import('@/components/views/SettingsView'));

export interface MiddlePaneProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * MiddlePane - Content router for the 3-pane layout
 *
 * Handles:
 * - Dynamic content rendering based on active navigation
 * - Suspense-based loading states
 * - Error boundaries per view
 * - Smooth transitions between views
 */
export function MiddlePane({ className = '' }: MiddlePaneProps) {
  const { activeItemId } = useNavigation();

  // Determine which view to render based on active navigation
  const renderView = () => {
    switch (activeItemId) {
      case 'activity':
        return <ActivityFeedView />;
      case 'digests':
        return <DigestsView />;
      case 'children':
        return <ChildrenView />;
      case 'recipients':
        return <RecipientsView />;
      case 'groups':
        return <GroupsView />;
      case 'drafts':
        return <DraftsView />;
      case 'settings':
        return <SettingsView />;
      default:
        // Default to activity feed
        return <ActivityFeedView />;
    }
  };

  return (
    <div
      className={`flex-1 overflow-y-auto ${className}`}
      role="main"
      aria-label="Main content area"
    >
      <ViewErrorBoundary viewId={activeItemId || 'unknown'}>
        <Suspense fallback={<ViewLoadingState />}>
          <div className="animate-fade-in">
            {renderView()}
          </div>
        </Suspense>
      </ViewErrorBoundary>
    </div>
  );
}
