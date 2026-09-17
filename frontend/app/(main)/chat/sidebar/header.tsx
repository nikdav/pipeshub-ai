'use client';

import { useTranslation } from 'react-i18next';

import { Flex, IconButton, Tooltip } from '@radix-ui/themes';
import { Link } from '@/lib/navigation';
import { HEADER_ELEMENT_SIZE } from '@/app/components/sidebar';
import { UserAvatar } from '@/app/components/ui/user-avatar';
import { MaterialIcon } from '@/app/components/ui/MaterialIcon';
import { useUserStore } from '@/lib/store/user-store';
import { useSidebarWidthStore } from '@/lib/store/sidebar-width-store';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';
import { toast } from '@/lib/store/toast-store';
import { PipesHubIcon } from '@/app/components/ui';

/**
 * Sidebar header — logo, user avatar, and a desktop collapse button.
 * When the sidebar is collapsed the header is not visible (sidebar is 0-wide),
 * so we only need to handle the expanded state here.
 */
export function ChatSidebarHeader() {
  const { t } = useTranslation();
  const profile = useUserStore((s) => s.profile);
  const setNavCollapsed = useSidebarWidthStore((s) => s.setNavCollapsed);
  const isMobile = useIsMobile();

  const avatar = (
    <UserAvatar
      fullName={profile?.fullName}
      firstName={profile?.firstName}
      lastName={profile?.lastName}
      email={profile?.email}
      src={profile?.avatarUrl}
      size={HEADER_ELEMENT_SIZE}
      radius="small"
    />
  );

  return (
    <Flex align="center" justify="between" gap="2" style={{ height: '100%', padding: 'var(--space-4)' }}>
      <PipesHubIcon size={HEADER_ELEMENT_SIZE} color="var(--accent-11)" />
      <Flex align="center" gap="2">
        {isMobile ? (
          <IconButton
            variant="ghost"
            color="gray"
            aria-label={t('common.openProfile')}
            onClick={() => {
              toast.info(t('chat.comingSoon'), {
                description: t('chat.mobileProfileComingSoon'),
              });
            }}
            style={{ margin: 0, padding: 0, lineHeight: 0, cursor: 'pointer' }}
          >
            {avatar}
          </IconButton>
        ) : (
          <Link href="/workspace/profile/" aria-label={t('common.openProfile')} style={{ textDecoration: 'none', lineHeight: 0 }}>
            {avatar}
          </Link>
        )}
        {!isMobile && (
          <Tooltip content={t('sidebar.collapse')} side="right">
            <IconButton
              variant="ghost"
              color="gray"
              size="1"
              aria-label={t('sidebar.collapse')}
              onClick={() => setNavCollapsed(true)}
              style={{ margin: 0, cursor: 'pointer' }}
            >
              <MaterialIcon name="keyboard_tab" size={18} color="var(--gray-10)" style={{ transform: 'scaleX(-1)' }} />
            </IconButton>
          </Tooltip>
        )}
      </Flex>
    </Flex>
  );
}
