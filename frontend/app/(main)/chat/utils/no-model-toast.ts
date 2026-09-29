'use client';

import { toast } from '@/lib/store/toast-store';
import { selectIsAdmin, useUserStore } from '@/lib/store/user-store';
import { localizedText } from '@/lib/i18n/localized-text';

/**
 * Warn that the workspace has no AI model. The settings page is admin-only,
 * so members are told who can fix it instead of getting a button they can't use.
 */
export function showNoModelToast(): void {
  // Unknown (profile still loading) counts as a member: never offer a page they may not open.
  if (selectIsAdmin(useUserStore.getState()) !== true) {
    toast.warning(localizedText('chat.noModelConfigured.title'), {
      description: localizedText('chat.noModelConfigured.memberDescription'),
      duration: null,
    });
    return;
  }
  toast.warning(localizedText('chat.noModelConfigured.title'), {
    description: localizedText('chat.noModelConfigured.adminDescription'),
    action: {
      label: 'Open AI Models',
      labelText: localizedText('chat.noModelConfigured.action'),
      href: '/workspace/ai-models',
    },
    duration: null,
  });
}
