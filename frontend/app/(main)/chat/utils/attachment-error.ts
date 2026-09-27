'use client';

import { localizedText, type LocalizedText } from '@/lib/i18n/localized-text';

export interface AttachmentErrorMessage {
  /** Existing readable English snapshot for legacy consumers and diagnostics. */
  message: string;
  /** Present only when the wrapper/fallback was authored by the app. */
  messageText?: LocalizedText;
}

/**
 * One sentence for a chat attachment that failed to upload. The server's
 * attachment errors already start by naming the file ("Couldn't read
 * report.docx. …", "report.docx is empty. …"), so those are shown as-is;
 * anything else gets the file named once in front of it.
 */
export function attachmentErrorMessage(fileName: string, error: unknown): AttachmentErrorMessage {
  const reason =
    error instanceof Error || (error && typeof error === 'object' && 'message' in error)
      ? String((error as { message?: unknown }).message ?? '').trim()
      : '';
  if (reason.startsWith(`Couldn't read ${fileName}. `) || reason.startsWith(`${fileName} `)) {
    return { message: reason };
  }

  const inheritedMessageText =
    error && typeof error === 'object' && 'messageText' in error
      ? (error as { messageText?: unknown }).messageText
      : undefined;
  const reasonValue = isLocalizedText(inheritedMessageText) ? inheritedMessageText : reason;
  const englishReason = reason || 'Please try again.';
  return {
    message: `Couldn't attach ${fileName}. ${englishReason}`,
    messageText: reason
      ? localizedText('chat.attachments.failedToAttach', { fileName, reason: reasonValue })
      : localizedText('chat.attachments.failedToAttachFallback', { fileName }),
  };
}

function isLocalizedText(value: unknown): value is LocalizedText {
  return !!value && typeof value === 'object' && typeof (value as LocalizedText).key === 'string';
}
