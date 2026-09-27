import type { SelectOption } from '../components';
import type { TeamMemberRole } from './types';

// ========================================
// Role options
// ========================================

export const ROLE_OPTIONS: SelectOption[] = [
  { value: 'READER', label: 'Reader' },
  { value: 'WRITER', label: 'Writer' },
  { value: 'OWNER', label: 'Owner' },
];

/**
 * Labels + descriptions used by role pickers in team contexts (Create Team,
 * Edit Team). Team-neutral wording — do not mention collections or specific
 * resources here.
 */
export function getTeamRoleLabels(t: (key: string) => string): Record<
  TeamMemberRole,
  { label: string; description: string }
> {
  return {
    OWNER: {
      label: t('workspace.teams.roles.owner.label'),
      description: t('workspace.teams.roles.owner.description'),
    },
    WRITER: {
      label: t('workspace.teams.roles.writer.label'),
      description: t('workspace.teams.roles.writer.description'),
    },
    READER: {
      label: t('workspace.teams.roles.reader.label'),
      description: t('workspace.teams.roles.reader.description'),
    },
  };
}

/** Coerce API/pending role values to a known team role (avoids RoleDropdownMenu crashes). */
export function normalizeTeamMemberRole(
  role: unknown,
  isOwner?: boolean
): TeamMemberRole {
  const upper = typeof role === 'string' ? role.trim().toUpperCase() : '';
  if (upper === 'OWNER' || upper === 'WRITER' || upper === 'READER') {
    return upper;
  }
  return isOwner ? 'OWNER' : 'READER';
}
