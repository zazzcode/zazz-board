import * as pactum from 'pactum';
import { clearTaskData, createTestTask, getTaskById, createTestDeliverable } from '../helpers/testDatabase.js';

const { spec } = pactum;

// Use seeded token from seeders/seedUsers.js
const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';
const PROJECT_CODE = 'ZAZZ';
const PROJECT_ID = 1;

let DELIVERABLE_ID;

describe('PATCH /projects/:code/deliverables/:delivId/tasks/:taskId/status', () => {
  beforeEach(async () => {
    await clearTaskData();
    const deliverable = await createTestDeliverable(PROJECT_ID);
    DELIVERABLE_ID = deliverable.id;
  });

  describe('Authentication', () => {
    it('should return 401 without authentication token', async () => {
      const task = await createTestTask(PROJECT_ID, { deliverableId: DELIVERABLE_ID });
      await spec()
        .patch(`/projects/${PROJECT_CODE}/deliverables/${DELIVERABLE_ID}/tasks/${task.id}/status`)
        .withJson({ status: 'IN_PROGRESS' })
        .expectStatus(401);
    });

    it('should return 401 with invalid token', async () => {
      const task = await createTestTask(PROJECT_ID, { deliverableId: DELIVERABLE_ID });
      await spec()
        .patch(`/projects/${PROJECT_CODE}/deliverables/${DELIVERABLE_ID}/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', 'invalid-token-12345')
        .withJson({ status: 'IN_PROGRESS' })
        .expectStatus(401)
        .expectJsonLike({ error: 'Unauthorized' });
    });

    it('should accept valid token in TB_TOKEN header', async () => {
      const task = await createTestTask(PROJECT_ID, { status: 'TO_DO', deliverableId: DELIVERABLE_ID });
      await spec()
        .patch(`/projects/${PROJECT_CODE}/deliverables/${DELIVERABLE_ID}/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'IN_PROGRESS' })
        .expectStatus(200);
    });
  });

  describe('Validation', () => {
    it('should return 404 for non-existent task', async () => {
      await spec()
        .patch(`/projects/${PROJECT_CODE}/deliverables/${DELIVERABLE_ID}/tasks/99999/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'IN_PROGRESS' })
        .expectStatus(404)
        .expectJsonLike({ error: 'Task not found in this deliverable' });
    });

    it('should return 400 for invalid status value', async () => {
      const task = await createTestTask(PROJECT_ID, { deliverableId: DELIVERABLE_ID });
      await spec()
        .patch(`/projects/${PROJECT_CODE}/deliverables/${DELIVERABLE_ID}/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'INVALID_STATUS' })
        .expectStatus(400);
    });

    it('should require status in request body', async () => {
      const task = await createTestTask(PROJECT_ID, { deliverableId: DELIVERABLE_ID });
      await spec()
        .patch(`/projects/${PROJECT_CODE}/deliverables/${DELIVERABLE_ID}/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({})
        .expectStatus(400);
    });
  });

  describe('Status Changes', () => {
    it('should change status from TO_DO to IN_PROGRESS', async () => {
      const task = await createTestTask(PROJECT_ID, { status: 'TO_DO', deliverableId: DELIVERABLE_ID });
      await spec()
        .patch(`/projects/${PROJECT_CODE}/deliverables/${DELIVERABLE_ID}/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'IN_PROGRESS' })
        .expectStatus(200)
        .expectJsonLike({ id: task.id, status: 'IN_PROGRESS' });
      const updated = await getTaskById(task.id);
      expect(updated.status).toBe('IN_PROGRESS');
    });

    it('should change status from IN_PROGRESS to COMPLETED', async () => {
      const task = await createTestTask(PROJECT_ID, { status: 'IN_PROGRESS', deliverableId: DELIVERABLE_ID });
      await spec()
        .patch(`/projects/${PROJECT_CODE}/deliverables/${DELIVERABLE_ID}/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'COMPLETED' })
        .expectStatus(200)
        .expectJsonLike({ id: task.id, status: 'COMPLETED' });
      const updated = await getTaskById(task.id);
      expect(updated.status).toBe('COMPLETED');
    });

    it('should change status from TO_DO to QA', async () => {
      const task = await createTestTask(PROJECT_ID, { status: 'TO_DO', deliverableId: DELIVERABLE_ID });
      await spec()
        .patch(`/projects/${PROJECT_CODE}/deliverables/${DELIVERABLE_ID}/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'QA' })
        .expectStatus(200)
        .expectJsonLike({ id: task.id, status: 'QA' });
      const updated = await getTaskById(task.id);
      expect(updated.status).toBe('QA');
    });
  });

  describe('Position Calculation', () => {
    it('should place task at bottom of empty target column', async () => {
      const task = await createTestTask(PROJECT_ID, { status: 'TO_DO', position: 10, deliverableId: DELIVERABLE_ID });
      await spec()
        .patch(`/projects/${PROJECT_CODE}/deliverables/${DELIVERABLE_ID}/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'IN_PROGRESS' })
        .expectStatus(200);
      const updated = await getTaskById(task.id);
      expect(updated.position).toBe(10);
    });

    it('should place task at bottom of non-empty target column', async () => {
      await createTestTask(PROJECT_ID, { status: 'IN_PROGRESS', position: 10, deliverableId: DELIVERABLE_ID });
      await createTestTask(PROJECT_ID, { status: 'IN_PROGRESS', position: 20, deliverableId: DELIVERABLE_ID });
      await createTestTask(PROJECT_ID, { status: 'IN_PROGRESS', position: 30, deliverableId: DELIVERABLE_ID });
      const task = await createTestTask(PROJECT_ID, { status: 'TO_DO', position: 10, deliverableId: DELIVERABLE_ID });
      await spec()
        .patch(`/projects/${PROJECT_CODE}/deliverables/${DELIVERABLE_ID}/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'IN_PROGRESS' })
        .expectStatus(200);
      const updated = await getTaskById(task.id);
      expect(updated.position).toBe(40);
    });

    it('should maintain correct position for multiple moves', async () => {
      const t1 = await createTestTask(PROJECT_ID, { status: 'TO_DO', position: 10, deliverableId: DELIVERABLE_ID });
      const t2 = await createTestTask(PROJECT_ID, { status: 'TO_DO', position: 20, deliverableId: DELIVERABLE_ID });
      await spec().patch(`/projects/${PROJECT_CODE}/deliverables/${DELIVERABLE_ID}/tasks/${t1.id}/status`).withHeaders('TB_TOKEN', VALID_TOKEN).withJson({ status: 'IN_PROGRESS' }).expectStatus(200);
      await spec().patch(`/projects/${PROJECT_CODE}/deliverables/${DELIVERABLE_ID}/tasks/${t2.id}/status`).withHeaders('TB_TOKEN', VALID_TOKEN).withJson({ status: 'IN_PROGRESS' }).expectStatus(200);
      const u1 = await getTaskById(t1.id);
      const u2 = await getTaskById(t2.id);
      expect(u1.position).toBe(10);
      expect(u2.position).toBe(20);
      expect(u2.position).toBeGreaterThan(u1.position);
    });
  });

  describe('Data Integrity', () => {
    it('should preserve other task fields when changing status', async () => {
      const task = await createTestTask(PROJECT_ID, { status: 'TO_DO', title: 'Important Task', priority: 'HIGH', assigneeId: 1, storyPoints: 5, prompt: 'Do something', deliverableId: DELIVERABLE_ID });
      await spec()
        .patch(`/projects/${PROJECT_CODE}/deliverables/${DELIVERABLE_ID}/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'IN_PROGRESS' })
        .expectStatus(200)
        .expectJsonLike({ title: 'Important Task', priority: 'HIGH' });
    });

    it('should update updatedAt timestamp', async () => {
      const task = await createTestTask(PROJECT_ID, { status: 'TO_DO', deliverableId: DELIVERABLE_ID });
      const original = task.updated_at;
      await new Promise((r) => setTimeout(r, 50));
      await spec().patch(`/projects/${PROJECT_CODE}/deliverables/${DELIVERABLE_ID}/tasks/${task.id}/status`).withHeaders('TB_TOKEN', VALID_TOKEN).withJson({ status: 'IN_PROGRESS' }).expectStatus(200);
      const updated = await getTaskById(task.id);
      expect(new Date(updated.updated_at).getTime()).toBeGreaterThanOrEqual(new Date(original).getTime());
    });

    it('should return complete task object', async () => {
      const task = await createTestTask(PROJECT_ID, { status: 'TO_DO', deliverableId: DELIVERABLE_ID });
      await spec()
        .patch(`/projects/${PROJECT_CODE}/deliverables/${DELIVERABLE_ID}/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'IN_PROGRESS' })
        .expectStatus(200)
        .expectJsonSchema({
          type: 'object',
          required: ['id', 'taskId', 'title', 'status', 'priority', 'position', 'projectId', 'deliverableId'],
          properties: {
            id: { type: 'number' },
            taskId: { type: 'number' },
            title: { type: 'string' },
            status: { type: 'string' },
            priority: { type: 'string' },
            position: { type: 'number' },
            projectId: { type: 'number' },
            deliverableId: { type: 'number' }
          }
        });
    });
  });
});
