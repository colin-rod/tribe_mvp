/**
 * QuickStatsCard Component
 * CRO-298: Right Pane - Activity View Context
 *
 * Displays quick statistics for the activity feed:
 * - Total memories count
 * - Sent summaries count
 * - Active recipients count
 * - Memories this week
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { TrendingUp, Send, Users, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export interface ActivityStats {
  totalUpdates: number;
  sentDigests: number;
  activeRecipients: number;
  updatesThisWeek: number;
}

export interface QuickStatsCardProps {
  /** Filter state to compute stats for */
  filters?: {
    dateRange?: { start: Date; end: Date } | null;
    childIds?: string[];
    updateTypes?: string[];
    searchQuery?: string;
  };
  /** Optional className for custom styling */
  className?: string;
}

const STAT_ITEMS = [
  {
    key: 'totalUpdates' as const,
    label: 'Total Memories',
    icon: TrendingUp,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    key: 'sentDigests' as const,
    label: 'Sent Summaries',
    icon: Send,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    key: 'activeRecipients' as const,
    label: 'Active Recipients',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    key: 'updatesThisWeek' as const,
    label: 'This Week',
    icon: Calendar,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
];

export function QuickStatsCard({ filters, className }: QuickStatsCardProps) {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Calculate start of week (Sunday)
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // Build base query for memories
      let updatesQuery = supabase
        .from('memories')
        .select('id, child_id, milestone_type, created_at', { count: 'exact' })
        .eq('parent_id', user.id);

      // Apply filters
      if (filters?.dateRange) {
        updatesQuery = updatesQuery
          .gte('created_at', filters.dateRange.start.toISOString())
          .lte('created_at', filters.dateRange.end.toISOString());
      }

      if (filters?.childIds && filters.childIds.length > 0) {
        updatesQuery = updatesQuery.in('child_id', filters.childIds);
      }

      if (filters?.updateTypes && filters.updateTypes.length > 0) {
        // Note: This is a simplified filter - actual implementation may need to check media_urls or content_format
        if (filters.updateTypes.includes('milestone')) {
          updatesQuery = updatesQuery.not('milestone_type', 'is', null);
        }
      }

      // Get total memories with filters
      const { count: totalUpdates } = await updatesQuery;

      // Get memories this week
      const { count: updatesThisWeek } = await supabase
        .from('memories')
        .select('id', { count: 'exact' })
        .eq('parent_id', user.id)
        .gte('created_at', startOfWeek.toISOString());

      // Get sent summaries count
      const { count: sentDigests } = await supabase
        .from('summaries')
        .select('id', { count: 'exact' })
        .eq('parent_id', user.id)
        .eq('status', 'sent');

      // Get active recipients count
      const { count: activeRecipients } = await supabase
        .from('recipients')
        .select('id', { count: 'exact' })
        .eq('parent_id', user.id)
        .eq('is_active', true);

      setStats({
        totalUpdates: totalUpdates || 0,
        sentDigests: sentDigests || 0,
        activeRecipients: activeRecipients || 0,
        updatesThisWeek: updatesThisWeek || 0,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error loading stats:', err);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="flex items-center justify-center h-32">
          <LoadingSpinner size="sm" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="text-sm text-red-600 text-center">{error}</div>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Card className={cn('p-4', className)}>
      <h3 className="text-sm font-semibold text-neutral-900 mb-4">Quick Stats</h3>

      <div className="space-y-3">
        {STAT_ITEMS.map(({ key, label, icon: Icon, color, bgColor }) => (
          <div
            key={key}
            className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-md', bgColor)}>
                <Icon className={cn('h-4 w-4', color)} />
              </div>
              <span className="text-sm text-neutral-700">{label}</span>
            </div>
            <span className="text-lg font-semibold text-neutral-900">
              {stats[key].toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
