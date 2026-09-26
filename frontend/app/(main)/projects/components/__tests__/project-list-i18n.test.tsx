import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { createInstance, type Resource } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { locales } from '@/lib/i18n/locales';
import { ProjectList } from '../project-list';

const mocks = vi.hoisted(() => ({ list: vi.fn(), noop: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.noop }) }));
vi.mock('@/chat/project-api', () => ({ ProjectApi: { list: mocks.list, unarchive: mocks.noop } }));
vi.mock('@/chat/store', () => ({
  useChatStore: (selector: (state: Record<string, unknown>) => unknown) => selector({
    upsertProjectInList: mocks.noop, bumpProjectsVersion: mocks.noop,
  }),
}));
vi.mock('@/chat/sidebar/dialogs', () => ({ CreateProjectDialog: () => null }));
vi.mock('@/app/components/sidebar/sidebar-expand-button', () => ({ SidebarExpandButton: () => null }));
vi.mock('@/app/components/ui/lottie-loader', () => ({ LottieLoader: () => null }));
vi.mock('@/lib/store/toast-store', () => ({ toast: { success: mocks.noop, error: mocks.noop } }));

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });

const now = new Date('2026-09-26T12:00:00Z').getTime();
const lastActivityAt = now - 2 * 86_400_000;

async function translations() {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: 'en-US', fallbackLng: 'en-US',
    resources: Object.fromEntries(
      Object.entries(structuredClone(locales)).map(([language, catalogue]) => [language, { translation: catalogue }]),
    ) as Resource,
    interpolation: { escapeValue: false },
  });
  return i18n;
}

async function renderProjects(i18n: Awaited<ReturnType<typeof translations>>, count = 1) {
  vi.spyOn(Date, 'now').mockReturnValue(now);
  mocks.list.mockResolvedValue({
    projects: [{
      _id: 'unchanged-project-id', name: 'User project name', description: 'User description',
      role: 'owner', conversationCount: count, isPinned: false, lastActivityAt,
    }],
    pagination: { totalPages: 1 },
  });
  render(<I18nextProvider i18n={i18n}><Theme><ProjectList /></Theme></I18nextProvider>);
  await screen.findByText('User project name');
}

describe('project-card localization', () => {
  it.each([
    ['zh-CN', 1, 'other'], ['zh-SG', 1, 'other'], ['zh-TW', 1, 'other'],
    ['ko-KR', 1, 'other'], ['hi-IN', 0, 'one'], ['es-ES', 1_000_000, 'many'],
  ] as const)('uses the language-specific category in %s for %i', async (language, count, category) => {
    const i18n = await translations();
    const key = `projects.chatCount_${category}`;
    expect(typeof i18n.getResource(language, 'translation', key)).toBe('string');
    // Distinguish categories even where translators use the same wording for both.
    i18n.addResource(language, 'translation', key, `${category}: {{count}}`);
    await renderProjects(i18n, count);
    await act(async () => { await i18n.changeLanguage(language); });
    expect(screen.getByText(`${category}: ${count}`)).toBeTruthy();
    expect(screen.getByText('User project name')).toBeTruthy();
    expect(mocks.list).toHaveBeenCalledTimes(1);
  });

  it('reformats activity dates on a language change without reloading projects', async () => {
    const i18n = await translations();
    await renderProjects(i18n);
    for (const language of ['en-US', 'de-DE', 'zh-CN']) {
      await act(async () => { await i18n.changeLanguage(language); });
      const date = new Intl.RelativeTimeFormat(language, { numeric: 'auto' }).format(-2, 'day');
      expect(screen.getByText(i18n.t('projects.lastActive', { date }))).toBeTruthy();
      expect(screen.getByText('User description')).toBeTruthy();
    }
    expect(mocks.list).toHaveBeenCalledTimes(1);
  });
});
