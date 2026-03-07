import * as pactum from 'pactum';
import { clearTaskData, createTestDeliverable, resetProjectDefaults } from '../helpers/testDatabase.js';

const { spec } = pactum;
const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

describe('Project Deliverable Status Workflow Configuration', () => {
  beforeEach(async () => {
    await clearTaskData();
    await resetProjectDefaults();
  });

  it('should get default deliverable status workflow for ZAZZ project', async () => {
    const response = await spec()
      .get('/projects/ZAZZ/deliverable-statuses')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(response.deliverableStatusWorkflow).toEqual(['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'STAGED', 'DONE']);
  });


  it('should require authentication to get deliverable status workflow', async () => {
    await spec()
      .get('/projects/ZAZZ/deliverable-statuses')
      .expectStatus(401);
  });

  it('should return 404 for non-existent project', async () => {
    await spec()
      .get('/projects/INVALID/deliverable-statuses')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(404);
  });

  it('should update deliverable status workflow for a project', async () => {
    const newWorkflow = ['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'STAGED', 'DONE'];

    await spec()
      .put('/projects/ZAZZ/deliverable-statuses')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ deliverableStatusWorkflow: newWorkflow })
      .expectStatus(200)
      .expectJsonLike({ deliverableStatusWorkflow: newWorkflow });
  });

  it('should persist updated deliverable status workflow', async () => {
    const newWorkflow = ['PLANNING', 'IN_PROGRESS', 'STAGED', 'DONE'];

    await spec()
      .put('/projects/ZAZZ/deliverable-statuses')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ deliverableStatusWorkflow: newWorkflow })
      .expectStatus(200);

    const response = await spec()
      .get('/projects/ZAZZ/deliverable-statuses')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(response.deliverableStatusWorkflow).toEqual(newWorkflow);
  });

  it('should prevent removal of statuses that have deliverables', async () => {
    // Create a deliverable in IN_PROGRESS status
    await createTestDeliverable(1, { status: 'IN_PROGRESS' });

    const newWorkflow = ['PLANNING', 'IN_REVIEW', 'STAGED', 'DONE'];

    await spec()
      .put('/projects/ZAZZ/deliverable-statuses')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ deliverableStatusWorkflow: newWorkflow })
      .expectStatus(400);
  });

  it('should allow adding new statuses to workflow', async () => {
    const currentWorkflow = await spec()
      .get('/projects/ZAZZ/deliverable-statuses')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    const newWorkflow = [...currentWorkflow.deliverableStatusWorkflow, 'ICEBOX'];

    await spec()
      .put('/projects/ZAZZ/deliverable-statuses')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ deliverableStatusWorkflow: newWorkflow })
      .expectStatus(200);

    const updated = await spec()
      .get('/projects/ZAZZ/deliverable-statuses')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(updated.deliverableStatusWorkflow).toContain('ICEBOX');
  });

  it('should allow reordering statuses in workflow', async () => {
    const newWorkflow = ['PLANNING', 'STAGED', 'IN_REVIEW', 'IN_PROGRESS', 'DONE'];

    await spec()
      .put('/projects/ZAZZ/deliverable-statuses')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ deliverableStatusWorkflow: newWorkflow })
      .expectStatus(200);

    const updated = await spec()
      .get('/projects/ZAZZ/deliverable-statuses')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(updated.deliverableStatusWorkflow).toEqual(newWorkflow);
  });

  it('should require authentication to update deliverable status workflow', async () => {
    const newWorkflow = ['PLANNING', 'DONE'];

    await spec()
      .put('/projects/ZAZZ/deliverable-statuses')
      .withJson({ deliverableStatusWorkflow: newWorkflow })
      .expectStatus(401);
  });

  it('should validate workflow array is not empty', async () => {
    await spec()
      .put('/projects/ZAZZ/deliverable-statuses')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ deliverableStatusWorkflow: [] })
      .expectStatus(400);
  });

  it('should return workflow for multiple seeded projects', async () => {
    // Project ZAZZ
    const zazz = await spec()
      .get('/projects/ZAZZ/deliverable-statuses')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');
    // Project ZED_MER
    const zedMer = await spec()
      .get('/projects/ZED_MER/deliverable-statuses')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');
    expect(Array.isArray(zazz.deliverableStatusWorkflow)).toBe(true);
    expect(Array.isArray(zedMer.deliverableStatusWorkflow)).toBe(true);
    expect(zedMer.deliverableStatusWorkflow).toEqual(['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'STAGED', 'DONE']);
    expect(zazz.deliverableStatusWorkflow).toEqual(['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'STAGED', 'DONE']);
  });

  it('should validate status is in workflow when transitioning deliverable', async () => {
    // Create a minimal workflow
    const minimalWorkflow = ['PLANNING', 'DONE'];
    await spec()
      .put('/projects/ZAZZ/deliverable-statuses')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ deliverableStatusWorkflow: minimalWorkflow })
      .expectStatus(200);

    // Try to transition deliverable to a status not in the workflow
    const deliverable = await createTestDeliverable(1, {
      status: 'PLANNING',
      planFilepath: 'docs/test.md'
    });

    await spec()
      .patch(`/projects/ZAZZ/deliverables/${deliverable.id}/approve`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200);

    // Try to transition to IN_REVIEW (not in our minimal workflow)
    await spec()
      .patch(`/projects/ZAZZ/deliverables/${deliverable.id}/status`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ status: 'IN_REVIEW' })
      .expectStatus(400);

    // Transition to DONE should work
    await spec()
      .patch(`/projects/ZAZZ/deliverables/${deliverable.id}/status`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ status: 'DONE' })
      .expectStatus(200)
      .expectJsonLike({ status: 'DONE' });
  });

  it('should preserve PLANNING as first status implicitly', async () => {
    // All deliverable workflows should start with PLANNING
    const zazz = await spec()
      .get('/projects/ZAZZ/deliverable-statuses')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(zazz.deliverableStatusWorkflow[0]).toBe('PLANNING');
  });

  it('should allow different seeded projects to have valid workflow arrays', async () => {
    const project1 = await spec()
      .get('/projects/ZAZZ/deliverable-statuses')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    const project2 = await spec()
      .get('/projects/ZED_MER/deliverable-statuses')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');
    expect(Array.isArray(project1.deliverableStatusWorkflow)).toBe(true);
    expect(Array.isArray(project2.deliverableStatusWorkflow)).toBe(true);
  });
});
