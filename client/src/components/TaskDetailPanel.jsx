import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Paper,
  Stack, 
  TextInput, 
  Textarea, 
  Select, 
  Button, 
  Group, 
  Badge, 
  Text,
  ActionIcon,
  Box,
  Switch
} from '@mantine/core';
import { 
  IconUser, 
  IconX, 
  IconDeviceFloppy,
  IconGitBranch,
  IconGitPullRequest,
  IconLock,
  IconGripHorizontal
} from '@tabler/icons-react';
import { useTranslation } from '../hooks/useTranslation.js';
import { useTags } from '../hooks/useTags.js';
import { useUsers } from '../hooks/useUsers.js';

export function TaskDetailsPanel({ 
  task, 
  taskStatuses = ['TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'],
  opened, 
  onClose, 
  onSave,
  panelIndex = 0,
  initialClickPos = null
}) {
  const { t, translatePriority, translateStatus } = useTranslation();
  const { tags = [] } = useTags();
  const { users = [] } = useUsers();
  const [editedTask, setEditedTask] = useState(null);

  // --- Drag state ---
  const [position, setPosition] = useState(null); // null = use default offset position
  const dragRef = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Set initial position near click, or reset to default offset
  useEffect(() => {
    if (opened && initialClickPos) {
      // Place panel so the top-left is near the click, but keep it on-screen
      const panelWidth = Math.min(1040, window.innerWidth * 0.8);
      const panelHeight = window.innerHeight - 120;
      const left = Math.max(0, Math.min(initialClickPos.x - 40, window.innerWidth - panelWidth - 16));
      const top = Math.max(16, Math.min(initialClickPos.y - 30, window.innerHeight - panelHeight - 16));
      setPosition({ left, top });
    } else if (opened) {
      setPosition(null);
    }
  }, [opened, initialClickPos]);

  const handleMouseDown = useCallback((e) => {
    // Only drag on left mouse button
    if (e.button !== 0) return;
    e.preventDefault();
    isDragging.current = true;

    const panel = dragRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();

    dragStart.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      const newLeft = e.clientX - dragStart.current.x;
      const newTop = e.clientY - dragStart.current.y;
      setPosition({ left: newLeft, top: newTop });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  // Initialize edited task when panel opens
  useEffect(() => {
    if (task && opened) {
      setEditedTask({
        ...task,
        tags: task.tags && Array.isArray(task.tags) ? task.tags.map(tag => tag?.tag || tag).filter(Boolean) : [],
        isBlocked: Boolean(task.isBlocked),
        blockedReason: task.blockedReason || '',
        gitWorktree: task.gitWorktree || '',
        gitPullRequestUrl: task.gitPullRequestUrl || ''
      });
    }
  }, [task, opened]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'red';
      case 'HIGH': return 'orange';
      case 'MEDIUM': return 'yellow';
      case 'LOW': return 'blue';
      default: return 'gray';
    }
  };

  const handleSave = () => {
    if (onSave && editedTask) {
      // Validate that blocked reason is provided when task is blocked
      if (editedTask.isBlocked && (!editedTask.blockedReason || editedTask.blockedReason.trim() === '')) {
        alert('Please provide a reason when marking a task as blocked.');
        return;
      }
      
      const tagColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'];
      const tagsWithColors = editedTask.tags.map((tagName, index) => ({
        tag: tagName,
        color: tagColors[index % tagColors.length]
      }));
      
      // Normalize empty strings to null for cleaner data
      const normalizedTask = {
        ...editedTask,
        blockedReason: editedTask.blockedReason === '' ? null : editedTask.blockedReason,
        gitWorktree: editedTask.gitWorktree === '' ? null : editedTask.gitWorktree,
        gitPullRequestUrl: editedTask.gitPullRequestUrl === '' ? null : editedTask.gitPullRequestUrl,
        prompt: editedTask.prompt === '' ? null : editedTask.prompt
      };
      
      onSave({
        ...normalizedTask,
        tags: tagsWithColors,
        tagNames: editedTask.tags // Send tag names for API update
      });
      
      onClose();
    }
  };

  const handleCancel = () => {
    setEditedTask({
      ...task,
      tags: task.tags && Array.isArray(task.tags) ? task.tags.map(tag => tag?.tag || tag).filter(Boolean) : []
    });
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  if (!task || !opened) return null;

  // Default stacked offset when not yet dragged
  const defaultRight = 24 + panelIndex * 30;
  const defaultTop = 80 + panelIndex * 20;

  // Position style: use dragged position if set, otherwise default offset
  const positionStyle = position
    ? { left: `${position.left}px`, top: `${position.top}px` }
    : { right: `${defaultRight}px`, top: `${defaultTop}px` };

  return (
    <Paper
      ref={dragRef}
      shadow="xl"
      withBorder
      style={{
        position: 'fixed',
        ...positionStyle,
        width: 'min(1040px, 80vw)',
        height: 'calc(100vh - 120px)',
        zIndex: 200 + panelIndex,
        borderRadius: '12px',
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
      }}
    >
      {/* Blue task-id badge centered at top — matches TaskCard style */}
      <Box style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
        <Badge
          size="lg"
          style={{
            backgroundColor: 'var(--mantine-color-blue-6)',
            color: 'white',
            fontWeight: 700,
            fontSize: '14px',
            textTransform: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {task.taskId}
        </Badge>
      </Box>

      <div style={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: '12px',
      }}>
        {/* Header — drag handle + title + close */}
        <Box
          onMouseDown={handleMouseDown}
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--mantine-color-gray-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '8px 8px 0 0',
            position: 'relative',
            flexShrink: 0,
            cursor: 'grab',
            userSelect: 'none',
          }}
        >
          {/* Drag grip icon */}
          <IconGripHorizontal size={16} style={{ color: 'var(--mantine-color-gray-5)', marginRight: 8, flexShrink: 0 }} />

          {/* Task Title */}
          <Text size="lg" fw={600} style={{ flex: 1 }}>
            {task.title}
          </Text>
          
          {/* Close Button */}
          <ActionIcon
            variant="subtle"
            onClick={handleClose}
            onMouseDown={(e) => e.stopPropagation()}
            title={t('common.close')}
            size="sm"
          >
            <IconX size={16} />
          </ActionIcon>
        </Box>

        {/* Panel Content - Scrollable */}
        <Box 
          p="md" 
          style={{ 
            flex: 1, 
            overflowY: 'auto',
            overflowX: 'hidden',
            minHeight: 0,
          }}
        >
          <Stack gap="md">
              {/* Title - Full width */}
              <TextInput
                label={t('tasks.title')}
                placeholder={t('tasks.title')}
                value={editedTask?.title || ''}
                onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                required
              />
              
              {/* Status, Story Points, and Priority on same line */}
              <Group grow={false} justify="space-between">
                <Group grow={false}>
                  <Select
                    label="Points"
                    placeholder={t('tasks.storyPoints')}
                    data={[
                      { value: '', label: '-' },
                      { value: '1', label: '1' },
                      { value: '2', label: '2' },
                      { value: '3', label: '3' },
                      { value: '5', label: '5' },
                      { value: '8', label: '8' },
                      { value: '13', label: '13' },
                      { value: '21', label: '21' }
                    ]}
                    value={editedTask?.storyPoints?.toString() || ''}
                    onChange={(value) => setEditedTask({ ...editedTask, storyPoints: value ? parseInt(value) : null })}
                    style={{ width: '100px' }}
                    withCheckIcon={false}
                  />
                  
                  <Select
                    label={t('tasks.priority')}
                    data={[
                      { value: 'LOW', label: t('tasks.priorities.LOW') },
                      { value: 'MEDIUM', label: t('tasks.priorities.MEDIUM') },
                      { value: 'HIGH', label: t('tasks.priorities.HIGH') },
                      { value: 'CRITICAL', label: t('tasks.priorities.CRITICAL') }
                    ]}
                    value={editedTask?.priority || 'MEDIUM'}
                    onChange={(value) => setEditedTask({ ...editedTask, priority: value })}
                    style={{ width: '105px' }}
                    withCheckIcon={false}
                  />
                </Group>
                
                <Select
                  label={t('tasks.status')}
                  data={taskStatuses.map(status => ({
                    value: status,
                    label: translateStatus(status)
                  }))}
                  value={editedTask?.status || 'TO_DO'}
                  onChange={(value) => setEditedTask({ ...editedTask, status: value })}
                  maxDropdownHeight={200}
                  style={{ minWidth: '100px' }}
                  withCheckIcon={false}
                />
              </Group>
              
              {/* Tags */}
              <TextInput
                label={t('tags.title')}
                placeholder={t('tags.commaSeparated')}
                value={editedTask?.tags?.join(', ') || ''}
                onChange={(e) => {
                  const tagString = e.target.value;
                  const tagArray = tagString
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag.length > 0);
                  setEditedTask({ ...editedTask, tags: tagArray });
                }}
                description={t('tags.commaSeparatedDescription')}
              />
              
              {/* Git Feature Branch */}
              <TextInput
                label={t('tasks.gitWorktree')}
                placeholder={t('tasks.gitWorktreePlaceholder')}
                value={editedTask?.gitWorktree || ''}
                onChange={(e) => setEditedTask({ ...editedTask, gitWorktree: e.target.value })}
                leftSection={<IconGitBranch size={16} />}
              />
              
              {/* Git Pull Request URL */}
              <TextInput
                label={t('tasks.gitPullRequestUrl')}
                placeholder={t('tasks.gitPullRequestUrlPlaceholder')}
                value={editedTask?.gitPullRequestUrl || ''}
                onChange={(e) => setEditedTask({ ...editedTask, gitPullRequestUrl: e.target.value })}
                leftSection={<IconGitPullRequest size={16} />}
              />
              
              {/* Assignee */}
              <Select
                label={t('tasks.assignee')}
                placeholder={t('tasks.selectAssignee')}
                data={[
                  { value: '', label: t('tasks.unassigned') },
                  ...(Array.isArray(users) ? users.map(user => ({ 
                    value: user.id.toString(), 
                    label: user.fullName 
                  })) : [])
                ]}
                value={editedTask?.assigneeId?.toString() || ''}
                onChange={(value) => {
                  const selectedUser = users.find(u => u.id.toString() === value);
                  setEditedTask({ 
                    ...editedTask, 
                    assigneeId: value ? parseInt(value) : null,
                    assigneeName: selectedUser ? selectedUser.fullName : ''
                  });
                }}
                leftSection={<IconUser size={16} />}
                clearable
              />
              
              {/* Blocked toggle and reason on same line */}
              <Group align="flex-end">
                <Group gap="xs">
                  <IconLock size={16} />
                  <Switch
                    label={t('tasks.isBlocked')}
                    checked={editedTask?.isBlocked || false}
                    onChange={(e) => setEditedTask({ ...editedTask, isBlocked: e.currentTarget.checked })}
                  />
                </Group>
                
                {editedTask?.isBlocked && (
                  <TextInput
                    placeholder={t('tasks.blockedReasonPlaceholder')}
                    value={editedTask?.blockedReason || ''}
                    onChange={(e) => setEditedTask({ ...editedTask, blockedReason: e.target.value })}
                    required
                    style={{ flex: 1 }}
                  />
                )}
              </Group>
              
              {/* Prompt - doubled height */}
              <Textarea
                label={t('tasks.prompt')}
                placeholder={t('tasks.prompt')}
                value={editedTask?.prompt || ''}
                onChange={(e) => setEditedTask({ ...editedTask, prompt: e.target.value })}
                rows={8}
              />
            </Stack>
        </Box>
        
        {/* Buttons - outside scrollable area */}
        <Box p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-3)', flexShrink: 0 }}>
            <Group justify="flex-end">
              <Button variant="subtle" onClick={handleCancel}>
                {t('common.cancel')}
              </Button>
              <Button 
                leftSection={<IconDeviceFloppy size={16} />}
                onClick={handleSave}
              >
                {t('common.save')}
              </Button>
            </Group>
          </Box>
      </div>
    </Paper>
  );
}
