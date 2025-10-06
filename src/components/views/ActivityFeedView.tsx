/**
 * ActivityFeedView Component
 * CRO-296: Middle Pane - Content Router
 *
 * Main activity feed view - migrated from dashboard page
 */

'use client';

import { useEffect, useState, memo, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createLogger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { getChildren } from '@/lib/children';
import { getRecipientStats } from '@/lib/recipients';
import { getGroupStats } from '@/lib/recipient-groups';
import { getUpdates } from '@/lib/updates';
import { needsOnboarding, getOnboardingStatus, dismissOnboarding } from '@/lib/onboarding';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { UserPlusIcon, UserGroupIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { UpdatesList } from '@/components/updates';
import EnhancedOnboardingProgress from '@/components/dashboard/EnhancedOnboardingProgress';
import EmptyTimelineState from '@/components/dashboard/EmptyTimelineState';
import { useCreateUpdateModal } from '@/hooks/useCreateUpdateModal';
import { useActivityFilters } from '@/hooks/useActivityFilters';
import { FiltersPanel } from '@/components/layout/rightPane/FiltersPanel';
import type { UpdateType } from '@/components/updates/CreateUpdateModal';
import { DashboardActionsProvider } from '@/contexts/DashboardActionsContext';

const logger = createLogger('ActivityFeedView');

const ActivityFeedView = memo(function ActivityFeedView() {
  const { user } = useAuth();
  const router = useRouter();
  const [childrenCount, setChildrenCount] = useState(0);
  const [showDigestSentAlert, setShowDigestSentAlert] = useState(false);
  const [showDigestScheduledAlert, setShowDigestScheduledAlert] = useState(false);
  const [recipientStats, setRecipientStats] = useState({ total: 0, active: 0, groups: 0 });
  const [updatesCreated, setUpdatesCreated] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingOnboarding, setLoadingOnboarding] = useState(true);
  const [showOnboardingProgress, setShowOnboardingProgress] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  // Enable scroll restoration for this view
  useScrollRestoration({ viewKey: 'activity' });

  // Activity filters
  const {
    filters,
    setDateRange,
    setChildIds,
    setUpdateTypes,
    setSearchQuery,
    clearFilters,
    activeFilterCount,
  } = useActivityFilters();

  // Mock onboarding steps
  const onboardingSteps = useMemo(() => [
    {
      id: 'add-child',
      title: 'Add Your First Child',
      description: 'Tell us about your little one to personalize your updates',
      icon: UserPlusIcon,
      estimatedTimeMinutes: 3,
      isRequired: true,
      isCompleted: childrenCount > 0,
      isSkipped: false,
      isCurrent: childrenCount === 0,
      completedAt: childrenCount > 0 ? new Date() : undefined,
    },
    {
      id: 'invite-recipients',
      title: 'Invite Family & Friends',
      description: 'Add recipients who will receive your updates',
      icon: UserGroupIcon,
      estimatedTimeMinutes: 5,
      isRequired: true,
      isCompleted: recipientStats.total > 0,
      isSkipped: false,
      isCurrent: childrenCount > 0 && recipientStats.total === 0,
      completedAt: recipientStats.total > 0 ? new Date() : undefined,
    },
    {
      id: 'create-first-update',
      title: 'Share Your First Update',
      description: 'Create and send your first update to your family',
      icon: SparklesIcon,
      estimatedTimeMinutes: 2,
      isRequired: true,
      isCompleted: updatesCreated > 0,
      isSkipped: false,
      isCurrent: childrenCount > 0 && recipientStats.total > 0 && updatesCreated === 0,
      completedAt: updatesCreated > 0 ? new Date() : undefined,
    },
  ], [childrenCount, recipientStats.total, updatesCreated]);

  useEffect(() => {
    // Check for digest success query params
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('digest_sent') === 'true') {
        setShowDigestSentAlert(true);
        window.history.replaceState({}, '', '/dashboard');
        setTimeout(() => setShowDigestSentAlert(false), 5000);
      }
      if (urlParams.get('digest_scheduled') === 'true') {
        setShowDigestScheduledAlert(true);
        window.history.replaceState({}, '', '/dashboard');
        setTimeout(() => setShowDigestScheduledAlert(false), 5000);
      }
    }
  }, []);

  const checkOnboardingStatus = useCallback(async () => {
    try {
      setLoadingOnboarding(true);

      const needsOnboard = await needsOnboarding();
      if (needsOnboard) {
        router.push('/onboarding');
        return;
      }

      const onboardingStatus = await getOnboardingStatus();
      if (onboardingStatus) {
        setHasCompletedOnboarding(onboardingStatus.onboarding_completed || false);
        setOnboardingDismissed(onboardingStatus.onboarding_skipped || false);

        const shouldShow = !onboardingStatus.onboarding_completed && !onboardingStatus.onboarding_skipped;
        setShowOnboardingProgress(shouldShow);
      }
    } catch (error) {
      logger.errorWithStack('Error checking onboarding status:', error as Error);
    } finally {
      setLoadingOnboarding(false);
    }
  }, [router]);

  const loadDashboardStats = useCallback(async () => {
    try {
      setLoadingStats(true);

      const [children, recipientStatsData, groupStatsData, updates] = await Promise.all([
        getChildren(),
        getRecipientStats(),
        getGroupStats(),
        getUpdates()
      ]);

      setChildrenCount(children.length);
      setRecipientStats({
        total: recipientStatsData.totalRecipients,
        active: recipientStatsData.activeRecipients,
        groups: groupStatsData.totalGroups
      });

      const totalUpdates = updates.length;
      setUpdatesCreated(totalUpdates);
    } catch (error) {
      logger.errorWithStack('Error loading dashboard stats:', error as Error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    }
  }, [user, checkOnboardingStatus]);

  useEffect(() => {
    if (user) {
      loadDashboardStats();
    }
  }, [user, loadDashboardStats]);

  const {
    openCreateUpdateModal,
    createUpdateModal
  } = useCreateUpdateModal({
    onUpdateSent: loadDashboardStats,
    onUpdateScheduled: loadDashboardStats
  });

  const handleCreateUpdate = useCallback((type: UpdateType = 'photo', initialContent?: string) => {
    openCreateUpdateModal(type, initialContent);
  }, [openCreateUpdateModal]);

  const handleCompileDigest = useCallback(() => {
    router.push('/dashboard/digests/compile');
  }, [router]);

  const handleOnboardingStepClick = useCallback((stepId: string) => {
    switch (stepId) {
      case 'add-child':
        router.push('/dashboard/children');
        break;
      case 'invite-recipients':
        router.push('/dashboard/recipients');
        break;
      case 'create-first-update':
        openCreateUpdateModal('photo');
        break;
      case 'complete':
        setShowOnboardingProgress(false);
        setHasCompletedOnboarding(true);
        break;
      case 'dismiss':
        setShowOnboardingProgress(false);
        setOnboardingDismissed(true);
        break;
      default:
        break;
    }
  }, [router, openCreateUpdateModal]);

  const handleCollapseOnboarding = useCallback((_collapsed: boolean) => {
    // Placeholder for persisting collapse preference
  }, []);

  const handleDismissOnboarding = useCallback(async () => {
    try {
      const success = await dismissOnboarding();
      if (success) {
        setShowOnboardingProgress(false);
        setOnboardingDismissed(true);
      } else {
        logger.error('Failed to dismiss onboarding');
      }
    } catch (error) {
      logger.errorWithStack('Error dismissing onboarding:', error as Error);
    }
  }, []);

  const memoizedStats = useMemo(() => ({
    children: childrenCount,
    recipients: recipientStats,
    updates: updatesCreated,
    hasData: childrenCount > 0 || recipientStats.total > 0 || updatesCreated > 0
  }), [childrenCount, recipientStats, updatesCreated]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <DashboardActionsProvider
      value={{
        onCreateUpdate: handleCreateUpdate,
        onCompileDigest: handleCompileDigest,
      }}
    >
      <div className="min-h-full">
      {/* Success Alerts */}
      {showDigestSentAlert && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mx-4 sm:mx-6 lg:mx-8 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Digest sent successfully! Your recipients will receive their personalized updates.
              </p>
            </div>
            <div className="ml-auto pl-3">
              <button onClick={() => setShowDigestSentAlert(false)} className="text-green-500 hover:text-green-600">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {showDigestScheduledAlert && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mx-4 sm:mx-6 lg:mx-8 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-800">
                Digest scheduled successfully! It will be sent at the scheduled time.
              </p>
            </div>
            <div className="ml-auto pl-3">
              <button onClick={() => setShowDigestScheduledAlert(false)} className="text-blue-500 hover:text-blue-600">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content container */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Onboarding Progress */}
          {!loadingOnboarding && showOnboardingProgress && !hasCompletedOnboarding && !onboardingDismissed && (
            <div className="mb-6 -mt-4 relative z-10">
              <EnhancedOnboardingProgress
                steps={onboardingSteps}
                currentStepIndex={onboardingSteps.findIndex(step => step.isCurrent)}
                totalSteps={onboardingSteps.length}
                onStepClick={handleOnboardingStepClick}
                onCollapse={handleCollapseOnboarding}
                onDismiss={handleDismissOnboarding}
                showCelebration={hasCompletedOnboarding}
              />
            </div>
          )}

          {/* Activity Card with Filters */}
          <div className="mb-8">
            <Card variant="elevated" className="overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-neutral-900">
                    Recent Activity
                  </h3>
                  <div className="flex items-center space-x-4">
                    <Link
                      href="/dashboard/updates"
                      className="text-sm text-neutral-600 hover:text-neutral-700 font-medium transition-colors"
                    >
                      View all
                    </Link>
                  </div>
                </div>

                {/* Filters Panel */}
                <div className="mb-4">
                  <FiltersPanel
                    searchQuery={filters.searchQuery}
                    dateRange={filters.dateRange}
                    childIds={filters.childIds}
                    updateTypes={filters.updateTypes}
                    onSearchChange={setSearchQuery}
                    onDateRangeChange={setDateRange}
                    onChildIdsChange={setChildIds}
                    onUpdateTypesChange={setUpdateTypes}
                    onClearFilters={clearFilters}
                    activeFilterCount={activeFilterCount}
                  />
                </div>

                {!loadingStats && memoizedStats.updates === 0 ? (
                  <EmptyTimelineState
                    hasCompletedOnboarding={hasCompletedOnboarding}
                    userName={user?.user_metadata?.name || user?.email?.split('@')[0]}
                    onCreateUpdate={handleCreateUpdate}
                  />
                ) : (
                  <UpdatesList
                    limit={5}
                    showViewAllLink={false}
                    onCreateUpdate={handleCreateUpdate}
                  />
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {createUpdateModal}
    </div>
    </DashboardActionsProvider>
  );
});

ActivityFeedView.displayName = 'ActivityFeedView';

export default ActivityFeedView;
