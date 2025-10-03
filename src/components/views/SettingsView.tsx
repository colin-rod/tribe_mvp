/**
 * SettingsView Component
 * CRO-296: Middle Pane - Content Router
 * CRO-304: Component Migration & Comprehensive Testing
 *
 * User settings and profile view - migrated from dashboard page
 */

'use client';

import { useAuth } from '@/hooks/useAuth';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ProfileManager } from '@/components/profile/ProfileManager';

export default function SettingsView() {
  const { user } = useAuth();

  // Enable scroll restoration for this view
  useScrollRestoration({ viewKey: 'settings' });

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
        <ProfileManager />
      </div>
    </div>
  );
}
