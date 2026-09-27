'use client';

import React from 'react';
import { Flex, Text, Avatar, Box } from '@radix-ui/themes';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/config';
import { WorkspaceRightPanel } from '../../components';
import { useUsersStore } from '../store';

// ========================================
// Helpers
// ========================================

/** Format a profile timestamp using the active display locale. */
function formatDateTime(timestampMs: number | undefined, locale: string): string {
  if (!timestampMs) return '-';
  const date = new Date(timestampMs);
  if (isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

/** Extract initials from a full name */
function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/[\s._-]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// ========================================
// Profile Field Row
// ========================================

interface ProfileFieldProps {
  label: string;
  value: string;
  valueColor?: string;
}

function ProfileField({ label, value, valueColor }: ProfileFieldProps) {
  return (
    <Box
      style={{
        background: 'var(--olive-2)',
        border: '1px solid var(--olive-3)',
        borderRadius: 'var(--radius-2)',
        padding: 'var(--space-3) var(--space-4)',
      }}
    >
      <Flex direction="column" gap="1">
        <Text size="1" style={{ color: 'var(--slate-9)' }}>
          {label}
        </Text>
        <Text size="2" weight="medium" style={{ color: valueColor || 'var(--slate-12)' }}>
          {value}
        </Text>
      </Flex>
    </Box>
  );
}

// ========================================
// User Profile Sidebar
// ========================================

export function UserProfileSidebar() {
  const { t, i18n } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);

  const { isProfilePanelOpen, profileUser, closeProfilePanel } = useUsersStore();

  if (!profileUser) return null;

  const isSelf = currentUser?.id === profileUser.id || currentUser?.email === profileUser.email;
  const displayName = profileUser.name || profileUser.email || '-';
  const nameWithSuffix = isSelf ? `${displayName} (${t('common.you')})` : displayName;

  const status = profileUser.hasLoggedIn ? 'Active' : 'Pending';

  // Map status to color for the profile display
  const statusColor =
    status === 'Active'
      ? 'var(--accent-11)'
      : status === 'Pending'
        ? 'var(--amber-11)'
        : 'var(--slate-11)';

  return (
    <WorkspaceRightPanel
      open={isProfilePanelOpen}
      onOpenChange={(open) => {
        if (!open) closeProfilePanel();
      }}
      title={t('workspace.users.profile.title')}
      icon="person"
      hideFooter
    >
      <Flex direction="column" gap="2">
        {/* Name — own card with avatar */}
        <Box
          style={{
            backgroundColor: 'var(--olive-2)',
            border: '1px solid var(--olive-3)',
            borderRadius: 'var(--radius-2)',
            padding: 'var(--space-3) var(--space-4)',
          }}
        >
          <Flex align="center" justify="between">
            <Flex direction="column" gap="1">
              <Text size="1" style={{ color: 'var(--slate-9)' }}>
                {t('workspace.users.profile.name')}
              </Text>
              <Text size="2" weight="medium" style={{ color: 'var(--slate-12)' }}>
                {nameWithSuffix}
              </Text>
            </Flex>
            <Avatar
              size="2"
              variant="soft"
              fallback={getInitials(displayName)}
              style={{ flexShrink: 0 }}
            />
          </Flex>
        </Box>

        <ProfileField
          label={t('workspace.users.profile.email')}
          value={profileUser.email || '-'}
        />
        <ProfileField
          label={t('workspace.users.profile.role')}
          value={profileUser.role || t('workspace.users.roles.member')}
        />
        <ProfileField
          label={t('workspace.users.profile.companyDesignation')}
          value="-"
        />
        <ProfileField
          label={t('workspace.users.profile.teamsCount')}
          value="-"
        />
        <ProfileField
          label={t('workspace.users.profile.status')}
          value={t(`workspace.users.statuses.${status.toLowerCase()}`)}
          valueColor={statusColor}
        />
        <ProfileField
          label={t('workspace.users.profile.lastActive')}
          value={formatDateTime(profileUser.updatedAtTimestamp, i18n.resolvedLanguage ?? i18n.language)}
        />
        <ProfileField
          label={t('workspace.users.profile.dateJoined')}
          value={formatDateTime(profileUser.createdAtTimestamp, i18n.resolvedLanguage ?? i18n.language)}
        />
        <ProfileField
          label={t('workspace.users.profile.invitedBy')}
          value="-"
        />
      </Flex>
    </WorkspaceRightPanel>
  );
}
