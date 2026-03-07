import * as pactum from 'pactum';
import { clearTaskData, createTestDeliverable, createTestTask, resetProjectDefaults } from '../helpers/testDatabase.js';

const { spec } = pactum;
const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

describe('Task graph scoping', () => {
  beforeEach(async () => {
    await clearTaskData();
    await resetProjectDefaults();
  });

  it('should return 404 for removed project-wide graph endpoint', async () => {
    await createTestDeliverable(1, { name: 'Graph test deliverable' });

    await spec()
      .get('/projects/ZAZZ/graph')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(404);
  });

  it('should return deliverable-scoped graph for a valid project and deliverable', async () => {
    const deliverable = await createTestDeliverable(1, { name: 'Scoped graph deliverable' });
    await createTestTask(1, { title: 'Task A', deliverableId: deliverable.id, phase: 1, phaseStep: '1.1' });
    await createTestTask(1, { title: 'Task B', deliverableId: deliverable.id, phase: 1, phaseStep: '1.2' });

    const graph = await spec()
      .get(`/projects/ZAZZ/deliverables/${deliverable.id}/graph`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(graph.deliverableId).toBe(deliverable.id);
    expect(graph.projectCode).toBe('ZAZZ');
    expect(Array.isArray(graph.tasks)).toBe(true);
    expect(Array.isArray(graph.relations)).toBe(true);
    expect(graph.tasks).toHaveLength(2);
  });

  it('should return 404 when deliverable is not in the project path', async () => {
    const otherProjectDeliverable = await createTestDeliverable(2, { name: 'Other project deliverable' });

    await spec()
      .get(`/projects/ZAZZ/deliverables/${otherProjectDeliverable.id}/graph`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(404);
  });

  it('should require authentication for deliverable graph endpoint', async () => {
    const deliverable = await createTestDeliverable(1, { name: 'Auth check deliverable' });

    await spec()
      .get(`/projects/ZAZZ/deliverables/${deliverable.id}/graph`)
      .expectStatus(401);
  });
});
