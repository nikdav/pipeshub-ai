'use client';

import React, { useState } from 'react';
import { Flex, Text, Checkbox } from '@radix-ui/themes';
import { KnowledgeItemIcon } from '@/app/components/ui/knowledge-item-icon';
import { ConnectorIcon, resolveConnectorType } from '@/app/components/ui/ConnectorIcon';
import { ThemeableAssetIcon, themeableAssetIconPresets } from '@/app/components/ui/themeable-asset-icon';
import { AGENT_KNOWLEDGE_FALLBACK_ICON } from '@/app/(main)/agents/agent-builder/display-utils';
import { useTranslation } from 'react-i18next';
import { resolveLocalizedText, type LocalizedText } from '@/lib/i18n/localized-text';

interface CollectionRowProps {
  id: string;
  name: string;
  nameText?: LocalizedText;
  /** Knowledge graph entry `type` (e.g. `KB`, `Jira`) — selects row icon. */
  sourceType?: string;
  isSelected: boolean;
  onToggle: (id: string) => void;
  counts?: {
    folders: number;
    files: number;
  };
}

const CHECKBOX_ALIGN: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  lineHeight: 0,
};

/** Leading icon for a collection / KB / connector row (also used on hub roots in collections-tab). */
export function CollectionLeadingIcon({ sourceType, size = 20 }: { sourceType?: string; size?: number }) {
  if (!sourceType?.trim()) {
    return <KnowledgeItemIcon kind="collection" size={size} />;
  }
  const normalized = sourceType.trim();
  if (normalized.toUpperCase() === 'KB') {
    return (
      <ThemeableAssetIcon
        src={AGENT_KNOWLEDGE_FALLBACK_ICON}
        size={size}
        {...themeableAssetIconPresets.agentBuilderCategoryRow}
      />
    );
  }
  return <ConnectorIcon type={resolveConnectorType(normalized)} size={size} />;
}

/**
 * A single selectable collection row with checkbox, folder icon, and name.
 */
export function CollectionRow({
  id,
  name,
  nameText,
  sourceType,
  isSelected,
  onToggle,
  counts,
}: CollectionRowProps) {
  const { t } = useTranslation();
  const displayName = resolveLocalizedText(nameText, t, name);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Flex
      align="center"
      justify="between"
      onClick={() => onToggle(id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '100%',
        minWidth: 0,
        height: 'var(--space-7)',
        backgroundColor: isHovered ? 'var(--olive-3)' : 'var(--olive-2)',
        border: '1px solid var(--olive-3)',
        borderRadius: 'var(--radius-1)',
        paddingLeft: 'var(--space-3)',
        paddingRight: 'var(--space-2)',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
        boxSizing: 'border-box',
      }}
    >
      {/* Left: checkbox + icon + name */}
      <Flex align="center" gap="2" style={{ minWidth: 0, flex: 1 }}>
        <span style={CHECKBOX_ALIGN}>
          <Checkbox
            size="1"
            variant="classic"
            checked={isSelected}
            onCheckedChange={() => onToggle(id)}
            onClick={(e) => e.stopPropagation()}
          />
        </span>
        <CollectionLeadingIcon sourceType={sourceType} size={20} />
        <Text
          size="2"
          weight="medium"
          style={{
            flex: 1,
            minWidth: 0,
            color: 'var(--slate-11)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {displayName}
        </Text>
      </Flex>

      {/* Right: folder/file counts */}
      {counts && (
        <Text
          size="1"
          style={{
            color: 'var(--olive-9)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {t('chat.collectionRow.folders', {
            count: counts.folders,
            defaultValue: `${counts.folders} ${counts.folders === 1 ? 'folder' : 'folders'}`,
          })} & {t('chat.collectionRow.files', {
            count: counts.files,
            defaultValue: `${counts.files} ${counts.files === 1 ? 'file' : 'files'}`,
          })}
        </Text>
      )}

    </Flex>
  );
}
