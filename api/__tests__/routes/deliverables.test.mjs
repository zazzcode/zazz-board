import * as pactum from 'pactum';
import { clearTaskData, createTestDeliverable, createTestTask, resetProjectDefaults } from '../helpers/testDatabase.js';

const { spec } = pactum;
const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

describe('Deliverables API', () => {
  beforeEach(async () => {
    await clearTaskData();
    await resetProjectDefaults();
  });

  it('should require authentication for listing project deliverables', async () => {
    await spec()
      .get('/projects/ZAZZ/deliverables')
      .expectStatus(401);
  });

  it('should list project deliverables', async () => {
    await createTestDeliverable(1, { name: 'D1', status: 'PLANNING' });
    await createTestDeliverable(1, { name: 'D2', status: 'IN_PROGRESS' });
    await createTestDeliverable(3,  { name: 'Other Project Deliverable' });

    const response = await spec()
      .get('/projects/ZAZZ/deliverables')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(Array.isArray(response)).toBe(true);
    expect(response.length).toBe(2);
    expect(response.every(d => d.projectId === 1)).toBe(true);
  });

  it('should create a deliverable for a project', async () => {
    const response = await spec()
      .post('/projects/ZAZZ/deliverables')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({
        name: 'New Deliverable',
        type: 'FEATURE',
        planFilePath: 'docs/new-deliverable-plan.md'
      })
      .expectStatus(201)
      .returns('res.body');

    expect(response.projectId).toBe(1);
    expect(response.name).toBe('New Deliverable');
    expect(response.type).toBe('FEATURE');
    expect(response.status).toBe('PLANNING');
    expect(response.deliverableId).toMatch(/^ZAZZ-\d+$/);
  });

  it('should update and fetch a deliverable by id', async () => {
    const created = await createTestDeliverable(1, { name: 'Original Name' });

    await spec()
      .put(`/projects/ZAZZ/deliverables/${created.id}`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ name: 'Updated Name' })
      .expectStatus(200)
      .expectJsonLike({ id: created.id, name: 'Updated Name' });

    await spec()
      .get(`/projects/ZAZZ/deliverables/${created.id}`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .expectJsonLike({ id: created.id, name: 'Updated Name' });
  });

  it('should not move deliverable to IN_PROGRESS before approval and plan', async () => {
    const created = await createTestDeliverable(1, {
      name: 'Needs Approval',
      planFilePath: null,
      approvedAt: null,
      approvedBy: null
    });

    await spec()
      .patch(`/projects/ZAZZ/deliverables/${created.id}/status`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ status: 'IN_PROGRESS' })
      .expectStatus(400);
  });

  it('should approve then move deliverable to IN_PROGRESS', async () => {
    const created = await createTestDeliverable(1, {
      planFilePath: 'docs/approved-plan.md',
      status: 'PLANNING'
    });

    await spec()
      .patch(`/projects/ZAZZ/deliverables/${created.id}/approve`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200);

    await spec()
      .patch(`/projects/ZAZZ/deliverables/${created.id}/status`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ status: 'IN_PROGRESS' })
      .expectStatus(200)
      .expectJsonLike({ id: created.id, status: 'IN_PROGRESS' });
  });

  it('should list tasks for a deliverable', async () => {
    const deliverable = await createTestDeliverable(1, { name: 'Delivery Scope' });
    await createTestTask(1, { title: 'Task A', deliverableId: deliverable.id });
    await createTestTask(1, { title: 'Task B', deliverableId: deliverable.id });

    const tasks = await spec()
      .get(`/projects/ZAZZ/deliverables/${deliverable.id}/tasks`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBe(2);
    expect(tasks.every(t => t.deliverableId === deliverable.id)).toBe(true);
  });
});
