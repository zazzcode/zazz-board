import { Table, Text, Group, ActionIcon, Tooltip, Box } from '@mantine/core';
import { IconCalendar, IconEdit, IconKey } from '@tabler/icons-react';
import { useTranslation } from '../hooks/useTranslation.js';

export function ProjectList({
  projects,
  loading,
  currentUser,
  onProjectSelect,
  onProjectEdit,
  onManageAgentTokens,
}) {
  const { t } = useTranslation();

  if (loading) {
    return <Text>{t('common.loading')}</Text>;
  }

  if (!projects || projects.length === 0) {
    return <Text>{t('projects.noProjects')}</Text>;
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(navigator.language, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div style={{ overflowX: 'auto' }}>
    <Table style={{ minWidth: 560 }}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th style={{ width: '40px' }}></Table.Th>
          <Table.Th>{t('tasks.title')}</Table.Th>
          <Table.Th>{t('projects.leader')}</Table.Th>
          <Table.Th>{t('projects.createdAt')}</Table.Th>
          <Table.Th style={{ width: 90 }}></Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {projects.map((project) => (
          <Table.Tr 
            key={project.id} 
            style={{ 
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Table.Td>
              {currentUser && project.leaderId === currentUser.id && (
                <Tooltip label="You are the project leader" withArrow>
                  <Box 
                    style={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      backgroundColor: 'var(--mantine-color-blue-5)',
                      margin: '0 auto'
                    }} 
                  />
                </Tooltip>
              )}
            </Table.Td>
            <Table.Td>
              <div 
                style={{ 
                  cursor: 'pointer'
                }}
                onClick={() => {
                  onProjectSelect(project);
                }}
              >
                <Text fw={500}>{project.title}</Text>
                <Text size="sm" c="dimmed">{project.code}</Text>
              </div>
            </Table.Td>
            <Table.Td>
              <Text>{project.leaderName}</Text>
              <Text size="sm" c="dimmed">{project.leaderEmail}</Text>
            </Table.Td>
            <Table.Td>
              <Group gap="xs">
                <IconCalendar size={14} />
                <Text size="sm">{formatDate(project.createdAt)}</Text>
              </Group>
            </Table.Td>
            <Table.Td style={{ minWidth: 90 }}>
              <Group gap={4} justify="flex-end">
                <ActionIcon
                  variant="subtle"
                  size="md"
                  title={t('projects.agentTokens.title')}
                  onClick={(e) => {
                    e.stopPropagation();
                    onManageAgentTokens?.(project);
                  }}
                  aria-label={t('projects.agentTokens.title')}
                >
                  <IconKey size={21} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  size="md"
                  title="Edit project"
                  onClick={(e) => {
                    e.stopPropagation();
                    onProjectEdit(project);
                  }}
                  aria-label="Edit project"
                >
                  <IconEdit size={21} />
                </ActionIcon>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
    </div>
  );
} 
