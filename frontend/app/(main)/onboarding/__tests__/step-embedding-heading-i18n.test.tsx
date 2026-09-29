import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import testI18n from '@/lib/__tests__/test-i18n';
import de from '@/lib/i18n/locales/de-DE.json';
import { StepEmbeddingModel } from '../components/step-embedding-model';

const api = vi.hoisted(() => ({
  getRegistry: vi.fn(),
  getAllModels: vi.fn(),
}));

vi.mock('@/app/(main)/workspace/ai-models/api', () => ({ AIModelsApi: api }));
vi.mock('@/app/(main)/workspace/ai-models/components', () => ({
  ProviderGrid: () => null,
  ModelConfigDialog: () => null,
}));
vi.mock('@/app/(main)/workspace/components', () => ({
  DestructiveTypedConfirmationDialog: () => null,
}));

describe('embedding onboarding step heading', () => {
  beforeEach(async () => {
    testI18n.addResourceBundle('de-DE', 'translation', de, true, true);
    await testI18n.changeLanguage('en-US');
    api.getRegistry.mockResolvedValue({ providers: [] });
    api.getAllModels.mockResolvedValue({ models: {} });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the translated embedding label and required marker when the language changes', async () => {
    render(
      <I18nextProvider i18n={testI18n}>
        <StepEmbeddingModel
          systemStepIndex={2}
          totalSystemSteps={4}
          embeddingDefaultDialog={false}
          setEmbeddingDefaultDialog={vi.fn()}
        />
      </I18nextProvider>,
    );

    const heading = screen.getByText('Step 2/4: Configure Embedding Model*');
    expect(heading.textContent).not.toContain('{{');

    await act(async () => {
      await testI18n.changeLanguage('de-DE');
    });

    const translatedHeading = screen.getByText('Schritt 2/4: Embedding-Modell* konfigurieren');
    expect(translatedHeading.textContent).not.toContain('{{');
  });
});
