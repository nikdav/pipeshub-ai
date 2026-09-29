import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { createInstance, type Resource } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { locales } from '@/lib/i18n/locales';
import type { RecordDetailsResponse } from '@/app/(main)/knowledge-base/types';
import { RecordMetadataPanel } from '@/app/(main)/record/components/record-metadata-panel';
import { FileDetailsTab } from '../file-details-tab';

vi.mock('@/app/components/ui/ConnectorIcon', () => ({
  ConnectorIcon: () => null,
  resolveConnectorType: (value: string) => value,
}));
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const created = new Date(2026, 2, 5, 12).getTime();
const updated = new Date(2026, 8, 26, 12).getTime();
const fixture = {
  record: {
    id: 'original-record-id', recordName: 'User record.docx', recordType: 'FILE',
    origin: 'UPLOAD', indexingStatus: 'FAILED', reason: 'Original server reason',
    createdAtTimestamp: created, updatedAtTimestamp: updated,
  },
  knowledgeBase: { name: 'User collection' },
  permissions: [{ id: 'permission-id', relationship: 'READER' }],
  metadata: { departments: [], categories: [], topics: [] },
} as RecordDetailsResponse;

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

describe('record metadata localization', () => {
  it.each([
    ['preview details', FileDetailsTab],
    ['record details', RecordMetadataPanel],
  ] as const)('updates dates and known status/permission labels in %s', async (_name, Component) => {
    const i18n = await translations();
    const details = structuredClone(fixture);
    render(<I18nextProvider i18n={i18n}><Theme><Component recordDetails={details} /></Theme></I18nextProvider>);
    for (const language of ['en-US', 'de-DE', 'zh-CN']) {
      await act(async () => { await i18n.changeLanguage(language); });
      expect(screen.getByText(i18n.t('status.failed'))).toBeTruthy();
      expect(screen.getByText(i18n.t('recordView.permissionReader'))).toBeTruthy();
      expect(screen.getByText(i18n.t('recordView.labels.originUpload'))).toBeTruthy();
      for (const timestamp of [created, updated]) {
        expect(screen.getByText(new Date(timestamp).toLocaleDateString(language, {
          day: 'numeric', month: 'short', year: 'numeric',
        }))).toBeTruthy();
      }
      expect(screen.getByText('User record.docx')).toBeTruthy();
      expect(screen.getByText('User collection')).toBeTruthy();
    }
    expect(details).toEqual(fixture);
  });

  it('preserves unknown status and permission values in the preview', async () => {
    const i18n = await translations();
    await i18n.changeLanguage('de-DE');
    const details = structuredClone(fixture);
    Object.assign(details.record, { indexingStatus: 'CUSTOM_STATUS' });
    Object.assign(details.permissions![0], { relationship: 'CUSTOM_PERMISSION' });
    render(<I18nextProvider i18n={i18n}><Theme><FileDetailsTab recordDetails={details} /></Theme></I18nextProvider>);
    expect(screen.getByText('CUSTOM_STATUS')).toBeTruthy();
    expect(screen.getByText('CUSTOM_PERMISSION')).toBeTruthy();
  });

  it('uses source timestamps, including zero, in the record details', async () => {
    const i18n = await translations();
    await i18n.changeLanguage('de-DE');
    const details = structuredClone(fixture);
    details.record.sourceCreatedAtTimestamp = 0;
    details.record.sourceLastModifiedTimestamp = created;
    render(<I18nextProvider i18n={i18n}><Theme><RecordMetadataPanel recordDetails={details} /></Theme></I18nextProvider>);
    for (const timestamp of [0, created]) {
      expect(screen.getByText(new Date(timestamp).toLocaleDateString('de-DE', {
        day: 'numeric', month: 'short', year: 'numeric',
      }))).toBeTruthy();
    }
  });
});
