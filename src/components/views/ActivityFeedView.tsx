/**
 * ActivityFeedView Component
 * CRO-296: Middle Pane - Content Router
 * Updated for Memory Book Experience
 *
 * Main activity feed view - now shows Memories instead of Updates
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
import { getRecentMemoriesWithStats } from '@/lib/memories';
import { needsOnboarding, getOnboardingStatus, dismissOnboarding } from '@/lib/onboarding';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { UserPlusIcon, UserGroupIcon, SparklesIcon } from '@heroicons/react/24/outline';
import MemoryList from '@/components/memories/MemoryList';
import EnhancedOnboardingProgress from '@/components/dashboard/EnhancedOnboardingProgress';
import EmptyTimelineState from '@/components/dashboard/EmptyTimelineState';
import { useCreateUpdateModal } from '@/hooks/useCreateUpdateModal';
import { useActivityFilters, type UpdateType } from '@/hooks/useActivityFilters';
import { DashboardActionsProvider } from '@/contexts/DashboardActionsContext';

const logger = createLogger('ActivityFeedView');

const ActivityFeedView = memo(function ActivityFeedView() {
  const { user } = useAuth();
  const router = useRouter();
  const [childrenCount, setChildrenCount] = useState(0);
  const [showSummarySentAlert, setShowSummarySentAlert] = useState(false);
  const [showSummaryScheduledAlert, setShowSummaryScheduledAlert] = useState(false);
  const [recipientStats, setRecipientStats] = useState({ total: 0, active: 0, groups: 0 });
  const [memoriesCreated, setMemoriesCreated] = useState(0);
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
      description: 'Tell us about your little one to personalize your memories',
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
      description: 'Add recipients who will receive your memory summaries',
      icon: UserGroupIcon,
      estimatedTimeMinutes: 5,
      isRequired: true,
      isCompleted: recipientStats.total > 0,
      isSkipped: false,
      isCurrent: childrenCount > 0 && recipientStats.total === 0,
      completedAt: recipientStats.total > 0 ? new Date() : undefined,
    },
    {
      id: 'create-first-memory',
      title: 'Share Your First Memory',
      description: 'Create and capture your first memory to share with family',
      icon: SparklesIcon,
      estimatedTimeMinutes: 2,
      isRequired: true,
      isCompleted: memoriesCreated > 0,
      isSkipped: false,
      isCurrent: childrenCount > 0 && recipientStats.total > 0 && memoriesCreated === 0,
      completedAt: memoriesCreated > 0 ? new Date() : undefined,
    },
  ], [childrenCount, recipientStats.total, memoriesCreated]);

  useEffect(() => {
    // Check for summary success query params
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('summary_sent') === 'true') {
        setShowSummarySentAlert(true);
        window.history.replaceState({}, '', '/dashboard');
        setTimeout(() => setShowSummarySentAlert(false), 5000);
      }
      if (urlParams.get('summary_scheduled') === 'true') {
        setShowSummaryScheduledAlert(true);
        window.history.replaceState({}, '', '/dashboard');
        setTimeout(() => setShowSummaryScheduledAlert(false), 5000);
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

      const [children, recipientStatsData, groupStatsData, memories] = await Promise.all([
        getChildren(),
        getRecipientStats(),
        getGroupStats(),
        getRecentMemoriesWithStats()
      ]);

      setChildrenCount(children.length);
      setRecipientStats({
        total: recipientStatsData.totalRecipients,
        active: recipientStatsData.activeRecipients,
        groups: groupStatsData.totalGroups
      });

      const totalMemories = memories.length;
      setMemoriesCreated(totalMemories);
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

  const handleCompileSummary = useCallback(() => {
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
      case 'create-first-memory':
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
    memories: memoriesCreated,
    hasData: childrenCount > 0 || recipientStats.total > 0 || memoriesCreated > 0
  }), [childrenCount, recipientStats, memoriesCreated]);

  const dashboardActionsValue = useMemo(() => ({
    onCreateUpdate: handleCreateUpdate,
    onCompileDigest: handleCompileSummary,
    activityFilters: {
      filters,
      setDateRange,
      setChildIds,
      setUpdateTypes,
      setSearchQuery,
      clearFilters,
      activeFilterCount,
    },
  }), [
    handleCreateUpdate,
    handleCompileSummary,
    filters,
    setDateRange,
    setChildIds,
    setUpdateTypes,
    setSearchQuery,
    clearFilters,
    activeFilterCount,
  ]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <DashboardActionsProvider value={dashboardActionsValue}>
      <div className="min-h-full">
        {/* Success Alerts */}
        {showSummarySentAlert && (
          <div className="mx-4 mt-4 sm:mx-6 lg:mx-8">
            <Alert
              variant="success"
              dismissible
              onDismiss={() => setShowSummarySentAlert(false)}
              title="Summary sent successfully"
            >
              Your recipients will receive their personalized memory summaries.
            </Alert>
          </div>
        )}

        {showSummaryScheduledAlert && (
          <div className="mx-4 mt-4 sm:mx-6 lg:mx-8">
            <Alert
              variant="info"
              dismissible
              onDismiss={() => setShowSummaryScheduledAlert(false)}
              title="Summary scheduled"
            >
              The summary will be sent automatically at the scheduled time.
            </Alert>
          </div>
        )}

        {/* Main content container */}
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {/* Onboarding Progress */}
            {!loadingOnboarding && showOnboardingProgress && !hasCompletedOnboarding && !onboardingDismissed && (
              <div className="relative -mt-4 mb-6 z-10">
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
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-neutral-900">
                      Recent Activity
                    </h3>
                    <div className="flex items-center space-x-4">
                      <Link
                        href="/dashboard/memories"
                        className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-700"
                      >
                        View all
                      </Link>
                    </div>
                  </div>

                  {/* Filters moved to Right Pane */}

                  {!loadingStats && memoizedStats.memories === 0 ? (
                    <EmptyTimelineState
                      hasCompletedOnboarding={hasCompletedOnboarding}
                      userName={user?.user_metadata?.name || user?.email?.split('@')[0]}
                      onCreateMemory={handleCreateUpdate}
                    />
                  ) : (
                    <MemoryList
                      limit={5}
                      onCreateMemory={handleCreateUpdate}
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
