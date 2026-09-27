import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { I18nextProvider } from 'react-i18next';
import testI18n, { en } from '@/lib/__tests__/test-i18n';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

let isAdmin: boolean | null = null;

vi.mock('@/lib/store/user-store', () => ({
  selectIsAdmin: () => isAdmin,
  useUserStore: (selector: (state: unknown) => unknown) => selector(undefined),
}));

vi.mock('@/lib/store/services-health-store', () => ({
  useServicesHealthStore: (selector: (state: unknown) => unknown) => selector(undefined),
  selectAppServices: () => ({ query: 'unhealthy', connector: 'healthy' }),
  formatServiceList: (labels: string[]) => labels.join(' and '),
}));

import { ServiceGate } from '../service-gate';

afterEach(() => {
  cleanup();
  isAdmin = null;
});

function renderGate() {
  return render(
    <I18nextProvider i18n={testI18n}>
      <Theme>
        <ServiceGate services={['query']}>
          <div>page body</div>
        </ServiceGate>
      </Theme>
    </I18nextProvider>,
  );
}

describe('ServiceGate when a service is down', () => {
  it('names the service for an admin, who can act on it', () => {
    isAdmin = true;
    renderGate();
    // The sentence names it, and the badge repeats it.
    const serviceLabel = en.workspace.services.app.query.label;
    expect(screen.getAllByText((content) => content.includes(serviceLabel)).length).toBeGreaterThan(0);
  });

  it.each([
    ['a member', false as boolean | null],
    ['a profile that has not loaded', null as boolean | null],
  ])('tells %s what to expect without naming services', (_label, admin) => {
    isAdmin = admin;
    renderGate();
    const serviceLabel = en.workspace.services.app.query.label;
    expect(screen.queryByText((content) => content.includes(serviceLabel))).toBeNull();
    expect(screen.getByText(en.healthGate.serviceGate.memberDescription)).toBeTruthy();
  });
});
