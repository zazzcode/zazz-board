import { Card, Stack, Text, Flex, Badge, Group, Box } from '@mantine/core';
import { IconUser, IconCalendar, IconFlame, IconArrowUp, IconSquare, IconArrowDown } from '@tabler/icons-react';
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

  return (
    <Card 
      shadow="sm" 
      padding="0" 
      mb="xs" 
      withBorder
      style={{ 
        position: 'relative',
        opacity: 1,
        transform: 'none',
        transition: 'opacity 0.2s, transform 0.2s, border-color 0.2s',
        cursor: 'grab',
        overflow: 'visible',
        ...(task.isBlocked ? {
          borderColor: 'var(--mantine-color-yellow-5)',
          borderWidth: '2px',
          boxShadow: '0 0 8px rgba(250, 176, 5, 0.25)',
        } : {})
      }}
    >
      {/* Blue task-id tab centered at top */}
      <Box style={{ display: 'flex', justifyContent: 'center', marginTop: '-10px', marginBottom: '4px' }}>
        <Badge
          size="sm"
          style={{
            backgroundColor: 'var(--mantine-color-blue-6)',
            color: 'white',
            fontWeight: 700,
            fontSize: '11px',
            textTransform: 'none',
          }}
        >
          {task.taskId}
        </Badge>
      </Box>

      {/* Priority icon in top right */}
      <Box
        style={{ position: 'absolute', top: '12px', right: '8px', zIndex: 1 }}
        title={translatePriority(task.priority)}
      >
        {getPriorityIcon(task.priority)}
      </Box>
      
      <Box style={{ padding: '0 12px 12px 12px' }}>
      <Stack gap="xs">
        <Text size="sm" fw={500} lineClamp={2} pr="20px">
          {task.title}
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
      </Box>
    </Card>
  );
} 
