import { Select, Group, Text } from '@mantine/core';
import { useTranslation } from '../hooks/useTranslation.js';

const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
];

export function LanguageSwitcher() {
  const { currentLanguage, changeLanguage } = useTranslation();

  const handleLanguageChange = (newLanguage) => {
    changeLanguage(newLanguage);
  };

  return (
    <Group gap="xs">
      <Text size="sm" c="dimmed">Language:</Text>
      <Select
        size="xs"
        value={currentLanguage}
        onChange={handleLanguageChange}
        data={languages}
        w={120}
      />
    </Group>
  );
} 