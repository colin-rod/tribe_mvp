/**
 * Fetch Searchable Content from Supabase
 * CRO-300: Search Functionality in Top Bar
 */

import { createClient } from '@/lib/supabase/client';
import { SearchableItem } from './fuseConfig';

/**
 * Fetch all searchable content for the current user
 * Includes updates, children, recipients, and groups
 */
export async function fetchSearchableContent(
  parentId: string
): Promise<SearchableItem[]> {
  const supabase = createClient();
  const items: SearchableItem[] = [];

  try {
    // Fetch updates (both drafts and sent)
    const { data: updates, error: updatesError } = await supabase
      .from('memories')
      .select('id, subject, content, distribution_status, child_id, created_at')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (updatesError) throw updatesError;

    if (updates) {
      updates.forEach((update) => {
        const isDraft = update.distribution_status === 'draft';
        items.push({
          id: update.id,
          type: isDraft ? 'draft' : 'update',
          title: update.subject || 'Untitled Update',
          content: update.content || '',
          url: isDraft
            ? `/dashboard/drafts/${update.id}/edit`
            : `/dashboard/updates/${update.id}`,
          metadata: {
            childId: update.child_id,
            status: update.distribution_status,
            createdAt: update.created_at,
          },
        });
      });
    }

    // Fetch children
    const { data: children, error: childrenError } = await supabase
      .from('children')
      .select('id, name, birth_date')
      .eq('parent_id', parentId)
      .order('name', { ascending: true });

    if (childrenError) throw childrenError;

    if (children) {
      children.forEach((child) => {
        items.push({
          id: child.id,
          type: 'child',
          name: child.name,
          url: `/dashboard/children?selected=${child.id}`,
          metadata: {
            birthDate: child.birth_date,
          },
        });
      });
    }

    // Fetch recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('recipients')
      .select('id, name, email, relationship, is_active')
      .eq('parent_id', parentId)
      .eq('is_active', true)
      .order('name', { ascending: true })
      .limit(100);

    if (recipientsError) throw recipientsError;

    if (recipients) {
      recipients.forEach((recipient) => {
        items.push({
          id: recipient.id,
          type: 'recipient',
          name: recipient.name,
          email: recipient.email || undefined,
          url: `/dashboard/recipients?selected=${recipient.id}`,
          metadata: {
            relationship: recipient.relationship,
          },
        });
      });
    }

    // Fetch groups
    const { data: groups, error: groupsError } = await supabase
      .from('recipient_groups')
      .select('id, name, default_frequency')
      .eq('parent_id', parentId)
      .order('name', { ascending: true });

    if (groupsError) throw groupsError;

    if (groups) {
      groups.forEach((group) => {
        items.push({
          id: group.id,
          type: 'group',
          name: group.name,
          url: `/dashboard/groups?selected=${group.id}`,
          metadata: {
            frequency: group.default_frequency,
          },
        });
      });
    }

    return items;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching searchable content:', error);
    return [];
  }
}

/**
 * Get cached searchable content or fetch if not available
 * Uses a simple in-memory cache with 5-minute expiration
 */
let searchableContentCache: {
  items: SearchableItem[];
  timestamp: number;
  parentId: string;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCachedSearchableContent(
  parentId: string
): Promise<SearchableItem[]> {
  const now = Date.now();

  // Check if cache is valid
  if (
    searchableContentCache &&
    searchableContentCache.parentId === parentId &&
    now - searchableContentCache.timestamp < CACHE_DURATION
  ) {
    return searchableContentCache.items;
  }

  // Fetch fresh data
  const items = await fetchSearchableContent(parentId);

  // Update cache
  searchableContentCache = {
    items,
    timestamp: now,
    parentId,
  };

  return items;
}

/**
 * Invalidate the search content cache
 * Call this when data changes (e.g., after creating/updating/deleting content)
 */
export function invalidateSearchCache(): void {
  searchableContentCache = null;
}
