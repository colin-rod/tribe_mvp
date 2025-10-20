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
import { BreadcrumbProvider, Breadcrumbs } from '@/components/navigation/Breadcrumbs';

// Lazy load view components for better performance
const ActivityFeedView = React.lazy(() => import('@/components/views/ActivityFeedView'));
const DigestsView = React.lazy(() => import('@/components/views/DigestsView'));
const RecipientsView = React.lazy(() => import('@/components/views/RecipientsView'));
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
  const { activeItemId, pathname } = useNavigation();

  // Determine which view to render based on active navigation
  const renderView = () => {
    switch (activeItemId) {
      case 'activity':
        return <ActivityFeedView />;
      case 'summaries':
        return <DigestsView />;
      case 'recipients':
        return <RecipientsView />;
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
    <BreadcrumbProvider resetKey={pathname}>
      <div
        className={`flex-1 overflow-y-auto ${className}`}
        role="main"
        aria-label="Main content area"
      >
        <ViewErrorBoundary viewId={activeItemId || 'unknown'}>
          <Suspense fallback={<ViewLoadingState />}>
            <div className="animate-fade-in">
              <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur-sm">
                <Breadcrumbs className="px-4 py-4 sm:px-6 lg:px-8" />
              </div>
              {renderView()}
            </div>
          </Suspense>
        </ViewErrorBoundary>
      </div>
    </BreadcrumbProvider>
  );
}
