/**
 * SettingsView Component
 * CRO-296: Middle Pane - Content Router
 *
 * User settings and profile view
 */

'use client';

import { useScrollRestoration } from '@/hooks/useScrollRestoration';

export default function SettingsView() {
  // Enable scroll restoration for this view
  useScrollRestoration({ viewKey: 'settings' });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-neutral-900 mb-4">Settings</h1>
        <p className="text-neutral-600">
          User settings and profile management will appear here.
        </p>
      </div>
    </div>
  );
}
