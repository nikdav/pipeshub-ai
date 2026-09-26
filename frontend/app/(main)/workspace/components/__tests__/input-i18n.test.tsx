import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import en from '@/lib/i18n/locales/en-US.json';
import de from '@/lib/i18n/locales/de-DE.json';
import { TagInput } from '../tag-input';
import { InviteUsersSidebar } from '../../users/components/invite-users-sidebar';

const mocks = vi.hoisted(() => ({
  isAdmin: true,
  setRole: vi.fn(),
  noop: vi.fn(),
  state: {
    isInvitePanelOpen: true,
    inviteEmails: [],
    inviteRole: 'Member',
    inviteGroupIds: [],
    isInviting: false,
    editingInviteUser: null,
  },
}));

vi.mock('@/lib/store/user-store', () => ({
  useUserStore: () => mocks.isAdmin,
  selectIsAdmin: () => mocks.isAdmin,
}));
vi.mock('@/lib/store/toast-store', () => ({ useToastStore: () => mocks.noop }));
vi.mock('@/lib/api', () => ({ isProcessedError: () => false }));
vi.mock('@/app/(main)/workspace/users/api', () => ({ UsersApi: {} }));
vi.mock('@/app/(main)/workspace/groups/api', () => ({
  GroupsApi: { listGroups: async () => ({ groups: [] }) },
}));
vi.mock('@/app/(main)/workspace/users/store', () => ({
  useUsersStore: () => ({
    ...mocks.state,
    closeInvitePanel: mocks.noop,
    setInviteEmails: mocks.noop,
    setInviteRole: mocks.setRole,
    setInviteGroupIds: mocks.noop,
    setIsInviting: mocks.noop,
    resetInviteForm: mocks.noop,
  }),
}));
// Keep the role selector observable without opening the unrelated side-panel portal.
vi.mock('@/app/(main)/workspace/components', () => ({
  WorkspaceRightPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormField: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TagInput: () => null,
  SearchableCheckboxDropdown: () => null,
  SelectDropdown: ({ options, value, disabled, onChange }: {
    options: { value: string; label: string }[];
    value: string;
    disabled: boolean;
    onChange: (value: string) => void;
  }) => (
    <select aria-label="Role" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  ),
}));

beforeEach(() => { mocks.isAdmin = true; });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function translations() {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: 'en-US',
    fallbackLng: 'en-US',
    resources: { 'en-US': { translation: en }, 'de-DE': { translation: de } },
    interpolation: { escapeValue: false },
  });
  return i18n;
}

const invalidTags = [{ id: 'unchanged-id', value: 'original-invalid-address', isValid: false }];

describe('workspace input localization', () => {
  it('retranslates invalid-email feedback without changing tag contents', async () => {
    const i18n = await translations();
    render(<I18nextProvider i18n={i18n}><Theme><TagInput tags={invalidTags} /></Theme></I18nextProvider>);
    expect(screen.getByText(en.form.invalidEmail)).toBeTruthy();
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByText(de.form.invalidEmail)).toBeTruthy();
    expect(screen.queryByText(en.form.invalidEmail)).toBeNull();
    expect(screen.getByText(invalidTags[0].value)).toBeTruthy();
    expect(invalidTags[0].isValid).toBe(false);
  });

  it('preserves caller-supplied validation feedback', async () => {
    const i18n = await translations();
    render(
      <I18nextProvider i18n={i18n}><Theme>
        <TagInput tags={invalidTags} error="Caller feedback" />
      </Theme></I18nextProvider>,
    );
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByText('Caller feedback')).toBeTruthy();
    expect(screen.queryByText(de.form.invalidEmail)).toBeNull();
  });

  it.each([true, false])('retranslates invite roles and preserves role values (admin=%s)', async (isAdmin) => {
    mocks.isAdmin = isAdmin;
    const i18n = await translations();
    await act(async () => {
      render(<I18nextProvider i18n={i18n}><Theme><InviteUsersSidebar /></Theme></I18nextProvider>);
    });
    expect(screen.getByRole('option', { name: en.workspace.users.roles.member }).getAttribute('value')).toBe('Member');
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByRole('option', { name: de.workspace.users.roles.member }).getAttribute('value')).toBe('Member');
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('Member');
    expect(select.disabled).toBe(!isAdmin);
    expect(screen.getAllByRole('option')).toHaveLength(isAdmin ? 2 : 1);
    if (isAdmin) {
      fireEvent.change(select, { target: { value: 'Admin' } });
      expect(mocks.setRole).toHaveBeenLastCalledWith('Admin');
    }
  });
});
