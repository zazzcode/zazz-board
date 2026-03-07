import { describe, it, expect, beforeEach } from 'vitest';
import { spec } from 'pactum';
import { clearTaskData, createTestDeliverable, createTestTask, resetProjectDefaults } from '../helpers/testDatabase.js';
import { getTestToken } from '../helpers/testServer.js';

const VALID_TOKEN = getTestToken();
const BASE_URL = 'http://127.0.0.1:3031';

function parseSseBlock(block) {
  const lines = block.split('\n');
  let eventName = 'message';
  const dataLines = [];

  for (const line of lines) {
    if (!line || line.startsWith(':')) continue;
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) return null;
  return { eventName, data: JSON.parse(dataLines.join('\n')) };
}

async function waitForProjectEvent({ projectCode, predicate, trigger, timeoutMs = 6000 }) {
  const controller = new AbortController();
  const response = await fetch(`${BASE_URL}/projects/${projectCode}/events`, {
    method: 'GET',
    headers: {
      'TB_TOKEN': VALID_TOKEN,
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
    signal: controller.signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Failed to open SSE stream: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let triggerInvoked = false;

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) throw new Error('SSE stream ended before event was received');

      buffer += decoder.decode(value, { stream: true });
      let boundaryIndex = buffer.indexOf('\n\n');

      while (boundaryIndex !== -1) {
        const block = buffer.slice(0, boundaryIndex);
        buffer = buffer.slice(boundaryIndex + 2);
        boundaryIndex = buffer.indexOf('\n\n');

        const parsed = parseSseBlock(block);
        if (!parsed) continue;

        if (!triggerInvoked && parsed.eventName === 'connected') {
          triggerInvoked = true;
          await trigger();
          continue;
        }

        if (predicate(parsed.data, parsed.eventName)) {
          return parsed.data;
        }
      }
    }
  } finally {
    clearTimeout(timeout);
    controller.abort();
    try {
      await reader.cancel();
    } catch (error) {
      // no-op
    }
  }
}

describe('Realtime SSE events', () => {
  beforeEach(async () => {
    await clearTaskData();
    await resetProjectDefaults();
  });

  it('requires authentication for project event stream', async () => {
    await spec()
      .get('/projects/ZAZZ/events')
      .expectStatus(401);
  });

  it('streams task status changes to connected clients', async () => {
    const deliverable = await createTestDeliverable(1, { name: 'RT Task Status Deliv' });
    const task = await createTestTask(1, {
      deliverableId: deliverable.id,
      status: 'READY',
      title: 'Realtime Task Status',
    });

    const event = await waitForProjectEvent({
      projectCode: 'ZAZZ',
      predicate: (payload) => payload.eventType === 'task.status_changed' && payload.taskId === task.id,
      trigger: async () => {
        await spec()
          .patch(`/projects/ZAZZ/deliverables/${deliverable.id}/tasks/${task.id}/status`)
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ status: 'IN_PROGRESS' })
          .expectStatus(200);
      },
    });

    expect(event.type).toBe('task');
    expect(event.taskId).toBe(task.id);
    expect(event.deliverableId).toBe(deliverable.id);
    expect(event.status).toBe('IN_PROGRESS');
    expect(event.previousStatus).toBe('READY');
  });

  it('streams deliverable status changes to connected clients', async () => {
    const deliverable = await createTestDeliverable(1, {
      status: 'PLANNING',
      name: 'RT Deliverable Status',
      planFilePath: '/tmp/test-plan.md',
      approvedBy: 1,
      approvedAt: new Date(),
    });

    const event = await waitForProjectEvent({
      projectCode: 'ZAZZ',
      predicate: (payload) => payload.eventType === 'deliverable.status_changed' && payload.deliverableId === deliverable.id,
      trigger: async () => {
        await spec()
          .patch(`/projects/ZAZZ/deliverables/${deliverable.id}/status`)
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ status: 'IN_PROGRESS' })
          .expectStatus(200);
      },
    });

    expect(event.type).toBe('deliverable');
    expect(event.deliverableId).toBe(deliverable.id);
    expect(event.status).toBe('IN_PROGRESS');
    expect(event.previousStatus).toBe('PLANNING');
  });

  it('streams DEPENDS_ON relation changes to connected clients', async () => {
    const deliverable = await createTestDeliverable(1, { name: 'RT Relation Deliv' });
    const parentTask = await createTestTask(1, {
      deliverableId: deliverable.id,
      title: 'Parent Task',
      status: 'READY',
    });
    const dependentTask = await createTestTask(1, {
      deliverableId: deliverable.id,
      title: 'Dependent Task',
      status: 'READY',
    });

    const event = await waitForProjectEvent({
      projectCode: 'ZAZZ',
      predicate: (payload) =>
        payload.eventType === 'relation.created' &&
        payload.taskId === dependentTask.id &&
        payload.relatedTaskId === parentTask.id &&
        payload.relationType === 'DEPENDS_ON',
      trigger: async () => {
        await spec()
          .post(`/projects/ZAZZ/tasks/${dependentTask.id}/relations`)
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ relatedTaskId: parentTask.id, relationType: 'DEPENDS_ON' })
          .expectStatus(201);
      },
    });

    expect(event.type).toBe('relation');
    expect(event.taskId).toBe(dependentTask.id);
    expect(event.relatedTaskId).toBe(parentTask.id);
    expect(event.relationType).toBe('DEPENDS_ON');
    expect(event.deliverableId).toBe(deliverable.id);
  });
});
