import * as pactum from 'pactum';
import { db } from '../../lib/db/index.js';
import { IMAGE_METADATA } from '../../lib/db/schema.js';
import { clearTaskData, createTestDeliverable, createTestTask, resetProjectDefaults } from '../helpers/testDatabase.js';

const { spec } = pactum;
const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

const SAMPLE_IMAGE = {
  originalName: 'tiny.png',
  contentType: 'image/png',
  fileSize: 68,
  base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBgU6m4QAAAABJRU5ErkJggg=='
};

async function uploadTaskImage(projectCode, deliverableId, taskId) {
  const response = await spec()
    .post(`/projects/${projectCode}/deliverables/${deliverableId}/tasks/${taskId}/images/upload`)
    .withHeaders('TB_TOKEN', VALID_TOKEN)
    .withJson({ images: [SAMPLE_IMAGE] })
    .expectStatus(201)
    .returns('res.body');

  return response.images[0];
}

async function uploadDeliverableImage(projectCode, deliverableId) {
  const response = await spec()
    .post(`/projects/${projectCode}/deliverables/${deliverableId}/images/upload`)
    .withHeaders('TB_TOKEN', VALID_TOKEN)
    .withJson({ images: [SAMPLE_IMAGE] })
    .expectStatus(201)
    .returns('res.body');

  return response.images[0];
}

describe('Project-scoped image routes', () => {
  beforeEach(async () => {
    await clearTaskData();
    await resetProjectDefaults();
  });

  it('should support task image upload/list/get/delete in same project scope', async () => {
    const deliverable = await createTestDeliverable(1, { name: 'Task image scope' });
    const task = await createTestTask(1, { deliverableId: deliverable.id, title: 'Task image task' });

    const uploaded = await uploadTaskImage('ZAZZ', deliverable.id, task.id);
    expect(uploaded.taskId).toBe(task.id);
    expect(uploaded.deliverableId).toBeNull();

    const images = await spec()
      .get(`/projects/ZAZZ/deliverables/${deliverable.id}/tasks/${task.id}/images`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(images.length).toBe(1);
    expect(images[0].id).toBe(uploaded.id);

    await spec()
      .get(`/projects/ZAZZ/images/${uploaded.id}/metadata`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .expectJsonLike({ id: uploaded.id, taskId: task.id });

    await spec()
      .get(`/projects/ZAZZ/images/${uploaded.id}`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .expectHeaderContains('content-type', 'image/png');

    await spec()
      .delete(`/projects/ZAZZ/deliverables/${deliverable.id}/tasks/${task.id}/images/${uploaded.id}`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200);
  });

  it('should support deliverable image upload/list/get/delete in same project scope', async () => {
    const deliverable = await createTestDeliverable(1, { name: 'Deliverable image scope' });
    const uploaded = await uploadDeliverableImage('ZAZZ', deliverable.id);
    expect(uploaded.taskId).toBeNull();
    expect(uploaded.deliverableId).toBe(deliverable.id);

    const images = await spec()
      .get(`/projects/ZAZZ/deliverables/${deliverable.id}/images`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(images.length).toBe(1);
    expect(images[0].id).toBe(uploaded.id);

    await spec()
      .get(`/projects/ZAZZ/images/${uploaded.id}/metadata`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .expectJsonLike({ id: uploaded.id, deliverableId: deliverable.id });

    await spec()
      .delete(`/projects/ZAZZ/deliverables/${deliverable.id}/images/${uploaded.id}`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200);
  });

  it('should return 403 for cross-project image fetch by id', async () => {
    const deliverable = await createTestDeliverable(2, { name: 'Other project deliverable' });
    const task = await createTestTask(2, { deliverableId: deliverable.id, title: 'Other project task' });
    const uploaded = await uploadTaskImage('ZED_MER', deliverable.id, task.id);

    await spec()
      .get(`/projects/ZAZZ/images/${uploaded.id}`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(403);

    await spec()
      .get(`/projects/ZAZZ/images/${uploaded.id}/metadata`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(403);
  });

  it('should return 403 for cross-project image mutation routes', async () => {
    const deliverable = await createTestDeliverable(2, { name: 'Cross project mutate' });
    const task = await createTestTask(2, { deliverableId: deliverable.id, title: 'Cross project mutation task' });
    const taskImage = await uploadTaskImage('ZED_MER', deliverable.id, task.id);
    const deliverableImage = await uploadDeliverableImage('ZED_MER', deliverable.id);

    await spec()
      .delete(`/projects/ZAZZ/deliverables/${deliverable.id}/tasks/${task.id}/images/${taskImage.id}`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(403);

    await spec()
      .delete(`/projects/ZAZZ/deliverables/${deliverable.id}/images/${deliverableImage.id}`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(403);
  });

  it('should require authentication for scoped image routes', async () => {
    const deliverable = await createTestDeliverable(1, { name: 'Auth image deliverable' });
    const task = await createTestTask(1, { deliverableId: deliverable.id, title: 'Auth image task' });

    await spec()
      .get(`/projects/ZAZZ/deliverables/${deliverable.id}/tasks/${task.id}/images`)
      .expectStatus(401);
  });

  it('should return 404 for removed legacy image routes', async () => {
    await spec()
      .get('/tasks/1/images')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(404);

    await spec()
      .post('/tasks/1/images/upload')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ images: [SAMPLE_IMAGE] })
      .expectStatus(404);

    await spec()
      .delete('/tasks/1/images/1')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(404);

    await spec()
      .get('/images/1')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(404);

    await spec()
      .get('/images/1/metadata')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(404);
  });

  it('should enforce single-owner DB constraint in IMAGE_METADATA', async () => {
    const deliverable = await createTestDeliverable(1, { name: 'Constraint deliverable' });
    const task = await createTestTask(1, { deliverableId: deliverable.id, title: 'Constraint task' });

    await expect(
      db.insert(IMAGE_METADATA).values({
        task_id: task.id,
        deliverable_id: deliverable.id,
        original_name: 'bad-both.png',
        content_type: 'image/png',
        file_size: 1,
        url: '/projects/ZAZZ/images/999',
        storage_type: 'local'
      })
    ).rejects.toThrow();

    await expect(
      db.insert(IMAGE_METADATA).values({
        task_id: null,
        deliverable_id: null,
        original_name: 'bad-neither.png',
        content_type: 'image/png',
        file_size: 1,
        url: '/projects/ZAZZ/images/998',
        storage_type: 'local'
      })
    ).rejects.toThrow();
  });
});
