import { describe, expect, it } from 'vitest';
import { localizedText } from '@/lib/i18n/localized-text';
import { extractStorageSaveErrorMessage } from '../storage-save-error';

describe('extractStorageSaveErrorMessage', () => {
  it('returns a nested server error message when no S3 checks failed', () => {
    expect(extractStorageSaveErrorMessage({
      error: { message: 'S3 health check failed. Verify credentials.' },
    })).toBe('S3 health check failed. Verify credentials.');
  });

  it('appends failed S3 capability details to a nested server message', () => {
    expect(extractStorageSaveErrorMessage({
      error: { message: 'S3 health check failed.' },
      metadata: {
        s3HealthCheck: [
          { capability: 'bucketAccess', passed: true },
          { capability: 'upload', passed: false, error: 'AccessDenied' },
        ],
      },
    })).toEqual(localizedText('onboarding.stepStorage.s3HealthCheckFailedWithBase', {
      message: 'S3 health check failed.',
      details: 'upload: AccessDenied',
    }));
  });

  it('summarizes failed S3 checks when the server has no message', () => {
    expect(extractStorageSaveErrorMessage({
      metadata: {
        s3HealthCheck: [
          { capability: 'signedUrlPut', passed: false, error: 'AccessDenied' },
        ],
      },
    })).toEqual(localizedText('onboarding.stepStorage.s3HealthCheckFailed', {
      details: 'signedUrlPut: AccessDenied',
    }));
  });

  it('returns null for absent or non-object error data', () => {
    expect(extractStorageSaveErrorMessage(null)).toBeNull();
    expect(extractStorageSaveErrorMessage('request failed')).toBeNull();
  });
});
