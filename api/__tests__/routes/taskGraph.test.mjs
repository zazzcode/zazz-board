import * as pactum from 'pactum';
import { clearTaskData, createTestTask, createTestRelation, getTaskById, getRelationsForTask, resetProjectDefaults, createTestDeliverable } from '../helpers/testDatabase.js';

const { spec } = pactum;

// Use seeded token from seeders/seedUsers.js
const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

// Project 1 (ZAZZ) has workflow: TO_DO, READY, IN_PROGRESS, QA, COMPLETED
const PROJECT_WITH_READY = 1;
const PROJECT_CODE_ZAZZ = 'ZAZZ';
// Project 3 (APIMOD) has completionCriteriaStatus: COMPLETED
const PROJECT_APIMOD = 3;
const PROJECT_CODE_APIMOD = 'APIMOD';

describe('Task Graph API', () => {
  beforeEach(async () => {
    await clearTaskData();
    await resetProjectDefaults();
  });

  // ==================== TASK RELATIONS CRUD ====================

  describe('POST /tasks/:id/relations', () => {
    it('should return 401 without authentication token', async () => {
      const taskA = await createTestTask(PROJECT_WITH_READY);
      const taskB = await createTestTask(PROJECT_WITH_READY);
      await spec()
        .post(`/projects/${PROJECT_CODE_ZAZZ}/tasks/${taskA.id}/relations`)
        .withJson({ relatedTaskId: taskB.id, relationType: 'DEPENDS_ON' })
        .expectStatus(401);
    });

    it('should create a DEPENDS_ON relation', async () => {
      const taskA = await createTestTask(PROJECT_WITH_READY);
      const taskB = await createTestTask(PROJECT_WITH_READY);
      await spec()
        .post(`/projects/${PROJECT_CODE_ZAZZ}/tasks/${taskA.id}/relations`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ relatedTaskId: taskB.id, relationType: 'DEPENDS_ON' })
        .expectStatus(201)
        .expectJsonLength(1);
    });

    it('should create COORDINATES_WITH with mirror relation', async () => {
      const taskA = await createTestTask(PROJECT_WITH_READY);
      const taskB = await createTestTask(PROJECT_WITH_READY);
      await spec()
        .post(`/projects/${PROJECT_CODE_ZAZZ}/tasks/${taskA.id}/relations`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ relatedTaskId: taskB.id, relationType: 'COORDINATES_WITH' })
        .expectStatus(201)
        .expectJsonLength(2); // Primary + mirror

      // Verify both directions exist in DB
      const relationsA = await getRelationsForTask(taskA.id);
      const relationsB = await getRelationsForTask(taskB.id);
      expect(relationsA.length).toBe(1);
      expect(relationsB.length).toBe(1);
      expect(relationsA[0].related_task_id).toBe(taskB.id);
      expect(relationsB[0].related_task_id).toBe(taskA.id);
    });

    it('should return 400 for self-referencing relation', async () => {
      const task = await createTestTask(PROJECT_WITH_READY);
      await spec()
        .post(`/projects/${PROJECT_CODE_ZAZZ}/tasks/${task.id}/relations`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ relatedTaskId: task.id, relationType: 'DEPENDS_ON' })
        .expectStatus(400)
        .expectJsonLike({ error: 'A task cannot relate to itself' });
    });

    it('should return 400 for cross-project relation', async () => {
      const taskA = await createTestTask(PROJECT_WITH_READY); // Project 1
      const taskB = await createTestTask(2); // Project 2 (MOBDEV)
      await spec()
        .post(`/projects/${PROJECT_CODE_ZAZZ}/tasks/${taskA.id}/relations`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ relatedTaskId: taskB.id, relationType: 'DEPENDS_ON' })
        .expectStatus(400)
        .expectJsonLike({ error: 'Tasks must belong to the same project' });
    });

    it('should return 400 for circular dependency', async () => {
      const taskA = await createTestTask(PROJECT_WITH_READY);
      const taskB = await createTestTask(PROJECT_WITH_READY);
      const taskC = await createTestTask(PROJECT_WITH_READY);

      // A depends on B
      await createTestRelation(taskA.id, taskB.id, 'DEPENDS_ON');
      // B depends on C
      await createTestRelation(taskB.id, taskC.id, 'DEPENDS_ON');

      // C depends on A would create a cycle: A→B→C→A
      await spec()
        .post(`/projects/${PROJECT_CODE_ZAZZ}/tasks/${taskC.id}/relations`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ relatedTaskId: taskA.id, relationType: 'DEPENDS_ON' })
        .expectStatus(400)
        .expectJsonLike({ error: 'This dependency would create a circular reference' });
    });

    it('should return 409 for duplicate relation', async () => {
      const taskA = await createTestTask(PROJECT_WITH_READY);
      const taskB = await createTestTask(PROJECT_WITH_READY);
      await createTestRelation(taskA.id, taskB.id, 'DEPENDS_ON');

      await spec()
        .post(`/projects/${PROJECT_CODE_ZAZZ}/tasks/${taskA.id}/relations`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ relatedTaskId: taskB.id, relationType: 'DEPENDS_ON' })
        .expectStatus(409);
    });

    it('should return 400 for non-existent task', async () => {
      const task = await createTestTask(PROJECT_WITH_READY);
      await spec()
        .post(`/projects/${PROJECT_CODE_ZAZZ}/tasks/${task.id}/relations`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ relatedTaskId: 99999, relationType: 'DEPENDS_ON' })
        .expectStatus(400);
    });

    it('should return 400 for invalid relation type', async () => {
      const taskA = await createTestTask(PROJECT_WITH_READY);
      const taskB = await createTestTask(PROJECT_WITH_READY);
      await spec()
        .post(`/projects/${PROJECT_CODE_ZAZZ}/tasks/${taskA.id}/relations`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ relatedTaskId: taskB.id, relationType: 'INVALID_TYPE' })
        .expectStatus(400);
    });
  });

  describe('GET /tasks/:id/relations', () => {
    it('should return 401 without token', async () => {
      const task = await createTestTask(PROJECT_WITH_READY);
      await spec()
        .get(`/projects/${PROJECT_CODE_ZAZZ}/tasks/${task.id}/relations`)
        .expectStatus(401);
    });

    it('should return empty array for task with no relations', async () => {
      const task = await createTestTask(PROJECT_WITH_READY);
      await spec()
        .get(`/projects/${PROJECT_CODE_ZAZZ}/tasks/${task.id}/relations`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200)
        .expectJsonLength(0);
    });

    it('should return all relations for a task', async () => {
      const taskA = await createTestTask(PROJECT_WITH_READY);
      const taskB = await createTestTask(PROJECT_WITH_READY);
      const taskC = await createTestTask(PROJECT_WITH_READY);
      await createTestRelation(taskA.id, taskB.id, 'DEPENDS_ON');
      await createTestRelation(taskA.id, taskC.id, 'DEPENDS_ON');

      await spec()
        .get(`/projects/${PROJECT_CODE_ZAZZ}/tasks/${taskA.id}/relations`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200)
        .expectJsonLength(2);
    });

    it('should return 404 for non-existent task', async () => {
      await spec()
        .get(`/projects/${PROJECT_CODE_ZAZZ}/tasks/99999/relations`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(404);
    });
  });

  describe('DELETE /tasks/:id/relations/:relatedTaskId/:relationType', () => {
    it('should delete a DEPENDS_ON relation', async () => {
      const taskA = await createTestTask(PROJECT_WITH_READY);
      const taskB = await createTestTask(PROJECT_WITH_READY);
      await createTestRelation(taskA.id, taskB.id, 'DEPENDS_ON');

      await spec()
        .delete(`/projects/${PROJECT_CODE_ZAZZ}/tasks/${taskA.id}/relations/${taskB.id}/DEPENDS_ON`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200)
        .expectJsonLike({ message: 'Relation deleted successfully' });

      // Verify it's gone
      const remaining = await getRelationsForTask(taskA.id);
      expect(remaining.length).toBe(0);
    });

    it('should delete COORDINATES_WITH and its mirror', async () => {
      const taskA = await createTestTask(PROJECT_WITH_READY);
      const taskB = await createTestTask(PROJECT_WITH_READY);
      await createTestRelation(taskA.id, taskB.id, 'COORDINATES_WITH');
      await createTestRelation(taskB.id, taskA.id, 'COORDINATES_WITH'); // mirror

      await spec()
        .delete(`/projects/${PROJECT_CODE_ZAZZ}/tasks/${taskA.id}/relations/${taskB.id}/COORDINATES_WITH`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200);

      // Both directions should be gone
      const relA = await getRelationsForTask(taskA.id);
      const relB = await getRelationsForTask(taskB.id);
      expect(relA.length).toBe(0);
      expect(relB.length).toBe(0);
    });

    it('should return 404 for non-existent relation', async () => {
      const taskA = await createTestTask(PROJECT_WITH_READY);
      const taskB = await createTestTask(PROJECT_WITH_READY);
      await spec()
        .delete(`/projects/${PROJECT_CODE_ZAZZ}/tasks/${taskA.id}/relations/${taskB.id}/DEPENDS_ON`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(404);
    });
  });

  // ==================== PROJECT TASK GRAPH ====================

  describe('GET /projects/:code/graph', () => {
    it('should return 401 without token', async () => {
      await spec()
        .get(`/projects/${PROJECT_CODE_ZAZZ}/graph`)
        .expectStatus(401);
    });

    it('should return empty graph for project with no tasks', async () => {
      // Project 4 (DATAMIG) — we cleared all tasks in beforeEach
      await spec()
        .get('/projects/DATAMIG/graph')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200)
        .expectJsonLike({ tasks: [], relations: [] });
    });

    it('should return tasks and relations for a project', async () => {
      const taskA = await createTestTask(PROJECT_WITH_READY);
      const taskB = await createTestTask(PROJECT_WITH_READY);
      const taskC = await createTestTask(PROJECT_WITH_READY);
      await createTestRelation(taskB.id, taskA.id, 'DEPENDS_ON');
      await createTestRelation(taskC.id, taskB.id, 'DEPENDS_ON');

      const response = await spec()
        .get(`/projects/${PROJECT_CODE_ZAZZ}/graph`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200)
        .returns('res.body');

      expect(response.projectId).toBe(PROJECT_WITH_READY);
      expect(response.projectCode).toBe('ZAZZ');
      expect(response.taskGraphLayoutDirection).toBe('LR');
      expect(response.tasks.length).toBe(3);
      expect(response.relations.length).toBe(2);
    });

    it('should return 404 for non-existent project', async () => {
      await spec()
        .get('/projects/NONEXIST/graph')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(404);
    });
  });

  // ==================== TASK READINESS ====================

  describe('GET /tasks/:id/readiness', () => {
    it('should return ready=true for task with no dependencies', async () => {
      const task = await createTestTask(PROJECT_WITH_READY);
      await spec()
        .get(`/projects/${PROJECT_CODE_ZAZZ}/tasks/${task.id}/readiness`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200)
        .expectJsonLike({ ready: true, blockedBy: [] });
    });

    it('should return ready=false when dependency is not met', async () => {
      const dep = await createTestTask(PROJECT_WITH_READY, { status: 'TO_DO' });
      const task = await createTestTask(PROJECT_WITH_READY, { status: 'TO_DO' });
      await createTestRelation(task.id, dep.id, 'DEPENDS_ON');

      const response = await spec()
        .get(`/projects/${PROJECT_CODE_ZAZZ}/tasks/${task.id}/readiness`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200)
        .returns('res.body');

      expect(response.ready).toBe(false);
      expect(response.blockedBy.length).toBe(1);
      expect(response.blockedBy[0].id).toBe(dep.id);
    });

    it('should return ready=true when dependency is COMPLETED', async () => {
      const dep = await createTestTask(PROJECT_WITH_READY, { status: 'COMPLETED' });
      const task = await createTestTask(PROJECT_WITH_READY, { status: 'TO_DO' });
      await createTestRelation(task.id, dep.id, 'DEPENDS_ON');

      await spec()
        .get(`/projects/${PROJECT_CODE_ZAZZ}/tasks/${task.id}/readiness`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200)
        .expectJsonLike({ ready: true, blockedBy: [] });
    });

    it('should use project completionCriteriaStatus for readiness threshold', async () => {
      // APIMOD project has completionCriteriaStatus: COMPLETED
      // Workflow: TO_DO, READY, IN_PROGRESS, QA, COMPLETED
      const dep = await createTestTask(PROJECT_APIMOD, { status: 'COMPLETED' });
      const task = await createTestTask(PROJECT_APIMOD, { status: 'TO_DO' });
      await createTestRelation(task.id, dep.id, 'DEPENDS_ON');

      // COMPLETED meets the criteria (>= COMPLETED position)
      await spec()
        .get(`/projects/${PROJECT_CODE_APIMOD}/tasks/${task.id}/readiness`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200)
        .expectJsonLike({ ready: true, blockedBy: [] });
    });

    it('should return 404 for non-existent task', async () => {
      await spec()
        .get(`/projects/${PROJECT_CODE_ZAZZ}/tasks/99999/readiness`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(404);
    });
  });

  // ==================== AUTO-PROMOTION ====================

  describe('Auto-promotion TO_DO → READY', () => {
    let deliverableId;

    beforeEach(async () => {
      const deliverable = await createTestDeliverable(PROJECT_WITH_READY);
      deliverableId = deliverable.id;
    });

    it('should auto-promote dependent task when dependency status reaches COMPLETED', async () => {
      // Setup: depTask (IN_PROGRESS) ← task (TO_DO, depends on depTask)
      const depTask = await createTestTask(PROJECT_WITH_READY, { status: 'IN_PROGRESS', deliverableId });
      const task = await createTestTask(PROJECT_WITH_READY, { status: 'TO_DO', deliverableId });
      await createTestRelation(task.id, depTask.id, 'DEPENDS_ON');

      // Move depTask to COMPLETED — should trigger auto-promotion of task
      await spec()
        .patch(`/projects/${PROJECT_CODE_ZAZZ}/deliverables/${deliverableId}/tasks/${depTask.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'COMPLETED' })
        .expectStatus(200);

      // Verify dependent task was promoted to READY
      const updated = await getTaskById(task.id);
      expect(updated.status).toBe('READY');
    });

    it('should NOT promote if not all dependencies are met', async () => {
      const dep1 = await createTestTask(PROJECT_WITH_READY, { status: 'IN_PROGRESS', deliverableId });
      const dep2 = await createTestTask(PROJECT_WITH_READY, { status: 'TO_DO', deliverableId });
      const task = await createTestTask(PROJECT_WITH_READY, { status: 'TO_DO', deliverableId });
      await createTestRelation(task.id, dep1.id, 'DEPENDS_ON');
      await createTestRelation(task.id, dep2.id, 'DEPENDS_ON');

      // Move dep1 to COMPLETED — dep2 is still TO_DO
      await spec()
        .patch(`/projects/${PROJECT_CODE_ZAZZ}/deliverables/${deliverableId}/tasks/${dep1.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'COMPLETED' })
        .expectStatus(200);

      // task should still be TO_DO
      const updated = await getTaskById(task.id);
      expect(updated.status).toBe('TO_DO');
    });

    it('should promote when all dependencies are met', async () => {
      const dep1 = await createTestTask(PROJECT_WITH_READY, { status: 'COMPLETED', deliverableId });
      const dep2 = await createTestTask(PROJECT_WITH_READY, { status: 'IN_PROGRESS', deliverableId });
      const task = await createTestTask(PROJECT_WITH_READY, { status: 'TO_DO', deliverableId });
      await createTestRelation(task.id, dep1.id, 'DEPENDS_ON');
      await createTestRelation(task.id, dep2.id, 'DEPENDS_ON');

      // Now move dep2 to COMPLETED — both deps met
      await spec()
        .patch(`/projects/${PROJECT_CODE_ZAZZ}/deliverables/${deliverableId}/tasks/${dep2.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'COMPLETED' })
        .expectStatus(200);

      const updated = await getTaskById(task.id);
      expect(updated.status).toBe('READY');
    });

    it('should NOT promote task that is not in TO_DO status', async () => {
      const dep = await createTestTask(PROJECT_WITH_READY, { status: 'IN_PROGRESS', deliverableId });
      const task = await createTestTask(PROJECT_WITH_READY, { status: 'IN_PROGRESS', deliverableId }); // Already past TO_DO
      await createTestRelation(task.id, dep.id, 'DEPENDS_ON');

      await spec()
        .patch(`/projects/${PROJECT_CODE_ZAZZ}/deliverables/${deliverableId}/tasks/${dep.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'COMPLETED' })
        .expectStatus(200);

      // task should stay IN_PROGRESS
      const updated = await getTaskById(task.id);
      expect(updated.status).toBe('IN_PROGRESS');
    });
  });

  // ==================== COORDINATION REQUIREMENTS ====================

  describe('GET /coordination-types', () => {
    it('should return 401 without token', async () => {
      await spec()
        .get('/coordination-types')
        .expectStatus(401);
    });

    it('should return all coordination types', async () => {
      const response = await spec()
        .get('/coordination-types')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200)
        .returns('res.body');

      expect(response.length).toBe(5);
      const codes = response.map(d => d.code);
      expect(codes).toContain('TEST_TOGETHER');
      expect(codes).toContain('DEPLOY_TOGETHER');
      expect(codes).toContain('MERGE_TOGETHER');
      expect(codes).toContain('RELEASE_TOGETHER');
      expect(codes).toContain('MIGRATE_TOGETHER');
    });
  });

  // ==================== PROJECT GRAPH SETTINGS ====================

  describe('PUT /projects/:id (graph settings)', () => {
    it('should update taskGraphLayoutDirection', async () => {
      await spec()
        .put(`/projects/${PROJECT_WITH_READY}`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ taskGraphLayoutDirection: 'TB' })
        .expectStatus(200);

      // Verify via graph endpoint (uses project code now)
      const graph = await spec()
        .get(`/projects/${PROJECT_CODE_ZAZZ}/graph`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200)
        .returns('res.body');

      expect(graph.taskGraphLayoutDirection).toBe('TB');
    });

    it('should update completionCriteriaStatus', async () => {
      await spec()
        .put(`/projects/${PROJECT_WITH_READY}`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ completionCriteriaStatus: 'QA' })
        .expectStatus(200);

      const graph = await spec()
        .get(`/projects/${PROJECT_CODE_ZAZZ}/graph`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200)
        .returns('res.body');

      expect(graph.completionCriteriaStatus).toBe('QA');
    });

    it('should reject invalid layout direction', async () => {
      await spec()
        .put(`/projects/${PROJECT_WITH_READY}`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ taskGraphLayoutDirection: 'INVALID' })
        .expectStatus(400);
    });
  });
});
