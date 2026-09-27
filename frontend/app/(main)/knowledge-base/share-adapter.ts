import { apiClient } from '@/lib/api';
import type { ShareAdapter, SharedMember, ShareSubmission, ShareRole } from '@/app/components/share/types';
import { useAuthStore } from '@/config';
import { useUserStore } from '@/lib/store/user-store';
import { fetchShareUsersPaginated } from '@/app/components/share/utils';
import i18n from '@/lib/i18n/config';

const BASE = '/api/v1/knowledgeBase';

/**
 * Creates a ShareAdapter for a Knowledge Base (Collection).
 * Supports full CRUD permissions — roles and teams.
 */
export function createKBShareAdapter(kbId: string): ShareAdapter {
  const profile = useUserStore.getState().profile;
  const authUser = useAuthStore.getState().user;
  const currentUserId = (profile?.userId ?? authUser?.id ?? '').trim();

  return {
    entityType: 'collection',
    entityId: kbId,
    get sidebarTitle() {
      return i18n.t('dialog.shareCollection');
    },
    supportsRoles: true,
    supportsTeams: true,

    async getSharedMembers(): Promise<SharedMember[]> {
      const { data } = await apiClient.get(`${BASE}/${kbId}/permissions`, { suppressErrorToast: true });
      const permissions = Array.isArray(data) ? data : data.permissions ?? [];
      return permissions.map((p: Record<string, unknown>) => {
        const isTeam = (p.type as string)?.toUpperCase() === 'TEAM';
        const mongoUserId = p.userId as string | undefined;
        const id = isTeam ? (p.id as string) : (mongoUserId ?? (p.id as string));
        const displayName =
          typeof p.name === 'string' && p.name ? p.name : typeof p.email === 'string' && p.email ? p.email : undefined;
        const member = {
          id,
          type: (isTeam ? 'team' : 'user') as 'user' | 'team',
          name: displayName ?? '',
          email: p.email as string | undefined,
          avatarUrl: p.avatarUrl as string | undefined,
          memberCount: p.memberCount as number | undefined,
          role: ((p.role as string) ?? (p.relationship as string) ?? 'READER') as ShareRole,
          isOwner: ((p.role as string) ?? (p.relationship as string)) === 'OWNER',
          isCurrentUser: !isTeam && id === currentUserId,
        };
        Object.defineProperty(member, 'name', {
          configurable: true,
          enumerable: true,
          get: () => displayName ?? i18n.t('common.unknown'),
        });
        return member;
      });
    },

    async share(submission: ShareSubmission): Promise<void> {
      await apiClient.post(`${BASE}/${kbId}/permissions`, {
        userIds: submission.userIds,
        teamIds: submission.teamIds,
        role: submission.role,
      }, { suppressErrorToast: true });
    },

    async updateRole(memberId: string, memberType: 'user' | 'team', newRole: ShareRole): Promise<void> {
      const payload =
        memberType === 'user'
          ? { userIds: [memberId], teamIds: [], role: newRole }
          : { userIds: [], teamIds: [memberId], role: newRole };
      await apiClient.put(`${BASE}/${kbId}/permissions`, payload, { suppressErrorToast: true });
    },

    async removeMember(memberId: string, memberType: 'user' | 'team'): Promise<void> {
      const payload =
        memberType === 'user'
          ? { userIds: [memberId], teamIds: [] }
          : { userIds: [], teamIds: [memberId] };
      await apiClient.delete(`${BASE}/${kbId}/permissions`, { data: payload, suppressErrorToast: true });
    },

    getSharingUsersPaginated: fetchShareUsersPaginated,
  };
}
