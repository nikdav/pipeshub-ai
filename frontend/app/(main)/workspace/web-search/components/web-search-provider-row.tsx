'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Flex, Box, Text, Switch, Badge, Button, IconButton, Tooltip } from '@radix-ui/themes';
import { MaterialIcon } from '@/app/components/ui/MaterialIcon';
import type {
  WebSearchProviderMeta,
  ConfigurableProvider,
  ConfiguredWebSearchProvider,
} from '../types';

// ========================================
// Types
// ========================================

interface WebSearchProviderRowProps {
  meta: WebSearchProviderMeta;
  configured: ConfiguredWebSearchProvider | null;
  isDefault: boolean;
  isSettingDefault: boolean;
  anyActionInProgress: boolean;
  inherited?: boolean;
  onSetDefault: () => void;
  onConfigure: (type: ConfigurableProvider) => void;
  onDelete: () => void;
}

// ========================================
// Component
// ========================================

export function WebSearchProviderRow({
  meta,
  configured,
  isDefault,
  isSettingDefault,
  anyActionInProgress,
  inherited = false,
  onSetDefault,
  onConfigure,
  onDelete,
}: WebSearchProviderRowProps) {
  const { t } = useTranslation();
  const isConfigurable = meta.configurable;
  // DuckDuckGo is always considered "configured" (built-in)
  const isConfigured = isConfigurable ? !!configured : true;

  const renderBadge = () => {
    if (isDefault) {
      return (
        <Badge color="blue" variant="soft" size="1">
          {t('workspace.webSearch.badges.default')}
        </Badge>
      );
    }
    if (!isConfigurable) {
      return (
        <Badge color="gray" variant="soft" size="1">
          {t('workspace.webSearch.badges.builtIn')}
        </Badge>
      );
    }
    return (
      <Badge color={isConfigured ? 'green' : 'orange'} variant="soft" size="1">
        {isConfigured
          ? t('workspace.webSearch.badges.configured')
          : t('workspace.webSearch.badges.notConfigured')}
      </Badge>
    );
  };

  const setDefaultDisabled = !isConfigured || isDefault || anyActionInProgress;
  const setDefaultTooltip = !isConfigured
    ? t('workspace.webSearch.actions.configureBeforeDefault')
    : '';

  return (
    <Flex
      align="center"
      gap="3"
      style={{
        padding: '12px 14px',
        border: '1px solid var(--olive-3)',
        borderRadius: 'var(--radius-1)',
        background: 'var(--olive-2)',
      }}
    >
      {/* Icon */}
      <Flex
        align="center"
        justify="center"
        style={{
          width: 'var(--space-9)',
          height: 'var(--space-9)',
          borderRadius: 'var(--radius-2)',
          backgroundColor: 'var(--slate-3)',
          flexShrink: 0,
        }}
      >
        {meta.iconType === 'image' ? (
          <img
            src={meta.icon}
            alt={meta.label}
            style={{ width: 18, height: 18, objectFit: 'contain' }}
          />
        ) : (
          <MaterialIcon name={meta.icon} size={18} color="var(--slate-11)" />
        )}
      </Flex>

      {/* Label + description */}
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Text size="2" weight="medium" style={{ color: 'var(--slate-12)', display: 'block' }}>
          {meta.label}
        </Text>
        <Text
          size="1"
          style={{
            color: 'var(--slate-10)',
            display: 'block',
            marginTop: 2,
            fontWeight: 300,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {meta.type === 'duckduckgo'
            ? t('workspace.webSearch.providers.builtInDescription')
            : meta.description}
        </Text>
      </Box>

      {/* Right side: badge + set-default + configure + delete */}
      <Flex align="center" gap="2" style={{ flexShrink: 0 }}>
        {renderBadge()}

        {/* Set as Default */}
        {!isDefault && !(inherited && isConfigurable) && (
          setDefaultTooltip ? (
            <Tooltip content={setDefaultTooltip}>
              <span style={{ display: 'inline-flex' }}>
                <Button
                  variant="outline"
                  color="gray"
                  size="1"
                  disabled
                  style={{ cursor: 'not-allowed', gap: 4 }}
                >
                  <MaterialIcon name="star" size={14} color="var(--slate-10)" />
                  {t('workspace.webSearch.actions.setAsDefault')}
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Button
              variant="outline"
              color="gray"
              size="1"
              onClick={onSetDefault}
              disabled={setDefaultDisabled}
              style={{ cursor: setDefaultDisabled ? 'not-allowed' : 'pointer', gap: 4 }}
            >
              <MaterialIcon name="star" size={14} color="var(--slate-10)" />
              {isSettingDefault
                ? t('workspace.webSearch.actions.setting')
                : t('workspace.webSearch.actions.setAsDefault')}
            </Button>
          )
        )}

        {/* Configure (gear) */}
        {isConfigurable && (
          <Tooltip content={isConfigured
            ? t('workspace.webSearch.actions.editConfiguration')
            : t('workspace.webSearch.configureTip')}>
            <IconButton
              variant="ghost"
              color="gray"
              size="2"
              aria-label={isConfigured
                ? t('workspace.webSearch.actions.editConfiguration')
                : t('workspace.webSearch.configureTip')}
              onClick={() => onConfigure(meta.type as ConfigurableProvider)}
              disabled={anyActionInProgress}
              style={{ cursor: anyActionInProgress ? 'not-allowed' : 'pointer' }}
            >
              <MaterialIcon
                name={isConfigured ? 'edit' : 'settings'}
                size={16}
                color="var(--slate-10)"
              />
            </IconButton>
          </Tooltip>
        )}

        {/* Delete */}
        {isConfigurable && isConfigured && (
          <Tooltip content={t('workspace.webSearch.actions.deleteConfiguration')}>
            <IconButton
              variant="ghost"
              color="red"
              size="2"
              aria-label={t('workspace.webSearch.actions.deleteConfiguration')}
              onClick={onDelete}
              disabled={anyActionInProgress}
              style={{ cursor: anyActionInProgress ? 'not-allowed' : 'pointer' }}
            >
              <MaterialIcon name="delete" size={16} color="var(--red-10)" />
            </IconButton>
          </Tooltip>
        )}
      </Flex>
    </Flex>
  );
}
