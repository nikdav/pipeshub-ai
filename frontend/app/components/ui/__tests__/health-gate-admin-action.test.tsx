import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { act, render, cleanup } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import testI18n from '@/lib/__tests__/test-i18n';
import de from '@/lib/i18n/locales/de-DE.json';

const toastError = vi.fn((..._args: unknown[]) => 'critical-toast');
const toastWarning = vi.fn((..._args: unknown[]) => 'non-critical-toast');
const toastUpdate = vi.fn((..._args: unknown[]) => undefined);

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/app/components/ui/MaterialIcon', () => ({ MaterialIcon: () => null }));
vi.mock('@/app/components/ui/lottie-loader', () => ({ LottieLoader: () => null }));
vi.mock('@/lib/store/toast-store', () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    warning: (...args: unknown[]) => toastWarning(...args),
    update: (...args: unknown[]) => toastUpdate(...args),
    dismiss: vi.fn(),
  },
}));
// A stable object: a fresh one each render would change effect deps and make
// the component tear its own toast down between renders.
const featureFlagsState = { fetchFlags: vi.fn() };
vi.mock('@/lib/store/feature-flags-store', () => ({
  useFeatureFlagsStore: (selector: (s: unknown) => unknown) => selector(featureFlagsState),
}));

let isAdmin: boolean | null = null;
vi.mock('@/lib/store/user-store', () => ({
  selectIsAdmin: () => isAdmin,
  useUserStore: (selector: (s: unknown) => unknown) => selector(undefined),
}));

// The component reads plain selectors and store methods from the same hook.
const healthState = {
  startBackgroundPolling: vi.fn(),
  stopBackgroundPolling: vi.fn(),
  retryServerConnection: vi.fn(),
  apiServerReachable: true,
  backgroundCheckFailed: true,
  appServices: { query: 'unhealthy' } as Record<string, 'healthy' | 'unhealthy'>,
  infraServices: {},
  infraServiceNames: {},
};

vi.mock('@/lib/store/services-health-store', () => ({
  useServicesHealthStore: (selector: (s: unknown) => unknown) => selector(healthState),
  selectApiServerReachable: (state: typeof healthState) => state.apiServerReachable,
  selectBackgroundCheckFailed: (state: typeof healthState) => state.backgroundCheckFailed,
  selectAppServices: (state: typeof healthState) => state.appServices,
  selectInfraServices: (state: typeof healthState) => state.infraServices,
  selectInfraServiceNames: (state: typeof healthState) => state.infraServiceNames,
  APP_SERVICE_LABELS: { query: 'Query Service', indexing: 'Indexing Service' },
  CRITICAL_APP_SERVICES: ['query'],
  formatServiceList: (labels: string[]) => labels.join(' and '),
}));

import { HealthGate } from '../health-gate';

testI18n.addResourceBundle('de-DE', 'translation', de, true, true);

beforeEach(async () => {
  await testI18n.changeLanguage('en-US');
  toastError.mockClear();
  toastWarning.mockClear();
  toastUpdate.mockClear();
  healthState.startBackgroundPolling.mockClear();
  healthState.stopBackgroundPolling.mockClear();
  healthState.retryServerConnection.mockClear();
  healthState.apiServerReachable = true;
  healthState.backgroundCheckFailed = true;
  healthState.appServices = { query: 'unhealthy' };
  healthState.infraServices = {};
  healthState.infraServiceNames = {};
});

afterEach(() => {
  cleanup();
  isAdmin = null;
});

describe('the "View status" action on the services toast', () => {
  it('appears once a slow-loading profile turns out to be an admin', () => {
    isAdmin = null;
    const view = render(
      <I18nextProvider i18n={testI18n}>
        <HealthGate>
          <div>body</div>
        </HealthGate>
      </I18nextProvider>,
    );

    // The toast was created before the profile resolved, so it has no action.
    const created = toastError.mock.calls[0]?.[1] as { action?: unknown } | undefined;
    expect(created?.action).toBeUndefined();

    isAdmin = true;
    view.rerender(
      <I18nextProvider i18n={testI18n}>
        <HealthGate>
          <div>body</div>
        </HealthGate>
      </I18nextProvider>,
    );

    const updated = toastUpdate.mock.calls.at(-1)?.[1] as
      | { action?: { label: string } }
      | undefined;
    expect(updated?.action?.label).toBe('View status');
  });

  it('updates the existing non-critical admin toast when language and service labels change', async () => {
    isAdmin = true;
    healthState.appServices = { query: 'healthy', indexing: 'unhealthy' };
    render(
      <I18nextProvider i18n={testI18n}>
        <HealthGate>
          <div>body</div>
        </HealthGate>
      </I18nextProvider>,
    );

    expect(toastWarning).toHaveBeenCalledTimes(1);
    expect(healthState.startBackgroundPolling).toHaveBeenCalledTimes(1);
    const createdTitle = toastWarning.mock.calls[0]?.[0] as { key: string; values?: Record<string, unknown> };
    expect(createdTitle.values?.services).toBe('Indexing Service');

    await act(async () => { await testI18n.changeLanguage('de-DE'); });

    expect(toastWarning).toHaveBeenCalledTimes(1);
    expect(healthState.startBackgroundPolling).toHaveBeenCalledTimes(1);
    const [toastId, updates] = toastUpdate.mock.calls.at(-1) as [string, { title: { key: string; values?: Record<string, unknown> } }];
    expect(toastId).toBe('non-critical-toast');
    expect(updates.title.values?.services).toBe('Indizierungsdienst');
    expect(testI18n.t(updates.title.key, updates.title.values)).toBe('Indizierungsdienst ist derzeit nicht verfügbar');
  });
});
