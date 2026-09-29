import { describe, expect, it } from 'vitest';
import { createInstance, type Resource } from 'i18next';
import { locales } from '@/lib/i18n/locales';
import { getIndexingStatusLabel } from '../indexing-status-label';

const labels = {
  COMPLETED: 'workspace.connectors.overview.statCompleted',
  IN_PROGRESS: 'status.processing',
  FAILED: 'status.failed',
  FILE_TYPE_NOT_SUPPORTED: 'workspace.connectors.overview.statUnsupported',
  NOT_STARTED: 'workspace.connectors.overview.statNotStarted',
  QUEUED: 'workspace.connectors.overview.statQueued',
  AUTO_INDEX_OFF: 'workspace.connectors.overview.statManualIndexing',
  EMPTY: 'workspace.connectors.overview.statEmpty',
};

describe('built-in indexing status display labels', () => {
  it('uses existing keys in every catalogue, without caching a language', async () => {
    const i18n = createInstance();
    await i18n.init({
      lng: 'en-US', fallbackLng: 'en-US',
      resources: Object.fromEntries(
        Object.entries(structuredClone(locales)).map(([language, catalogue]) => [language, { translation: catalogue }]),
      ) as Resource,
    });
    for (const language of Object.keys(locales)) {
      await i18n.changeLanguage(language);
      for (const [status, key] of Object.entries(labels)) {
        expect(typeof i18n.getResource(language, 'translation', key)).toBe('string');
        expect(getIndexingStatusLabel(status, i18n.t.bind(i18n))).toBe(i18n.t(key));
      }
      for (const unknown of [undefined, '', 'CUSTOM_FUTURE_STATUS', '__proto__', 'constructor']) {
        expect(getIndexingStatusLabel(unknown, i18n.t.bind(i18n))).toBeUndefined();
      }
    }
  });
});
