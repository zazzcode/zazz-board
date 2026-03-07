import * as pactum from 'pactum';
import { clearTaskData, createTestDeliverable, createTestTask, resetProjectDefaults } from '../helpers/testDatabase.js';

const { spec } = pactum;
const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

describe('Project-id route regressions', () => {
  beforeEach(async () => {
    await clearTaskData();
    await resetProjectDefaults();
  });

  it('should keep GET /projects/:id functional', async () => {
    const project = await spec()
      .get('/projects/1')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(project.id).toBe(1);
    expect(project.code).toBe('ZAZZ');
  });

  it('should keep GET /projects/:id/tasks functional', async () => {
    const deliverable = await createTestDeliverable(1, { name: 'Project task list regression' });
    await createTestTask(1, {
      deliverableId: deliverable.id,
      title: 'Project id route task',
      status: 'READY'
    });

    const tasks = await spec()
      .get('/projects/1/tasks')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBe(1);
    expect(tasks[0].projectId).toBe(1);
  });

  it('should keep GET /projects/:id/kanban/tasks/column/:status functional', async () => {
    const deliverable = await createTestDeliverable(1, { name: 'Column position regression' });
    const task = await createTestTask(1, {
      deliverableId: deliverable.id,
      title: 'Column task',
      status: 'READY',
      position: 30
    });

    const columnTasks = await spec()
      .get('/projects/1/kanban/tasks/column/READY')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(Array.isArray(columnTasks)).toBe(true);
    expect(columnTasks.some((row) => row.id === task.id)).toBe(true);
  });
});
