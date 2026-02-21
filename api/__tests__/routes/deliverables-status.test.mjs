import * as pactum from 'pactum';
import { clearTaskData, createTestDeliverable, resetProjectDefaults } from '../helpers/testDatabase.js';

const { spec } = pactum;
const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

describe('Deliverables Status Transitions', () => {
  beforeEach(async () => {
    await clearTaskData();
    await resetProjectDefaults();
  });

  it('should start new deliverable in PLANNING status', async () => {
    const response = await spec()
      .post('/projects/ZAZZ/deliverables')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({
        name: 'New Deliverable',
        type: 'FEATURE'
      })
      .expectStatus(201)
      .returns('res.body');

    expect(response.status).toBe('PLANNING');
    expect(Array.isArray(response.statusHistory)).toBe(true);
    expect(response.statusHistory.length).toBeGreaterThan(0);
  });

  it('should transition from PLANNING to IN_PROGRESS after approval', async () => {
    const created = await createTestDeliverable(1, {
      status: 'PLANNING',
      planFilePath: 'docs/test-plan.md'
    });

    // First approve the plan
    await spec()
      .patch(`/projects/ZAZZ/deliverables/${created.id}/approve`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200);

    // Then transition to IN_PROGRESS
    const response = await spec()
      .patch(`/projects/ZAZZ/deliverables/${created.id}/status`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ status: 'IN_PROGRESS' })
      .expectStatus(200)
      .returns('res.body');

    expect(response.status).toBe('IN_PROGRESS');
    expect(response.statusHistory.length).toBeGreaterThan(1);
  });

  it('should block transition to IN_PROGRESS without plan approval', async () => {
    const created = await createTestDeliverable(1, {
      status: 'PLANNING',
      planFilePath: null
    });

    await spec()
      .patch(`/projects/ZAZZ/deliverables/${created.id}/status`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ status: 'IN_PROGRESS' })
      .expectStatus(400);
  });

  it('should allow transition IN_PROGRESS → IN_REVIEW', async () => {
    const created = await createTestDeliverable(1, {
      status: 'IN_PROGRESS',
      approvedAt: new Date(),
      approvedBy: 1
    });

    const response = await spec()
      .patch(`/projects/ZAZZ/deliverables/${created.id}/status`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ status: 'IN_REVIEW' })
      .expectStatus(200)
      .returns('res.body');

    expect(response.status).toBe('IN_REVIEW');
  });

  it('should allow transition IN_REVIEW → STAGED', async () => {
    const created = await createTestDeliverable(1, {
      status: 'IN_REVIEW'
    });

    const response = await spec()
      .patch(`/projects/ZAZZ/deliverables/${created.id}/status`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ status: 'STAGED' })
      .expectStatus(200)
      .returns('res.body');

    expect(response.status).toBe('STAGED');
  });

  it('should allow transition STAGED → DONE', async () => {
    const created = await createTestDeliverable(1, {
      status: 'STAGED'
    });

    const response = await spec()
      .patch(`/projects/ZAZZ/deliverables/${created.id}/status`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ status: 'DONE' })
      .expectStatus(200)
      .returns('res.body');

    expect(response.status).toBe('DONE');
  });

  it('should validate status is in project deliverable_status_workflow', async () => {
    const created = await createTestDeliverable(1, {
      status: 'PLANNING'
    });

    // Try to transition to an invalid status not in the workflow
    await spec()
      .patch(`/projects/ZAZZ/deliverables/${created.id}/status`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ status: 'INVALID_STATUS' })
      .expectStatus(400);
  });

  it('should track status history on each transition', async () => {
    const created = await createTestDeliverable(1, {
      status: 'PLANNING',
      planFilePath: 'docs/test-plan.md'
    });

    // Approve
    await spec()
      .patch(`/projects/ZAZZ/deliverables/${created.id}/approve`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200);

    // Transition to IN_PROGRESS
    await spec()
      .patch(`/projects/ZAZZ/deliverables/${created.id}/status`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ status: 'IN_PROGRESS' })
      .expectStatus(200);

    // Fetch and verify status history has multiple entries
    const result = await spec()
      .get(`/projects/ZAZZ/deliverables/${created.id}`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(result.statusHistory.length).toBeGreaterThanOrEqual(2);
    expect(result.statusHistory.some(h => h.status === 'PLANNING')).toBe(true);
    expect(result.statusHistory.some(h => h.status === 'IN_PROGRESS')).toBe(true);
  });

  it('should require authentication for status transitions', async () => {
    const created = await createTestDeliverable(1, { status: 'PLANNING' });

    await spec()
      .patch(`/projects/ZAZZ/deliverables/${created.id}/status`)
      .withJson({ status: 'IN_PROGRESS' })
      .expectStatus(401);
  });

  it('should return 404 for non-existent deliverable status change', async () => {
    await spec()
      .patch('/projects/ZAZZ/deliverables/99999/status')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ status: 'IN_PROGRESS' })
      .expectStatus(404);
  });

  it('should support UAT and PROD statuses in APIMOD project', async () => {
    // APIMOD project has extended deliverable_status_workflow with UAT and PROD
    const created = await createTestDeliverable(3,  {
      status: 'PLANNING',
      planFilePath: 'docs/test-plan.md'
    });

    // Approve
    await spec()
      .patch(`/projects/APIMOD/deliverables/${created.id}/approve`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200);

    // Progress through states to UAT
    await spec()
      .patch(`/projects/APIMOD/deliverables/${created.id}/status`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ status: 'IN_PROGRESS' })
      .expectStatus(200);

    await spec()
      .patch(`/projects/APIMOD/deliverables/${created.id}/status`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ status: 'IN_REVIEW' })
      .expectStatus(200);

    const response = await spec()
      .patch(`/projects/APIMOD/deliverables/${created.id}/status`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ status: 'UAT' })
      .expectStatus(200)
      .returns('res.body');

    expect(response.status).toBe('UAT');
  });
});
