'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Box, Flex, Text, Button } from '@radix-ui/themes';
import { useTranslation } from 'react-i18next';

/**
 * PasswordResetSuccess — shown after the user successfully sets a new password.
 * Prompts them to sign in with the new credentials.
 */
export default function PasswordResetSuccess() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Box style={{ width: '100%', maxWidth: '440px' }}>
      <Box style={{ marginBottom: '24px' }}>
        <Image
          src="/login-page-assets/pipeshub/white-square.svg"
          alt="Pipeshub"
          width={48}
          height={48}
        />
      </Box>

      <Flex direction="column" gap="3" style={{ marginBottom: '32px' }}>
        <Text
          style={{
            color: 'var(--gray-12)',
            fontSize: '24px',
            fontWeight: 500,
            letterSpacing: '-0.1px',
            lineHeight: '30px',
          }}
        >
          {t('resetPassword.success.title')}
        </Text>
        <Text style={{ color: 'var(--gray-11)', fontSize: '14px', lineHeight: '20px' }}>
          {t('resetPassword.success.description')}
        </Text>
      </Flex>

      <Button
        size="3"
        style={{
          width: '100%',
          backgroundColor: 'var(--accent-9)',
          color: 'white',
          fontWeight: 500,
          cursor: 'pointer',
        }}
        onClick={() => router.push('/login')}
      >
        {t('auth.common.signIn')}
      </Button>
    </Box>
  );
}
