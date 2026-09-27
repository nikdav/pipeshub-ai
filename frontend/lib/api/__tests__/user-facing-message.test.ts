import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import {
  ErrorType,
  getUserFacingErrorMessage,
  getUserFacingErrorText,
  isSearchNoAccessibleDocumentsNotFound,
  processError,
  SEARCH_ACCESSIBLE_RECORDS_NOT_FOUND_STATUS,
  SEARCH_NO_ACCESSIBLE_DOCUMENTS_FRAGMENT,
} from '../api-error';
import { localizedText } from '@/lib/i18n/localized-text';
import { i18n } from '@/lib/i18n';

const FALLBACK = 'We couldn\'t do that. Please try again in a moment.';

function httpError(status: number, data: unknown) {
  const error = new AxiosError(`Request failed with status code ${status}`);
  error.response = {
    status,
    statusText: '',
    data,
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  } as never;
  return error as AxiosError<never>;
}

describe('getUserFacingErrorMessage', () => {
  it("keeps the server's words when they were written for a reader", () => {
    const message = 'This collection was removed. Refresh the page to see the current list.';
    expect(getUserFacingErrorMessage(new Error(message), FALLBACK)).toBe(message);
  });

  it.each([
    ['axios wording', 'Request failed with status code 500'],
    ['a Python repr', "KeyError: 'llm'"],
    ['a traceback', 'Traceback (most recent call last): ...'],
    ['an object that never stringified', 'Backend error: [object Object]'],
    ['an internal service name', 'Error publishing to Kafka topic records'],
    ['a socket code', 'read ECONNRESET'],
    ['a record id', 'Record 65f1c2ab9e4d7a3b1c0d8e2f could not be read'],
  ])('replaces %s with the caller\'s fallback', (_label, message) => {
    expect(getUserFacingErrorMessage(new Error(message), FALLBACK)).toBe(FALLBACK);
  });

  it('falls back when there is no message at all', () => {
    expect(getUserFacingErrorMessage(undefined, FALLBACK)).toBe(FALLBACK);
    expect(getUserFacingErrorMessage({ message: '   ' }, FALLBACK)).toBe(FALLBACK);
  });

  it('reads a processed API error', () => {
    const processed = processError(httpError(403, { reason: 'You can only share collections you own.' }));
    expect(processed.type).toBe(ErrorType.AUTHORIZATION_ERROR);
    expect(getUserFacingErrorMessage(processed, FALLBACK)).toBe(
      'You can only share collections you own.',
    );
  });

  it('keeps a readable sentence that happens to mention a status code', () => {
    const message = 'The status code field is required.';
    expect(getUserFacingErrorMessage(new Error(message), FALLBACK)).toBe(message);
  });

  it('keeps the plain sentence a real request id travels beside', () => {
    // A signed-in request id is `<24-hex user id>-<nanoid>`, so the id must not
    // sit inside the sentence: it would look technical and take the words with it.
    const processed = processError(
      httpError(500, {
        error: {
          code: 'INTERNAL_ERROR',
          message:
            "Something went wrong on PipesHub's side. Please try again; if it keeps happening, ask your admin for help.",
          requestId: '65f1c2ab9e4d7a3b1c0d8e2f-AbC123',
        },
      }),
    );
    expect(processed.requestId).toBe('65f1c2ab9e4d7a3b1c0d8e2f-AbC123');
    expect(getUserFacingErrorMessage(processed, FALLBACK)).toContain(
      "went wrong on PipesHub's side",
    );
  });

  it("reads an axios error's body, not axios's own wording", () => {
    // An AxiosError is also an Error, so order matters here.
    const error = httpError(403, { reason: 'You can only share collections you own.' });
    expect(error).toBeInstanceOf(Error);
    expect(getUserFacingErrorMessage(error, FALLBACK)).toBe(
      'You can only share collections you own.',
    );
  });

  it.each([
    ['a null message', { type: ErrorType.SERVER_ERROR, message: null }],
    ['a number message', { message: 42 }],
    ['an object message', { message: { nested: true } }],
    ['a bare string', 'just a string'],
    ['null', null],
  ])('does not throw on %s', (_label, value) => {
    expect(() => getUserFacingErrorMessage(value, FALLBACK)).not.toThrow();
    expect(getUserFacingErrorMessage(value, FALLBACK)).toBe(FALLBACK);
  });

  it('never surfaces axios text for a 500 with an empty body', () => {
    const processed = processError(httpError(500, {}));
    expect(processed.message).not.toMatch(/status code/);
    expect(getUserFacingErrorMessage(processed, FALLBACK)).toBe(
      'Server error. Please try again later.',
    );
  });
});

describe('getUserFacingErrorText', () => {
  const fallback = localizedText('chatStream.errorFallback');

  it('keeps readable Axios response wording verbatim', () => {
    const error = httpError(403, { reason: 'You can only share collections you own.' });
    expect(getUserFacingErrorText(error, fallback)).toBe('You can only share collections you own.');
  });

  it('uses the descriptor fallback for technical Axios response wording', () => {
    const error = httpError(500, { message: 'Error publishing to Kafka topic records' });
    expect(getUserFacingErrorText(error, fallback)).toEqual(fallback);
  });

  it('preserves a descriptor for a locally authored Axios fallback', () => {
    const error = httpError(500, {});
    expect(getUserFacingErrorText(error, fallback)).toEqual(localizedText('common.errors.api.server'));
  });
});

describe('processError localized compatibility snapshots', () => {
  it('localizes connection and HTTP fallback snapshots with the active catalogue', async () => {
    const previousLanguage = i18n.language;
    await i18n.changeLanguage('de-DE');
    try {
      const cases = [
        [new AxiosError('canceled', 'ERR_CANCELED'), 'Anfrage wurde abgebrochen.', 'cancelled'],
        [new AxiosError('timeout of 1000ms exceeded', 'ECONNABORTED'), 'Zeitüberschreitung bei der Anfrage. Bitte versuchen Sie es erneut.', 'timeout'],
        [new AxiosError('Network Error'), 'Netzwerkfehler. Bitte überprüfen Sie Ihre Verbindung.', 'network'],
      ] as const;

      for (const [error, message, key] of cases) {
        const processed = processError(error);
        expect(processed.message).toBe(message);
        expect(processed.messageText).toEqual(localizedText(`common.errors.api.${key}`));
      }

      const httpProcessed = processError(httpError(500, {}));
      expect(httpProcessed.message).toBe('Serverfehler. Bitte versuchen Sie es später erneut.');
      expect(httpProcessed.messageText).toEqual(localizedText('common.errors.api.server'));
    } finally {
      await i18n.changeLanguage(previousLanguage);
    }
  });

  it('leaves server-authored search status and message sentinel unchanged', () => {
    const processed = processError(httpError(404, {
      status: SEARCH_ACCESSIBLE_RECORDS_NOT_FOUND_STATUS,
      message: SEARCH_NO_ACCESSIBLE_DOCUMENTS_FRAGMENT,
    }));
    expect(processed.details?.apiStatus).toBe(SEARCH_ACCESSIBLE_RECORDS_NOT_FOUND_STATUS);
    expect(processed.message).toBe(SEARCH_NO_ACCESSIBLE_DOCUMENTS_FRAGMENT);
    expect(processed.messageText).toBeUndefined();
    expect(isSearchNoAccessibleDocumentsNotFound(processed)).toBe(true);
  });
});
