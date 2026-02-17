import * as pactum from 'pactum';
import { clearTaskData, createTestDeliverable, createTestTask, getTaskById } from '../helpers/testDatabase.js';

const { spec } = pactum;
const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

describe('Deliverables Tasks Relationship', () => {
  beforeEach(async () => {
    await clearTaskData();
  });

  it('should list tasks for a deliverable', async () => {
    const deliverable = await createTestDeliverable(1, { name: 'Task Container' });
    
    await createTestTask(1, {
      title: 'Task A',
      deliverableId: deliverable.id,
      status: 'TO_DO'
    });
    await createTestTask(1, {
      title: 'Task B',
      deliverableId: deliverable.id,
      status: 'IN_PROGRESS'
    });

    const response = await spec()
      .get(`/projects/ZAZZ/deliverables/${deliverable.id}/tasks`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(Array.isArray(response)).toBe(true);
    expect(response.length).toBe(2);
    expect(response.every(t => t.deliverableId === deliverable.id)).toBe(true);
  });

  it('should return empty array when deliverable has no tasks', async () => {
    const deliverable = await createTestDeliverable(1, { name: 'Empty Deliverable' });

    const response = await spec()
      .get(`/projects/ZAZZ/deliverables/${deliverable.id}/tasks`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(Array.isArray(response)).toBe(true);
    expect(response.length).toBe(0);
  });

  it('should only return tasks for the specified deliverable', async () => {
    const d1 = await createTestDeliverable(1, { name: 'Deliverable 1' });
    const d2 = await createTestDeliverable(1, { name: 'Deliverable 2' });

    await createTestTask(1, {
      title: 'Task in D1',
      deliverableId: d1.id
    });
    await createTestTask(1, {
      title: 'Task in D2',
      deliverableId: d2.id
    });

    const d1Tasks = await spec()
      .get(`/projects/ZAZZ/deliverables/${d1.id}/tasks`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(d1Tasks.length).toBe(1);
    expect(d1Tasks[0].deliverableId).toBe(d1.id);
  });

  it('should require authentication to list deliverable tasks', async () => {
    const deliverable = await createTestDeliverable(1, { name: 'Test' });

    await spec()
      .get(`/projects/ZAZZ/deliverables/${deliverable.id}/tasks`)
      .expectStatus(401);
  });

  it('should return 404 for non-existent deliverable tasks', async () => {
    await spec()
      .get('/projects/ZAZZ/deliverables/99999/tasks')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(404);
  });

  it('should include task status in returned task objects', async () => {
    const deliverable = await createTestDeliverable(1);
    
    await createTestTask(1, {
      title: 'To Do Task',
      deliverableId: deliverable.id,
      status: 'TO_DO'
    });
    await createTestTask(1, {
      title: 'In Progress Task',
      deliverableId: deliverable.id,
      status: 'IN_PROGRESS'
    });

    const response = await spec()
      .get(`/projects/ZAZZ/deliverables/${deliverable.id}/tasks`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(response.length).toBe(2);
    expect(response.some(t => t.status === 'TO_DO')).toBe(true);
    expect(response.some(t => t.status === 'IN_PROGRESS')).toBe(true);
  });

  it('should include task priority in returned task objects', async () => {
    const deliverable = await createTestDeliverable(1);
    
    await createTestTask(1, {
      title: 'High Priority Task',
      deliverableId: deliverable.id,
      priority: 'HIGH'
    });

    const response = await spec()
      .get(`/projects/ZAZZ/deliverables/${deliverable.id}/tasks`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(response[0].priority).toBe('HIGH');
  });

  it('should include task assignee in returned task objects', async () => {
    const deliverable = await createTestDeliverable(1);
    
    await createTestTask(1, {
      title: 'Assigned Task',
      deliverableId: deliverable.id,
      assigneeId: 2
    });

    const response = await spec()
      .get(`/projects/ZAZZ/deliverables/${deliverable.id}/tasks`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(response[0].assigneeId).toBe(2);
  });

  it('should return tasks ordered by position', async () => {
    const deliverable = await createTestDeliverable(1);
    
    // Create tasks with explicit positions
    const task1 = await createTestTask(1, {
      title: 'First Task',
      deliverableId: deliverable.id,
      position: 10
    });
    const task2 = await createTestTask(1, {
      title: 'Second Task',
      deliverableId: deliverable.id,
      position: 20
    });
    const task3 = await createTestTask(1, {
      title: 'Third Task',
      deliverableId: deliverable.id,
      position: 30
    });

    const response = await spec()
      .get(`/projects/ZAZZ/deliverables/${deliverable.id}/tasks`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(response.length).toBe(3);
    expect(response[0].position).toBe(10);
    expect(response[1].position).toBe(20);
    expect(response[2].position).toBe(30);
  });

  it('should include task id in response', async () => {
    const deliverable = await createTestDeliverable(1);
    
    const created = await createTestTask(1, {
      title: 'Task with ID',
      deliverableId: deliverable.id
    });

    const response = await spec()
      .get(`/projects/ZAZZ/deliverables/${deliverable.id}/tasks`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(response[0].id).toBe(created.id);
  });

  it('should support querying tasks across multiple deliverables in same project', async () => {
    const d1 = await createTestDeliverable(1);
    const d2 = await createTestDeliverable(1);
    const d3 = await createTestDeliverable(1);

    // Add 2 tasks to each deliverable
    for (let i = 0; i < 2; i++) {
      await createTestTask(1, { title: `D1-Task${i}`, deliverableId: d1.id });
      await createTestTask(1, { title: `D2-Task${i}`, deliverableId: d2.id });
      await createTestTask(1, { title: `D3-Task${i}`, deliverableId: d3.id });
    }

    // Verify each deliverable has exactly 2 tasks
    const d1Tasks = await spec()
      .get(`/projects/ZAZZ/deliverables/${d1.id}/tasks`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');
    
    const d2Tasks = await spec()
      .get(`/projects/ZAZZ/deliverables/${d2.id}/tasks`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(d1Tasks.length).toBe(2);
    expect(d2Tasks.length).toBe(2);
    expect(d1Tasks.every(t => t.deliverableId === d1.id)).toBe(true);
    expect(d2Tasks.every(t => t.deliverableId === d2.id)).toBe(true);
  });

  it('should handle tasks from different projects separately', async () => {
    const d1_proj1 = await createTestDeliverable(1);
    const d1_proj3 = await createTestDeliverable(3);

    await createTestTask(1, {
      title: 'Project 1 Task',
      deliverableId: d1_proj1.id
    });
    await createTestTask(3, {
      title: 'Project 3 Task',
      deliverableId: d1_proj3.id
    });

    const tasks1 = await spec()
      .get(`/projects/ZAZZ/deliverables/${d1_proj1.id}/tasks`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    const tasks3 = await spec()
      .get(`/projects/APIMOD/deliverables/${d1_proj3.id}/tasks`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(tasks1.length).toBe(1);
    expect(tasks3.length).toBe(1);
    expect(tasks1[0].title).toBe('Project 1 Task');
    expect(tasks3[0].title).toBe('Project 3 Task');
  });
});
