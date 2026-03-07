import * as pactum from 'pactum';
import { setTimeout as sleep } from 'node:timers/promises';
import { clearTaskData, createTestDeliverable, createTestTask, resetProjectDefaults } from '../helpers/testDatabase.js';

const { spec } = pactum;
const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

describe('File lock routes', () => {
  beforeEach(async () => {
    await clearTaskData();
    await resetProjectDefaults();
  });

  it('requires authentication', async () => {
    const deliverable = await createTestDeliverable(1, { name: 'Locks auth deliverable' });
    await spec()
      .get(`/projects/ZAZZ/deliverables/${deliverable.id}/locks`)
      .expectStatus(401);
  });

  it('acquires and lists file locks for a task', async () => {
    const deliverable = await createTestDeliverable(1, { name: 'Acquire lock deliverable' });
    const task = await createTestTask(1, {
      deliverableId: deliverable.id,
      title: 'Lock owner task',
      phaseStep: '1.1',
    });

    const acquireResult = await spec()
      .post(`/projects/ZAZZ/deliverables/${deliverable.id}/locks/acquire`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({
        taskId: task.id,
        phaseStep: '1.1',
        agentName: 'worker-1',
        filePaths: ['api/src/routes/projects.js', 'api/src/services/databaseService.js'],
        ttlSeconds: 30,
      })
      .expectStatus(200)
      .returns('res.body');

    expect(acquireResult.acquired).toBe(true);
    expect(acquireResult.locks).toHaveLength(2);

    const listed = await spec()
      .get(`/projects/ZAZZ/deliverables/${deliverable.id}/locks`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(listed.lockCount).toBe(2);
    expect(listed.locks[0].deliverableId).toBe(deliverable.id);
  });

  it('returns FILE_LOCK_CONFLICT when another owner holds a requested file', async () => {
    const deliverable = await createTestDeliverable(1, { name: 'Conflict deliverable' });
    const ownerTask = await createTestTask(1, {
      deliverableId: deliverable.id,
      title: 'Owner task',
      phaseStep: '1.1',
    });
    const blockedTask = await createTestTask(1, {
      deliverableId: deliverable.id,
      title: 'Blocked task',
      phaseStep: '1.2',
    });

    await spec()
      .post(`/projects/ZAZZ/deliverables/${deliverable.id}/locks/acquire`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({
        taskId: ownerTask.id,
        phaseStep: '1.1',
        agentName: 'worker-1',
        filePaths: ['api/src/routes/projects.js'],
        ttlSeconds: 30,
      })
      .expectStatus(200);

    const conflict = await spec()
      .post(`/projects/ZAZZ/deliverables/${deliverable.id}/locks/acquire`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({
        taskId: blockedTask.id,
        phaseStep: '1.2',
        agentName: 'worker-2',
        filePaths: ['api/src/routes/projects.js', 'api/src/routes/taskGraph.js'],
        ttlSeconds: 30,
      })
      .expectStatus(409)
      .returns('res.body');

    expect(conflict.error).toBe('FILE_LOCK_CONFLICT');
    expect(Array.isArray(conflict.conflicts)).toBe(true);
    expect(conflict.conflicts[0].filePath).toBe('api/src/routes/projects.js');
    expect(conflict.pollIntervalSeconds).toBe(3);
  });

  it('releases locks and allows another task to acquire them', async () => {
    const deliverable = await createTestDeliverable(1, { name: 'Release deliverable' });
    const ownerTask = await createTestTask(1, {
      deliverableId: deliverable.id,
      title: 'Owner task',
      phaseStep: '2.1',
    });
    const nextTask = await createTestTask(1, {
      deliverableId: deliverable.id,
      title: 'Next task',
      phaseStep: '2.2',
    });

    await spec()
      .post(`/projects/ZAZZ/deliverables/${deliverable.id}/locks/acquire`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({
        taskId: ownerTask.id,
        phaseStep: '2.1',
        agentName: 'worker-1',
        filePaths: ['client/src/App.jsx'],
        ttlSeconds: 30,
      })
      .expectStatus(200);

    const release = await spec()
      .post(`/projects/ZAZZ/deliverables/${deliverable.id}/locks/release`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({
        taskId: ownerTask.id,
        agentName: 'worker-1',
      })
      .expectStatus(200)
      .returns('res.body');

    expect(release.releasedCount).toBe(1);

    const reacquire = await spec()
      .post(`/projects/ZAZZ/deliverables/${deliverable.id}/locks/acquire`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({
        taskId: nextTask.id,
        phaseStep: '2.2',
        agentName: 'worker-2',
        filePaths: ['client/src/App.jsx'],
        ttlSeconds: 30,
      })
      .expectStatus(200)
      .returns('res.body');

    expect(reacquire.acquired).toBe(true);
    expect(reacquire.locks).toHaveLength(1);
    expect(reacquire.locks[0].taskId).toBe(nextTask.id);
  });

  it('reclaims expired locks before acquire', async () => {
    const deliverable = await createTestDeliverable(1, { name: 'Expiry deliverable' });
    const firstTask = await createTestTask(1, {
      deliverableId: deliverable.id,
      title: 'First lock owner',
      phaseStep: '3.1',
    });
    const secondTask = await createTestTask(1, {
      deliverableId: deliverable.id,
      title: 'Second lock owner',
      phaseStep: '3.2',
    });

    await spec()
      .post(`/projects/ZAZZ/deliverables/${deliverable.id}/locks/acquire`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({
        taskId: firstTask.id,
        phaseStep: '3.1',
        agentName: 'worker-1',
        filePaths: ['api/src/routes/images.js'],
        ttlSeconds: 5,
      })
      .expectStatus(200);

    await sleep(5500);

    const result = await spec()
      .post(`/projects/ZAZZ/deliverables/${deliverable.id}/locks/acquire`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({
        taskId: secondTask.id,
        phaseStep: '3.2',
        agentName: 'worker-2',
        filePaths: ['api/src/routes/images.js'],
        ttlSeconds: 30,
      })
      .expectStatus(200)
      .returns('res.body');

    expect(result.acquired).toBe(true);
    expect(result.locks[0].taskId).toBe(secondTask.id);
  });
});
