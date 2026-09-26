import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import en from '@/lib/i18n/locales/en-US.json';
import de from '@/lib/i18n/locales/de-DE.json';
import { Spinner } from '../spinner';
import { LottieLoader } from '../lottie-loader';
import { ChatSectionHeader } from '@/chat/sidebar/chat-section-header';

// Isolate the animation player and unrelated sidebar exports, not i18n.
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/app/components/sidebar', () => ({ ELEMENT_HEIGHT: 32, ICON_SIZE_DEFAULT: 18 }));

afterEach(cleanup);

async function createTranslations() {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: 'en-US',
    fallbackLng: 'en-US',
    resources: { 'en-US': { translation: en }, 'de-DE': { translation: de } },
    interpolation: { escapeValue: false },
  });
  return i18n;
}

describe('shared loading and section labels', () => {
  it('updates the spinner and visible loader labels without remounting', async () => {
    const i18n = await createTranslations();
    render(<I18nextProvider i18n={i18n}><Spinner /><LottieLoader showLabel /></I18nextProvider>);
    const spinner = screen.getByRole('status');
    expect(spinner.getAttribute('aria-label')).toBe(en.common.loading);
    expect(screen.getByText(en.common.loading)).toBeTruthy();
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByRole('status')).toBe(spinner);
    expect(spinner.getAttribute('aria-label')).toBe(de.common.loading);
    expect(screen.getByText(de.common.loading)).toBeTruthy();
  });

  it.each(['Caller label', ''])('preserves an explicit label override (%j)', async (label) => {
    const i18n = await createTranslations();
    const { container } = render(
      <I18nextProvider i18n={i18n}><Spinner ariaLabel={label} /><LottieLoader showLabel label={label} /></I18nextProvider>,
    );
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByRole('status').getAttribute('aria-label')).toBe(label);
    expect(container.textContent).toBe(label);
  });

  it('localizes section actions and preserves the caller-specific add label', async () => {
    const i18n = await createTranslations();
    const renderHeader = (collapsed: boolean, addAriaLabel?: string) => (
      <I18nextProvider i18n={i18n}>
        <Theme>
          <ChatSectionHeader title="User section" onAdd={() => {}} addAriaLabel={addAriaLabel}
            isCollapsed={collapsed} onToggleCollapse={() => {}} />
        </Theme>
      </I18nextProvider>
    );
    const { rerender } = render(renderHeader(false));
    expect(screen.getByRole('button', { name: en.common.create })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.common.collapse })).toBeTruthy();
    await act(async () => { await i18n.changeLanguage('de-DE'); });
    expect(screen.getByRole('button', { name: de.common.create })).toBeTruthy();
    expect(screen.getByRole('button', { name: de.common.collapse })).toBeTruthy();
    rerender(renderHeader(true));
    expect(screen.getByRole('button', { name: de.common.expand })).toBeTruthy();
    rerender(renderHeader(false, 'Caller action'));
    expect(screen.getByRole('button', { name: 'Caller action' })).toBeTruthy();
  });
});
