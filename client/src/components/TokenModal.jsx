import { Modal, TextInput, Button, Stack } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation.js';

export function TokenModal({ opened, onClose, onSetToken }) {
  const { t } = useTranslation();
  const [token, setToken] = useState('');

  const handleSetToken = () => {
    console.log('TokenModal handleSetToken called with:', token);
    if (token.trim()) {
      onSetToken(token.trim());
      setToken(''); // Clear input after setting
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSetToken();
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={t('common.setAccessToken')} centered>
      <Stack>
        <TextInput
          label={t('common.accessToken')}
          placeholder={t('common.enterAccessToken')}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyPress={handleKeyPress}
          required
        />
        <Button onClick={handleSetToken} fullWidth>
          {t('common.setAccessToken')}
        </Button>
      </Stack>
    </Modal>
  );
} 