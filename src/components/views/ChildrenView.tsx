/**
 * ChildrenView Component
 * CRO-296: Middle Pane - Content Router
 *
 * Children management view
 */

'use client';

import { useAuth } from '@/hooks/useAuth';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import ChildManager from '@/components/children/ChildManager';
import { useCreateUpdateModal } from '@/hooks/useCreateUpdateModal';

export default function ChildrenView() {
  const { user } = useAuth();

  // Enable scroll restoration for this view
  useScrollRestoration({ viewKey: 'children' });

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
    <div className="min-h-full">
      <ChildManager />
      {createUpdateModal}
    </div>
  );
}
