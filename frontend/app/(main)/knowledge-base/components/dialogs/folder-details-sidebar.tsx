'use client';

import { Box, Flex, Text, IconButton, Dialog, VisuallyHidden } from '@radix-ui/themes';
import { MaterialIcon } from '@/app/components/ui/MaterialIcon';
import { FolderIcon } from '@/app/components/ui';
import { useTranslation } from 'react-i18next';
import type { KnowledgeHubApiResponse } from '../../types';
import { isKbCollectionsHubApp } from '../../utils/all-records-transformer';

interface FolderDetailsSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableData: KnowledgeHubApiResponse | null;
}

interface DetailRowProps {
  label: string;
  value: string | string[] | null | undefined;
}

function DetailRow({ label, value }: DetailRowProps) {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return null;
  }

  const displayValue = Array.isArray(value) ? value.join(', ') : value;

  return (
    <Box
      style={{
        background: 'var(--olive-2)',
        border: '1px solid var(--olive-3)',
        borderRadius: 'var(--radius-1)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
      }}
    >
      <Text size="1" weight="medium" style={{ color: 'var(--slate-10)' }}>
        {label}
      </Text>
      <Text size="3" weight="medium" style={{ color: 'var(--slate-12)' }}>
        {displayValue}
      </Text>
    </Box>
  );
}

function formatNodeType(
  nodeType: string,
  t: (key: string) => string,
  node?: { connector?: string; subType?: string } | null,
): string {
  switch (nodeType) {
    case 'kb': return t('knowledgeBase.folderDetails.collection');
    case 'folder': return t('knowledgeBase.folderDetails.folder');
    case 'recordGroup': return t('knowledgeBase.folderDetails.recordGroup');
    case 'app': return node && isKbCollectionsHubApp(node)
      ? t('knowledgeBase.folderDetails.collection')
      : t('knowledgeBase.folderDetails.connector');
    default: return nodeType;
  }
}

function formatTimestamp(timestamp: number | undefined, locale: string): string | undefined {
  if (!timestamp) return undefined;
  return new Intl.DateTimeFormat(locale, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(timestamp));
}

export function FolderDetailsSidebar({ open, onOpenChange, tableData }: FolderDetailsSidebarProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language;
  const currentNode = tableData?.currentNode;
  const breadcrumbs = tableData?.breadcrumbs;
  const permissions = tableData?.permissions;
  const counts = tableData?.counts;

  const originName = breadcrumbs && breadcrumbs.length > 0 ? breadcrumbs[0].name : undefined;
  const totalItems = counts?.total != null
    ? new Intl.NumberFormat(locale).format(counts.total)
    : undefined;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        style={{
          position: 'fixed',
          top: 10,
          right: 10,
          bottom: 10,
          width: '37.5rem',
          maxWidth: '100vw',
          maxHeight: 'calc(100vh - 20px)',
          padding: 0,
          margin: 0,
          backgroundColor: 'var(--effects-translucent)',
          border: '1px solid var(--olive-3)',
          borderRadius: 'var(--radius-2)',
          backdropFilter: 'blur(25px)',
          boxShadow: '0 20px 48px 0 rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transform: 'none',
          animation: 'slideInFromRight 0.2s ease-out',
        }}
      >
        <VisuallyHidden>
          <Dialog.Title>{currentNode?.name || t('knowledgeBase.folderDetails.title')}</Dialog.Title>
        </VisuallyHidden>

        {/* Header */}
        <Flex
          align="center"
          justify="between"
          style={{
            padding: '8px 8px 8px 16px',
            borderBottom: '1px solid var(--olive-3)',
            backgroundColor: 'var(--effects-translucent)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Flex align="center" gap="2" style={{ flex: 1, minWidth: 0 }}>
            <FolderIcon variant="default" size={24} color="var(--emerald-11)" />
            <Text
              size="2"
              weight="medium"
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'var(--slate-12)',
              }}
            >
              {currentNode?.name || t('knowledgeBase.folderDetails.folder')}
            </Text>
          </Flex>

          <Flex align="center" gap="1">
            <IconButton
              variant="ghost"
              color="gray"
              size="2"
              onClick={() => onOpenChange(false)}
            >
              <MaterialIcon name="close" size={16} color="var(--slate-11)" />
            </IconButton>
          </Flex>
        </Flex>

        {/* Content */}
        <Box
          className="no-scrollbar"
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 'var(--space-4)',
          }}
        >
          {!currentNode ? (
            <Flex
              align="center"
              justify="center"
              style={{
                height: '100%',
                padding: 'var(--space-6)',
              }}
            >
              <Text size="2" style={{ color: 'var(--olive-a11)' }}>
                {t('knowledgeBase.folderDetails.empty')}
              </Text>
            </Flex>
          ) : (
            <Flex direction="column" gap="5">
              {/* Metadata Section */}
              <Flex direction="column" gap="2">
                <Text size="3" weight="medium" style={{ color: 'var(--slate-12)' }}>
                  {t('knowledgeBase.folderDetails.metadata')}
                </Text>

                <Flex direction="column" gap="2">
                  <DetailRow label={t('form.name')} value={currentNode.name} />
                  <DetailRow label={t('knowledgeBase.folderDetails.recordType')} value={formatNodeType(currentNode.nodeType, t, currentNode)} />
                  <DetailRow label={t('knowledgeBase.folderDetails.origin')} value={originName} />
                  <DetailRow label={t('knowledgeBase.folderDetails.indexingStatus')} value={currentNode.indexingStatus} />
                  <DetailRow label={t('knowledgeBase.folderDetails.totalItems')} value={totalItems} />
                  <DetailRow label={t('knowledgeBase.folderDetails.version')} value={currentNode.version?.toString()} />
                  <DetailRow label={t('knowledgeBase.folderDetails.createdAt')} value={formatTimestamp(currentNode.createdAt, locale)} />
                  <DetailRow label={t('knowledgeBase.folderDetails.updatedAt')} value={formatTimestamp(currentNode.updatedAt, locale)} />
                  <DetailRow label={t('knowledgeBase.folderDetails.permissions')} value={permissions?.role} />
                </Flex>
              </Flex>
            </Flex>
          )}
        </Box>
      </Dialog.Content>
    </Dialog.Root>
  );
}
