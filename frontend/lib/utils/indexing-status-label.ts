import type { TFunction } from 'i18next';

/** Localize built-in status labels only; callers keep their existing unknown-status fallback. */
export function getIndexingStatusLabel(status: string | undefined, t: TFunction): string | undefined {
  switch (status) {
    case 'COMPLETED': return t('workspace.connectors.overview.statCompleted');
    case 'IN_PROGRESS': return t('status.processing');
    case 'FAILED': return t('status.failed');
    case 'FILE_TYPE_NOT_SUPPORTED': return t('workspace.connectors.overview.statUnsupported');
    case 'NOT_STARTED': return t('workspace.connectors.overview.statNotStarted');
    case 'QUEUED': return t('workspace.connectors.overview.statQueued');
    case 'AUTO_INDEX_OFF': return t('workspace.connectors.overview.statManualIndexing');
    case 'EMPTY': return t('workspace.connectors.overview.statEmpty');
    default: return undefined;
  }
}
