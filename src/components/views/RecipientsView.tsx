/**
 * RecipientsView Component
 * CRO-296: Middle Pane - Content Router
 * CRO-304: Component Migration & Comprehensive Testing
 *
 * Recipient management view - migrated from dashboard page
 */

'use client';

import { useAuth } from '@/hooks/useAuth';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import RecipientManager from '@/components/recipients/RecipientManager';
import { useCreateUpdateModal } from '@/hooks/useCreateUpdateModal';

export default function RecipientsView() {
  const { user } = useAuth();

  // Enable scroll restoration for this view
  useScrollRestoration({ viewKey: 'recipients' });

  const {
    createUpdateModal
  } = useCreateUpdateModal();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <RecipientManager />
      </div>
      {createUpdateModal}
    </div>
  );
}
