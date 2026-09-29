import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import en from '@/lib/i18n/locales/en-US.json';
import de from '@/lib/i18n/locales/de-DE.json';
import ConnectorsPage from '@/app/(main)/connectors/page';
import { NotificationRow } from '@/app/(main)/notifications/notification-row';
import { ShareButton } from '@/app/components/share/share-button';
import { ShareSearchInput } from '@/app/components/share/share-search-input';
import { ConnectorIcon } from '@/app/components/ui/ConnectorIcon';
import { useGitHubStars } from '@/app/components/workspace-menu/hooks/use-github-stars';

vi.mock('next/image', () => ({ default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
  const { unoptimized: _unoptimized, ...imageProps } = props;
  return <img alt={imageProps.alt ?? ''} {...imageProps} />;
} }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function createTranslations() {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: 'en-US',
    fallbackLng: 'en-US',
    resources: {
      'en-US': { translation: en },
      'de-DE': { translation: de },
    },
    interpolation: { escapeValue: false },
  });
  return i18n;
}

function StarsLabel() {
  return <span>{useGitHubStars() ?? 'loading'}</span>;
}

describe('shared UI locale behavior', () => {
  it('updates shared labels and accessible names while preserving recipient input and notification expansion', async () => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    });
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(120);
    const i18n = await createTranslations();
    const callbacks = {
      onMarkRead: vi.fn(), onMarkUnread: vi.fn(), onArchive: vi.fn(),
      onUnarchive: vi.fn(), onDismiss: vi.fn(),
    };
    render(
      <Theme>
        <I18nextProvider i18n={i18n}>
          <ConnectorsPage />
          <ShareButton onClick={() => {}} />
          <ShareSearchInput selections={[]} searchQuery="person@example.com" selectedRole="reader"
            supportsRoles={false} onSearchChange={() => {}} onRemoveSelection={() => {}}
            onRoleChange={() => {}} />
          <ConnectorIcon type="slack" />
          <NotificationRow notification={{ _id: 'notification-1', type: 'notice', status: 'unread',
            title: 'Source authored title', message: 'Long source authored notification message', }}
            {...callbacks} markReadLabel="Mark read" markUnreadLabel="Mark unread"
            archiveLabel="Archive" unarchiveLabel="Unarchive" dismissLabel="Dismiss" />
        </I18nextProvider>
      </Theme>,
    );

    const input = screen.getByPlaceholderText(en.shareSidebar.searchPlaceholder) as HTMLInputElement;
    expect(input.value).toBe('person@example.com');
    expect(screen.getByRole('heading', { name: en.nav.connectors })).toBeTruthy();
    expect(screen.getByText(en.agents.comingSoon)).toBeTruthy();
    expect(screen.getByRole('button', { name: en.action.share })).toBeTruthy();
    expect(screen.getByRole('img', { name: en.common.connectorIconAlt.replace('{{type}}', 'slack') })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.filePreview.showMore }));
    expect(screen.getByRole('button', { name: en.filePreview.showLess })).toBeTruthy();

    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByRole('heading', { name: de.nav.connectors })).toBeTruthy();
    expect(screen.getByText(de.agents.comingSoon)).toBeTruthy();
    expect(screen.getByRole('button', { name: de.action.share })).toBeTruthy();
    expect(screen.getByRole('img', { name: de.common.connectorIconAlt.replace('{{type}}', 'slack') })).toBeTruthy();
    expect(screen.getByRole('button', { name: de.filePreview.showLess })).toBeTruthy();
    const germanInput = screen.getByPlaceholderText(de.shareSidebar.searchPlaceholder) as HTMLInputElement;
    expect(germanInput).toBe(input);
    expect(germanInput.value).toBe('person@example.com');
  });

  it('formats cached GitHub counts with the active locale without refetching', async () => {
    const i18n = await createTranslations();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ stargazers_count: 1_234_567 }),
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<I18nextProvider i18n={i18n}><StarsLabel /></I18nextProvider>);
    const englishCount = new Intl.NumberFormat('en-US', {
      notation: 'compact', maximumFractionDigits: 1,
    }).format(1_234_567);
    await waitFor(() => expect(screen.getByText((_, element) => element?.tagName === 'SPAN' && element.textContent === englishCount)).toBeTruthy());
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    const germanCount = new Intl.NumberFormat('de-DE', {
      notation: 'compact', maximumFractionDigits: 1,
    }).format(1_234_567);
    expect(screen.getByText((_, element) => element?.tagName === 'SPAN' && element.textContent === germanCount)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
