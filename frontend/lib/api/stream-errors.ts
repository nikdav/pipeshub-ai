'use client';

import { extractApiErrorMessage } from './api-error';
import { localizedText, type LocalizedText } from '@/lib/i18n/localized-text';

/**
 * What a person reads when a streamed request (chat, agent chat) fails. The
 * error's message becomes the assistant's reply, so it must never be a status
 * line or a browser network error.
 */
export const STREAM_ERROR_MESSAGES = {
  sessionExpired: 'Your session has expired. Sign in again to continue.',
  forbidden: "You don't have access to this. Ask a workspace admin if you need it.",
  offline: "Couldn't reach PipesHub. Check your internet connection, then try again.",
  interrupted: 'The connection to PipesHub dropped before this finished. Please try again.',
  unavailable: 'PipesHub is having trouble right now. Please try again in a minute.',
} as const;

/** Chat shows the error as the assistant's reply, so it speaks about the answer. */
export const CHAT_STREAM_ERROR_MESSAGES = {
  ...STREAM_ERROR_MESSAGES,
  interrupted:
    'The answer was interrupted before it finished. Click Regenerate or send your message again.',
  unavailable: "PipesHub couldn't answer right now. Please try again in a minute.",
} as const;

const STREAM_ERROR_TEXT = {
  sessionExpired: localizedText('common.errors.stream.sessionExpired'),
  forbidden: localizedText('common.errors.stream.forbidden'),
  offline: localizedText('common.errors.stream.offline'),
  interrupted: localizedText('common.errors.stream.interrupted'),
  unavailable: localizedText('common.errors.stream.unavailable'),
} satisfies Record<keyof typeof STREAM_ERROR_MESSAGES, LocalizedText>;

const CHAT_STREAM_ERROR_TEXT = {
  ...STREAM_ERROR_TEXT,
  interrupted: localizedText('common.errors.stream.chatInterrupted'),
  unavailable: localizedText('common.errors.stream.chatUnavailable'),
} satisfies Record<keyof typeof CHAT_STREAM_ERROR_MESSAGES, LocalizedText>;

type StreamErrorMessages = typeof STREAM_ERROR_MESSAGES | typeof CHAT_STREAM_ERROR_MESSAGES;

/** An error whose message was written for the user, so it can be shown as-is. */
export class StreamError extends Error {
  readonly status?: number;
  readonly messageText?: LocalizedText;

  constructor(message: string, status?: number, messageText?: LocalizedText) {
    super(message);
    this.name = 'StreamError';
    this.status = status;
    this.messageText = messageText;
  }
}

export function busyStreamMessage(retryAfterSeconds?: number): string {
  return retryAfterSeconds
    ? `PipesHub is busy right now. Please try again in ${retryAfterSeconds} second${retryAfterSeconds === 1 ? '' : 's'}.`
    : 'PipesHub is busy right now. Please try again in a few seconds.';
}

function busyStreamText(retryAfterSeconds?: number): LocalizedText {
  return retryAfterSeconds
    ? localizedText('common.errors.stream.busyRetry', { count: retryAfterSeconds })
    : localizedText('common.errors.stream.busy');
}

// Server text that is a raw error rather than a sentence for the user.
const TECHNICAL_TEXT =
  /traceback|\b\w+(Error|Exception)\b|\[object Object\]|status code|NoneType|undefined|ECONN|socket|^\s*\d{3}\b|\{\s*"|'\w+'$/i;

function readableServerMessage(body: unknown): string | null {
  const message = extractApiErrorMessage(body);
  return message && !TECHNICAL_TEXT.test(message) ? message : null;
}

function retryAfterSeconds(response: Response): number | undefined {
  const seconds = Number(response.headers.get('retry-after'));
  return Number.isInteger(seconds) && seconds > 0 && seconds <= 120 ? seconds : undefined;
}

/**
 * Builds the error for a stream request the server refused before streaming
 * began. A clear message from the server is kept for a 4xx; otherwise the
 * status picks a fixed message with a next step.
 */
export async function streamHttpError(
  response: Response,
  messages: StreamErrorMessages = STREAM_ERROR_MESSAGES,
): Promise<StreamError> {
  const texts = messages === CHAT_STREAM_ERROR_MESSAGES
    ? CHAT_STREAM_ERROR_TEXT
    : STREAM_ERROR_TEXT;
  let body: unknown = null;
  try {
    body = await response.clone().json();
  } catch {
    // Not JSON (a proxy's HTML page, an empty body): fall back on the status.
  }
  const { status } = response;
  if (status === 401) return new StreamError(messages.sessionExpired, status, texts.sessionExpired);
  if (status === 429 || status === 503 || status === 504) {
    const retryAfter = retryAfterSeconds(response);
    return new StreamError(busyStreamMessage(retryAfter), status, busyStreamText(retryAfter));
  }
  if (status >= 400 && status < 500) {
    const serverMessage = readableServerMessage(body);
    if (serverMessage) return new StreamError(serverMessage, status);
    if (status === 403) return new StreamError(messages.forbidden, status, texts.forbidden);
  }
  return new StreamError(messages.unavailable, status, texts.unavailable);
}

/**
 * The message for a stream that failed in the browser: the request never
 * reached PipesHub, or the connection dropped part-way through an answer.
 * Errors this module already built pass through unchanged.
 */
export function streamFailure(
  error: unknown,
  responseStarted: boolean,
  messages: StreamErrorMessages = STREAM_ERROR_MESSAGES,
): StreamError {
  if (error instanceof StreamError) return error;
  const texts = messages === CHAT_STREAM_ERROR_MESSAGES
    ? CHAT_STREAM_ERROR_TEXT
    : STREAM_ERROR_TEXT;
  const kind = responseStarted ? 'interrupted' : 'offline';
  return new StreamError(messages[kind], undefined, texts[kind]);
}
