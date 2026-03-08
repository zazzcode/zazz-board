import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  CopyButton,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconCopy, IconKey, IconTrash } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation.js';
import { useAgentTokens } from '../hooks/useAgentTokens.js';

const DELETE_CONFIRMATION = 'delete this token';

function formatTimestamp(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function getErrorMessage(error, fallback) {
  if (!error) return fallback;
  if (typeof error.message === 'string' && error.message.trim()) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.error) {
        return parsed.error;
      }
    } catch {
      return error.message;
    }
    return error.message;
  }
  return fallback;
}

function TokenRow({
  group,
  copiedLabel,
  createLabel,
  createLoading,
  deleteState,
  deleting,
  onCreateLabelChange,
  onCreate,
  onDeleteTarget,
  onDeletePhraseChange,
  onCancelDelete,
  onConfirmDelete,
  t,
}) {
  const isDeleteMatch =
    deleteState?.tokenId &&
    deleteState?.phrase.trim().toLowerCase() === DELETE_CONFIRMATION;

  return (
    <Card withBorder radius="md" padding="md">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text fw={600}>{group.userName || t('projects.agentTokens.userSectionFallback', { userId: group.userId })}</Text>
            <Text size="sm" c="dimmed">{group.userEmail}</Text>
          </div>
          <Badge variant="light">
            {t('projects.agentTokens.userTokenCount', { count: group.tokens.length })}
          </Badge>
        </Group>

        <Group align="flex-end">
          <TextInput
            label={t('projects.agentTokens.tokenLabel')}
            placeholder={t('projects.agentTokens.tokenLabelPlaceholder')}
            value={createLabel}
            onChange={(event) => onCreateLabelChange(group.userId, event.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Button
            leftSection={<IconKey size={16} />}
            loading={createLoading}
            onClick={() => onCreate(group.userId)}
          >
            {t('projects.agentTokens.createButton')}
          </Button>
        </Group>

        {group.tokens.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t('projects.agentTokens.noTokensForUser')}
          </Text>
        ) : (
          <Stack gap="sm">
            {group.tokens.map((token) => {
              const isDeleting = deleteState?.tokenId === token.id;
              return (
                <Card key={token.id} withBorder radius="md" padding="sm">
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start">
                      <div>
                        <Text fw={500}>{token.label || t('projects.agentTokens.unlabeledToken')}</Text>
                        <Text size="xs" c="dimmed">
                          {t('projects.agentTokens.createdAt')}: {formatTimestamp(token.createdAt)}
                        </Text>
                      </div>
                      <Group gap="xs">
                        <CopyButton value={token.token}>
                          {({ copied, copy }) => (
                            <Button
                              variant="light"
                              size="xs"
                              color={copied ? 'green' : 'blue'}
                          leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                          onClick={copy}
                        >
                              {copied ? copiedLabel : t('projects.agentTokens.copyAction')}
                            </Button>
                          )}
                        </CopyButton>
                        <ActionIcon
                          color="red"
                          variant={isDeleting ? 'filled' : 'light'}
                          onClick={() =>
                            isDeleting
                              ? onCancelDelete()
                              : onDeleteTarget({ tokenId: token.id, userId: group.userId, phrase: '' })
                          }
                          aria-label={t('projects.agentTokens.deleteAction')}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>

                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                        {t('projects.agentTokens.tokenValue')}
                      </Text>
                      <Text ff="monospace" size="sm" style={{ wordBreak: 'break-all' }}>
                        {token.token}
                      </Text>
                    </div>

                    {isDeleting && (
                      <Stack gap="xs">
                        <Text fw={600}>{t('projects.agentTokens.deleteTitle')}</Text>
                        <Text size="sm">
                          {t('projects.agentTokens.deleteBody')}
                        </Text>
                        <TextInput
                          label={t('projects.agentTokens.deletePhraseLabel')}
                          value={deleteState.phrase}
                          onChange={(event) => onDeletePhraseChange(event.currentTarget.value)}
                          placeholder={t('projects.agentTokens.deletePhrasePlaceholder')}
                        />
                        <Group justify="flex-end">
                          <Button variant="subtle" onClick={onCancelDelete}>
                            {t('common.cancel')}
                          </Button>
                          <Button
                            color="red"
                            loading={deleting}
                            disabled={!isDeleteMatch}
                            onClick={() => onConfirmDelete(group.userId, token.id)}
                          >
                            {t('projects.agentTokens.deleteConfirm')}
                          </Button>
                        </Group>
                      </Stack>
                    )}
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

export function AgentTokensModal({ opened, onClose, selectedProject, currentUser }) {
  const { t } = useTranslation();
  const { userGroups, loading, error, isLeader, createAgentToken, deleteAgentToken } = useAgentTokens(
    selectedProject,
    currentUser,
    opened,
  );

  const [createLabels, setCreateLabels] = useState({});
  const [creatingUserId, setCreatingUserId] = useState(null);
  const [deletingTokenId, setDeletingTokenId] = useState(null);
  const [deleteState, setDeleteState] = useState(null);
  const [createdToken, setCreatedToken] = useState(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!opened) {
      setCreateLabels({});
      setCreatingUserId(null);
      setDeletingTokenId(null);
      setDeleteState(null);
      setCreatedToken(null);
      setActionError('');
    }
  }, [opened]);

  const visibleGroups = useMemo(() => {
    if (!Array.isArray(userGroups)) return [];
    if (isLeader) return userGroups;
    return userGroups.slice(0, 1);
  }, [isLeader, userGroups]);

  const handleCreateLabelChange = (userId, value) => {
    setCreateLabels((current) => ({
      ...current,
      [userId]: value,
    }));
  };

  const handleCreate = async (userId) => {
    setActionError('');
    setCreatedToken(null);
    setCreatingUserId(userId);

    try {
      const created = await createAgentToken({
        userId: isLeader ? userId : undefined,
        label: createLabels[userId]?.trim() || undefined,
      });
      setCreatedToken(created);
      setCreateLabels((current) => ({
        ...current,
        [userId]: '',
      }));
    } catch (error) {
      setActionError(getErrorMessage(error, t('projects.agentTokens.createError')));
    } finally {
      setCreatingUserId(null);
    }
  };

  const handleConfirmDelete = async (userId, tokenId) => {
    setActionError('');
    setDeletingTokenId(tokenId);

    try {
      await deleteAgentToken({
        userId: isLeader ? userId : undefined,
        tokenId,
      });
      setDeleteState(null);
    } catch (error) {
      setActionError(getErrorMessage(error, t('projects.agentTokens.deleteError')));
    } finally {
      setDeletingTokenId(null);
    }
  };

  const title = selectedProject
    ? t('projects.agentTokens.titleWithProject', { project: selectedProject.title })
    : t('projects.agentTokens.title');

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="xl">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {isLeader
            ? t('projects.agentTokens.subtitleLeader')
            : t('projects.agentTokens.subtitleSelf')}
        </Text>

        {createdToken && (
          <Alert color="green" icon={<IconCheck size={16} />}>
            <Stack gap="xs">
              <Text fw={600}>{t('projects.agentTokens.latestTokenTitle')}</Text>
              <Text size="sm">{createdToken.label || t('projects.agentTokens.unlabeledToken')}</Text>
              <Text size="sm" c="dimmed">{t('projects.agentTokens.copyHelper')}</Text>
              <Group justify="space-between" gap="sm" wrap="nowrap">
                <Text ff="monospace" size="sm" style={{ wordBreak: 'break-all' }}>
                  {createdToken.token}
                </Text>
                <CopyButton value={createdToken.token}>
                  {({ copied, copy }) => (
                    <Button
                      variant="light"
                      size="xs"
                      color={copied ? 'green' : 'blue'}
                      leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      onClick={copy}
                    >
                      {copied ? t('projects.agentTokens.copied') : t('projects.agentTokens.copyAction')}
                    </Button>
                  )}
                </CopyButton>
              </Group>
            </Stack>
          </Alert>
        )}

        {actionError && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {actionError}
          </Alert>
        )}

        {error && !loading && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {getErrorMessage(error, t('projects.agentTokens.error'))}
          </Alert>
        )}

        {loading ? (
          <Text>{t('projects.agentTokens.loading')}</Text>
        ) : visibleGroups.length === 0 ? (
          <Text c="dimmed">
            {isLeader ? t('projects.agentTokens.emptyLeader') : t('projects.agentTokens.emptySelf')}
          </Text>
        ) : (
          <Stack gap="md">
            {visibleGroups.map((group, index) => (
              <div key={group.userId}>
                {index > 0 && <Divider my="sm" />}
                <TokenRow
                  group={group}
                  copiedLabel={t('projects.agentTokens.copied')}
                  createLabel={createLabels[group.userId] || ''}
                  createLoading={creatingUserId === group.userId}
                  deleteState={deleteState}
                  deleting={deletingTokenId === deleteState?.tokenId}
                  onCreateLabelChange={handleCreateLabelChange}
                  onCreate={handleCreate}
                  onDeleteTarget={setDeleteState}
                  onDeletePhraseChange={(phrase) =>
                    setDeleteState((current) => (current ? { ...current, phrase } : current))
                  }
                  onCancelDelete={() => setDeleteState(null)}
                  onConfirmDelete={handleConfirmDelete}
                  t={t}
                />
              </div>
            ))}
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
