import { Card, Stack, Text, Flex, Badge, Group, Box, ActionIcon } from '@mantine/core';
import { IconUser, IconCalendar, IconFlame, IconArrowUp, IconSquare, IconArrowDown, IconEdit, IconLock } from '@tabler/icons-react';
import { useTranslation } from '../hooks/useTranslation.js';

export function TaskCard({ task, onEdit }) {
  const { translatePriority, t, i18n } = useTranslation();
  
  // Map language codes to proper locale codes for date formatting
  const getLocaleCode = (language) => {
    switch (language) {
      case 'es': return 'es-ES';
      case 'fr': return 'fr-FR';
      case 'de': return 'de-DE';
      default: return 'en-US';
    }
  };

  const formatDate = (dateString) => {
    const locale = getLocaleCode(i18n.language);
    console.log('LOCALE DEBUG - i18n.language:', i18n.language, '| Mapped to:', locale);
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatTime = (dateString) => {
    const locale = getLocaleCode(i18n.language);
    return new Date(dateString).toLocaleTimeString(locale, { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'red';
      case 'HIGH': return 'orange';
      case 'MEDIUM': return 'yellow';
      case 'LOW': return 'blue';
      default: return 'gray';
    }
  };

  const getPriorityIcon = (priority) => {
    const color = getPriorityColor(priority);
    const iconProps = { size: 16, style: { color } };
    
    switch (priority) {
      case 'CRITICAL': return <IconFlame {...iconProps} style={{ color: '#ff4757' }} />; // Red flame
      case 'HIGH': return <IconArrowUp {...iconProps} style={{ color: '#ff4757' }} />; // Red up arrow
      case 'MEDIUM': return <IconSquare {...iconProps} style={{ color: '#ffa502' }} />; // Yellow square
      case 'LOW': return <IconArrowDown {...iconProps} style={{ color: '#3742fa' }} />; // Blue down arrow
      default: return <IconSquare {...iconProps} style={{ color: '#747d8c' }} />; // Gray square
    }
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    onEdit && onEdit(task);
  };

  return (
    <Card 
      shadow="sm" 
      padding="sm" 
      mb="xs" 
      withBorder
      style={{ 
        position: 'relative',
        opacity: 1,
        transform: 'none',
        transition: 'opacity 0.2s, transform 0.2s',
        cursor: 'grab'
      }}
    >
      {/* Priority icon and edit button in top right corner */}
      <Box
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          zIndex: 1,
          display: 'flex',
          gap: '4px'
        }}
      >
        <Box
          title={translatePriority(task.priority)} // Show priority on hover
        >
          {getPriorityIcon(task.priority)}
        </Box>
        <ActionIcon
          variant="filled"
          size="xs"
          onClick={handleEditClick}
          title="Edit task"
          style={{ 
            opacity: 0.8,
            backgroundColor: 'var(--mantine-color-blue-6)',
            color: 'white'
          }}
        >
          <IconEdit size={12} />
        </ActionIcon>
      </Box>
      
      <Stack gap="xs">
        <Text size="sm" fw={500} lineClamp={2} pr="20px"> {/* Add padding to avoid icon overlap */}
          {task.title}
          {task.isBlocked && (
            <IconLock size={12} style={{ marginLeft: '4px', color: 'red' }} />
          )}
        </Text>
        
        {/* Story Points badge only */}
        {task.storyPoints && (
          <Flex gap="xs" wrap="wrap">
            <Badge size="xs" variant="outline">
              {task.storyPoints} SP
            </Badge>
          </Flex>
        )}
        
        {task.assigneeName && (
          <Group gap="xs">
            <IconUser size={12} />
            <Text size="xs">{t('tasks.assignee')}: {task.assigneeName}</Text>
          </Group>
        )}
        
        {task.tags && task.tags.length > 0 && (
          <Group gap="xs">
            {task.tags.slice(0, 3).map((tag, index) => (
              <Badge 
                key={index} 
                size="xs" 
                style={{ 
                  backgroundColor: tag.color,
                  color: 'white',
                  border: 'none'
                }}
              >
                {tag.tag}
              </Badge>
            ))}
            {task.tags.length > 3 && (
              <Badge size="xs" variant="outline">
                +{task.tags.length - 3}
              </Badge>
            )}
          </Group>
        )}
        
        <Group gap="xs">
          <IconCalendar size={12} />
          <Text size="xs" c="dimmed">
            {t('tasks.createdAt')}: {formatDate(task.createdAt)} {formatTime(task.createdAt)}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
} 