'use client';

import { useTranslation } from 'react-i18next';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Flex, Text, Button, TextField, Callout } from '@radix-ui/themes';
import { MaterialIcon } from '@/app/components/ui/MaterialIcon';
import { WorkspaceRightPanel } from '../../components/workspace-right-panel';
import { ConfirmationDialog } from '../../components/confirmation-dialog';
import { InheritedConfigNotice } from '@/config';
import { getUserFacingErrorText } from '@/lib/api/api-error';
import type { LocalizedTextValue } from '@/lib/i18n/localized-text';
import { localizedText } from '@/lib/i18n/localized-text';
import { resolveLocalizedText } from '@/lib/i18n/localized-text';
import { WebSearchApi } from '../api';
import type {
  ConfigurableProvider,
  WebSearchProviderMeta,
  ConfiguredWebSearchProvider,
  WebSearchProviderAgentUsage,
} from '../types';

// ========================================
// Types
// ========================================

interface ConfigurePanelProps {
  open: boolean;
  provider: ConfigurableProvider | null;
  providerMeta: WebSearchProviderMeta | null;
  existingProvider: ConfiguredWebSearchProvider | null;
  inherited?: boolean;
  onClose: () => void;
  onSaveSuccess: (params: { provider: ConfigurableProvider; isEdit: boolean }) => void;
  onDeleteSuccess: (params: {
    provider: ConfigurableProvider;
    wasDefault: boolean;
  }) => void;
}

// ========================================
// Component
// ========================================

export function ConfigurePanel({
  open,
  provider,
  providerMeta,
  existingProvider,
  inherited = false,
  onClose,
  onSaveSuccess,
  onDeleteSuccess,
}: ConfigurePanelProps) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<LocalizedTextValue | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteUsageAgents, setDeleteUsageAgents] = useState<WebSearchProviderAgentUsage[]>([]);
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);
  const usageCheckedRef = useRef(false);

  const isEdit = !!existingProvider;
  const apiKeyHelpUrl = providerMeta?.apiKeyUrl ?? '';

  useEffect(() => {
    if (!open) return;
    setApiKey(existingProvider?.configuration?.apiKey ?? '');
    setShowKey(false);
    setErrorMessage(null);
    setIsSaving(false);
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setDeleteUsageAgents([]);
    setIsCheckingUsage(false);
    usageCheckedRef.current = false;
  }, [open, existingProvider]);

  const handleOpen = useCallback(
    (isOpen: boolean) => {
      if (!isOpen && !isSaving && !isDeleting) {
        onClose();
      }
    },
    [onClose, isSaving, isDeleting],
  );

  const handleSave = async () => {
    if (!provider || !providerMeta || !apiKey.trim()) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const providerData = {
        provider,
        configuration: { apiKey: apiKey.trim() },
        isDefault: existingProvider?.isDefault ?? false,
      };

      if (existingProvider) {
        await WebSearchApi.updateProvider(existingProvider.providerKey, providerData);
      } else {
        await WebSearchApi.addProvider(providerData);
      }

      onSaveSuccess({ provider, isEdit });
      onClose();
    } catch (err) {
      setErrorMessage(
        getUserFacingErrorText(err, localizedText('workspace.webSearch.configure.errors.save')),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!provider || !existingProvider) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await WebSearchApi.deleteProvider(existingProvider.providerKey);
      onDeleteSuccess({
        provider,
        wasDefault: existingProvider.isDefault,
      });
      setDeleteDialogOpen(false);
      onClose();
    } catch (err) {
      setErrorMessage(
        getUserFacingErrorText(err, localizedText('workspace.webSearch.configure.errors.delete')),
      );
      setDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!provider || !providerMeta) return null;

  const docButton = (
    <Button
      variant="outline"
      color="gray"
      size="1"
      onClick={() => window.open(providerMeta.docUrl, '_blank')}
      style={{ cursor: 'pointer', gap: 'var(--space-1)' }}
    >
      <span className="material-icons-outlined" style={{ fontSize: 14 }}>
        open_in_new
      </span>
      <Text size="1">{t('workspace.bots.documentation')}</Text>
    </Button>
  );

  const headerIcon =
    providerMeta.iconType === 'image' ? (
      <img
        src={providerMeta.icon}
        alt={providerMeta.label}
        style={{ width: 20, height: 20, objectFit: 'contain' }}
      />
    ) : (
      <MaterialIcon name={providerMeta.icon} size={20} color="var(--slate-12)" />
    );

  return (
    <>
      <WorkspaceRightPanel
        open={open}
        onOpenChange={handleOpen}
        title={providerMeta.label}
        icon={headerIcon}
        headerActions={docButton}
        primaryLabel={isEdit ? t('workspace.webSearch.configure.update') : t('action.save')}
        secondaryLabel={t('action.cancel')}
        primaryDisabled={!apiKey.trim()}
        primaryLoading={isSaving}
        onPrimaryClick={handleSave}
        onSecondaryClick={() => handleOpen(false)}
      >
        <Flex direction="column" gap="4">
          <Text size="2" style={{ color: 'var(--slate-11)' }}>
            {providerMeta.description}
          </Text>

          <InheritedConfigNotice show={isEdit && inherited} />

          {isEdit && !inherited && (
            <Callout.Root color="blue" size="1" variant="soft">
              <Callout.Icon>
                <MaterialIcon name="info" size={14} color="var(--blue-11)" />
              </Callout.Icon>
              <Callout.Text>
                {existingProvider?.isDefault
                  ? t('workspace.webSearch.configure.defaultKeyNotice')
                  : t('workspace.webSearch.configure.editNotice')}
              </Callout.Text>
            </Callout.Root>
          )}

          <Flex direction="column" gap="1">
            <Text size="1" weight="medium" style={{ color: 'var(--slate-12)' }}>
              {t('workspace.webSearch.configure.apiKeyLabel')}
            </Text>
            <TextField.Root
              type={showKey ? 'text' : 'password'}
              placeholder={t('workspace.webSearch.configure.apiKeyPlaceholder', { provider: providerMeta.label })}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isSaving || isDeleting}
            >
              <TextField.Slot>
                <MaterialIcon name="key" size={16} color="var(--slate-9)" />
              </TextField.Slot>
              <TextField.Slot side="right">
                <button
                  type="button"
                  aria-label={t(`workspace.webSearch.configure.secret.${showKey ? 'hide' : 'show'}`)}
                  onClick={() => setShowKey((v) => !v)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', border: 0, padding: 0, background: 'transparent' }}
                >
                  <MaterialIcon
                    name={showKey ? 'visibility_off' : 'visibility'}
                    size={16}
                    color="var(--slate-9)"
                  />
                </button>
              </TextField.Slot>
            </TextField.Root>
            {apiKeyHelpUrl && (
              <Text size="1" style={{ color: 'var(--slate-10)' }}>
                {t('workspace.webSearch.configure.apiKeyHelp', { url: apiKeyHelpUrl })}
              </Text>
            )}
          </Flex>

          {errorMessage && (
            <Callout.Root color="red" size="1" variant="soft">
              <Callout.Icon>
                <MaterialIcon name="error" size={14} color="var(--red-11)" />
              </Callout.Icon>
              <Callout.Text>{resolveLocalizedText(errorMessage, t)}</Callout.Text>
            </Callout.Root>
          )}

          {isEdit && (
            <Flex
              direction="column"
              gap="2"
              style={{
                marginTop: 8,
                padding: '12px',
                borderRadius: 'var(--radius-2)',
                border: '1px solid var(--red-5)',
                backgroundColor: 'var(--red-2)',
              }}
            >
              <Text size="1" weight="medium" style={{ color: 'var(--slate-12)' }}>
                {t('workspace.webSearch.configure.dangerZone')}
              </Text>
              <Text size="1" style={{ color: 'var(--slate-11)', fontWeight: 300 }}>
                {t('workspace.webSearch.configure.removeDescription')}
              </Text>
              <Flex>
                <Button
                  variant="outline"
                  color="red"
                  size="1"
                  onClick={async () => {
                    if (!provider || !existingProvider) return;
                    setDeleteDialogOpen(true);
                    if (!usageCheckedRef.current) {
                      setIsCheckingUsage(true);
                      try {
                        const agents = await WebSearchApi.getProviderUsage(existingProvider.provider);
                        setDeleteUsageAgents(agents);
                      } finally {
                        setIsCheckingUsage(false);
                        usageCheckedRef.current = true;
                      }
                    }
                  }}
                  disabled={isSaving || isDeleting}
                  style={{
                    cursor: isSaving || isDeleting ? 'not-allowed' : 'pointer',
                    gap: 4,
                  }}
                >
                  <MaterialIcon name="delete" size={14} color="var(--red-11)" />
                  {t('workspace.webSearch.configure.deleteProvider')}
                </Button>
              </Flex>
            </Flex>
          )}
        </Flex>
      </WorkspaceRightPanel>

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteUsageAgents([]);
        }}
        title={
          !isCheckingUsage && deleteUsageAgents.length > 0
            ? t('workspace.webSearch.configure.delete.cannotDelete', { provider: providerMeta.label })
            : t('workspace.webSearch.configure.delete.title', { provider: providerMeta.label })
        }
        message={
          <Flex direction="column" gap="2">
            {isCheckingUsage && (
              <Text size="2" style={{ color: 'var(--slate-10)', fontStyle: 'italic' }}>
                {t('workspace.webSearch.configure.delete.checkingUsage')}
              </Text>
            )}
            {!isCheckingUsage && deleteUsageAgents.length > 0 && (
              <Flex
                direction="column"
                gap="1"
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-2)',
                  border: '1px solid var(--red-5)',
                  backgroundColor: 'var(--red-2)',
                }}
              >
                <Text size="1" weight="medium" style={{ color: 'var(--red-11)' }}>
                  {t('workspace.webSearch.configure.delete.usage', { count: deleteUsageAgents.length })}
                </Text>
                <Flex direction="column" gap="1" style={{ paddingLeft: 4 }}>
                  {deleteUsageAgents.map((agent) => (
                    <Text key={agent._key} size="1" style={{ color: 'var(--slate-12)' }}>
                      • <Text weight="medium" size="1">{agent.name}</Text>
                      {agent.creatorName && (
                        <Text size="1" style={{ color: 'var(--slate-10)' }}>
                          {' '}{t('workspace.webSearch.configure.delete.createdBy', { creator: agent.creatorName })}
                        </Text>
                      )}
                    </Text>
                  ))}
                </Flex>
                <Text size="1" style={{ color: 'var(--red-11)', marginTop: 2 }}>
                  {t('workspace.webSearch.configure.delete.removeFromAgents')}
                </Text>
              </Flex>
            )}
            {!isCheckingUsage && deleteUsageAgents.length === 0 && (
              <Text size="2" style={{ color: 'var(--slate-12)', lineHeight: '20px' }}>
                {existingProvider?.isDefault
                  ? t('workspace.webSearch.configure.delete.defaultDescription', { provider: providerMeta.label })
                  : t('workspace.webSearch.configure.delete.description', { provider: providerMeta.label })}
              </Text>
            )}
          </Flex>
        }
        hideConfirm={isCheckingUsage || deleteUsageAgents.length > 0}
        confirmLabel={t('action.delete')}
        confirmLoadingLabel={t('action.deleting')}
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
