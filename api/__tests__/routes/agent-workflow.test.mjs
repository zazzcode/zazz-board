import * as pactum from 'pactum';
import { clearTaskData, resetProjectDefaults } from '../helpers/testDatabase.js';

const { spec } = pactum;
const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

// ── API helpers ────────────────────────────────────────────────────────────
const h = {
  createDeliverable: (name) =>
    spec()
      .post('/projects/ZAZZ/deliverables')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ name, type: 'FEATURE' })
      .expectStatus(201)
      .returns('res.body'),

  createTask: (delivId, body) =>
    spec()
      .post(`/projects/ZAZZ/deliverables/${delivId}/tasks`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson(body)
      .expectStatus(201)
      .returns('res.body'),

  setStatus: (delivId, taskId, status) =>
    spec()
      .patch(`/projects/ZAZZ/deliverables/${delivId}/tasks/${taskId}/status`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ status })
      .expectStatus(200)
      .returns('res.body'),

  appendNote: (delivId, taskId, note, agentName) =>
    spec()
      .patch(`/projects/ZAZZ/deliverables/${delivId}/tasks/${taskId}/notes`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ note, agentName })
      .expectStatus(200)
      .returns('res.body'),

  getGraph: (delivId) =>
    spec()
      .get(`/projects/ZAZZ/deliverables/${delivId}/graph`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body'),

  getTask: (delivId, taskId) =>
    spec()
      .get(`/projects/ZAZZ/deliverables/${delivId}/tasks/${taskId}`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body'),

  getTasks: (delivId) =>
    spec()
      .get(`/projects/ZAZZ/deliverables/${delivId}/tasks`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body'),
};

/** Sort tasks by phaseStep for deterministic comparison */
function byPhaseTaskId(tasks) {
  return [...tasks].sort((a, b) => (a.phaseStep ?? '').localeCompare(b.phaseStep ?? ''));
}

// ── Test suite ─────────────────────────────────────────────────────────────
describe('Agent Workflow Simulation', () => {
  beforeEach(async () => {
    await clearTaskData();
    await resetProjectDefaults();
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe('Linear Pipeline — Phase 1 → Phase 2', () => {
    it('should simulate leader creating tasks and agents executing them sequentially', async () => {

      // ── LEADER: create deliverable ──────────────────────────────────────
      const deliverable = await h.createDeliverable('Auth Service Refactor');
      const dId = deliverable.id;

      // ── LEADER: create Phase 1 task ─────────────────────────────────────
      const task1 = await h.createTask(dId, {
        title: 'Set up project scaffold',
        phase: 1,
        prompt: 'Create the base project structure and config'
      });
      expect(task1.status).toBe('READY');
      expect(task1.phase).toBe(1);
      expect(task1.phaseStep).toBe('1.1');

      // ── WORKER AGENT: picks up 1.1, starts it ──────────────────────────
      const working = await h.setStatus(dId, task1.id, 'IN_PROGRESS');
      expect(working.status).toBe('IN_PROGRESS');

      // ── WORKER AGENT: logs progress in notes ───────────────────────────
      const noted = await h.appendNote(dId, task1.id, 'Scaffold created, dependencies installed', 'worker-agent-1');
      expect(noted.notes).toMatch(/\[.*\] \[worker-agent-1\]: Scaffold created/);

      // ── WORKER AGENT: hands off to QA ──────────────────────────────────
      await h.setStatus(dId, task1.id, 'QA');

      // ── QA AGENT: reviews, appends note, marks complete ────────────────
      await h.appendNote(dId, task1.id, 'Linting and structure checks passed', 'qa-agent-1');
      const done1 = await h.setStatus(dId, task1.id, 'COMPLETED');
      expect(done1.status).toBe('COMPLETED');

      // ── LEADER: Phase 1 complete — creates Phase 2 task with dep on 1.1 ─
      const task2 = await h.createTask(dId, {
        title: 'Implement auth middleware',
        phase: 2,
        dependencies: [task1.id],
        prompt: 'Build JWT auth middleware using scaffold from 1.1'
      });
      expect(task2.status).toBe('READY');   // born READY — dep already complete
      expect(task2.phaseStep).toBe('2.1');

      // ── WORKER AGENT: executes 2.1 ──────────────────────────────────────
      await h.setStatus(dId, task2.id, 'IN_PROGRESS');
      await h.appendNote(dId, task2.id, 'JWT middleware implemented and unit tested', 'worker-agent-1');
      const done2 = await h.setStatus(dId, task2.id, 'COMPLETED');
      expect(done2.status).toBe('COMPLETED');

      // ── VERIFY: final deliverable graph ────────────────────────────────
      const graph = await h.getGraph(dId);
      expect(graph.deliverableId).toBe(dId);
      expect(graph.projectCode).toBe('ZAZZ');
      expect(graph.tasks).toHaveLength(2);
      expect(graph.relations).toHaveLength(1);

      const g1 = graph.tasks.find(t => t.phaseStep === '1.1');
      const g2 = graph.tasks.find(t => t.phaseStep === '2.1');
      expect(g1.status).toBe('COMPLETED');
      expect(g2.status).toBe('COMPLETED');

      const rel = graph.relations[0];
      expect(rel.taskId).toBe(task2.id);          // 2.1 DEPENDS_ON 1.1
      expect(rel.relatedTaskId).toBe(task1.id);
      expect(rel.relationType).toBe('DEPENDS_ON');

      // ── VERIFY: full task list matches expected final state ─────────────
      const allTasks = byPhaseTaskId(await h.getTasks(dId));
      expect(allTasks).toHaveLength(2);
      expect(allTasks).toEqual([
        expect.objectContaining({ phaseStep: '1.1', phase: 1, status: 'COMPLETED', title: 'Set up project scaffold' }),
        expect.objectContaining({ phaseStep: '2.1', phase: 2, status: 'COMPLETED', title: 'Implement auth middleware' }),
      ]);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe('Parallel Convergence - two Phase 1 tasks merge into Phase 2 sync task', () => {
    it('should simulate parallel agents whose work converges into a single integration task', async () => {

      const deliverable = await h.createDeliverable('Data Pipeline MVP');
      const dId = deliverable.id;

      // ── LEADER: create two parallel Phase 1 tasks ───────────────────────
      const task1a = await h.createTask(dId, {
        title: 'Build data ingestion module',
        phase: 1,
        prompt: 'Implement CSV + JSON data ingestion pipeline'
      });
      const task1b = await h.createTask(dId, {
        title: 'Build data validation module',
        phase: 1,
        prompt: 'Implement schema validation and error reporting'
      });

      expect(task1a.status).toBe('READY');
      expect(task1a.phaseStep).toBe('1.1');
      expect(task1b.status).toBe('READY');
      expect(task1b.phaseStep).toBe('1.2');  // sequential IDs within same phase

      // ── WORKER AGENTS: execute 1.1 and 1.2 in parallel (simulated serially) ─
      await h.setStatus(dId, task1a.id, 'IN_PROGRESS');
      await h.appendNote(dId, task1a.id, 'Ingestion module complete, 3 formats supported', 'worker-agent-1');
      await h.setStatus(dId, task1a.id, 'COMPLETED');

      await h.setStatus(dId, task1b.id, 'IN_PROGRESS');
      await h.appendNote(dId, task1b.id, 'Validation rules implemented for all schema types', 'worker-agent-2');
      await h.setStatus(dId, task1b.id, 'COMPLETED');

      // ── LEADER: both Phase 1 tasks done — creates sync Phase 2 task ────
      const task2 = await h.createTask(dId, {
        title: 'Integrate ingestion + validation into pipeline runner',
        phase: 2,
        dependencies: [task1a.id, task1b.id],
        prompt: 'Wire ingestion and validation modules together in the pipeline runner'
      });
      expect(task2.status).toBe('READY');
      expect(task2.phaseStep).toBe('2.1');

      // ── WORKER AGENT: executes integration task ──────────────────────────
      await h.setStatus(dId, task2.id, 'IN_PROGRESS');
      await h.appendNote(dId, task2.id, 'Pipeline runner integrated, all tests passing', 'worker-agent-1');
      const done = await h.setStatus(dId, task2.id, 'COMPLETED');
      expect(done.status).toBe('COMPLETED');

      // ── VERIFY: graph has 3 tasks, 2 dep relations into the sync task ──
      const graph = await h.getGraph(dId);
      expect(graph.tasks).toHaveLength(3);
      expect(graph.relations).toHaveLength(2);
      expect(graph.tasks.every(t => t.status === 'COMPLETED')).toBe(true);

      // Both relations are dependencies INTO task2 (the sync point)
      expect(graph.relations.every(r => r.taskId === task2.id)).toBe(true);
      expect(graph.relations.every(r => r.relationType === 'DEPENDS_ON')).toBe(true);

      const depIds = graph.relations.map(r => r.relatedTaskId).sort();
      expect(depIds).toEqual([task1a.id, task1b.id].sort());

      // ── VERIFY: full task list matches expected final state ─────────────
      const allTasks = byPhaseTaskId(await h.getTasks(dId));
      expect(allTasks).toHaveLength(3);
      expect(allTasks).toEqual([
        expect.objectContaining({ phaseStep: '1.1', phase: 1, status: 'COMPLETED', title: 'Build data ingestion module' }),
        expect.objectContaining({ phaseStep: '1.2', phase: 1, status: 'COMPLETED', title: 'Build data validation module' }),
        expect.objectContaining({ phaseStep: '2.1', phase: 2, status: 'COMPLETED', title: 'Integrate ingestion + validation into pipeline runner' }),
      ]);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe('Notes audit trail', () => {
    it('should build a timestamped multi-agent log across multiple note appends', async () => {
      const deliverable = await h.createDeliverable('Audit Trail Test');
      const dId = deliverable.id;
      const task = await h.createTask(dId, { title: 'Task with multi-agent notes', phase: 1 });

      await h.appendNote(dId, task.id, 'Starting analysis of requirements', 'leader-agent');
      await h.appendNote(dId, task.id, 'Analysis complete, 3 edge cases found', 'worker-agent-1');
      const final = await h.appendNote(dId, task.id, 'All edge cases resolved and tested', 'worker-agent-1');

      const lines = final.notes.split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toMatch(/^\[.+\] \[leader-agent\]: Starting analysis/);
      expect(lines[1]).toMatch(/^\[.+\] \[worker-agent-1\]: Analysis complete/);
      expect(lines[2]).toMatch(/^\[.+\] \[worker-agent-1\]: All edge cases resolved/);

      // Each line has a valid ISO timestamp prefix
      for (const line of lines) {
        expect(line).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe('Deliverable graph isolation', () => {
    it('should only return tasks and relations scoped to the requested deliverable', async () => {
      const deliv1 = await h.createDeliverable('Deliverable Alpha');
      const deliv2 = await h.createDeliverable('Deliverable Beta');

      const taskAlpha = await h.createTask(deliv1.id, { title: 'Alpha task 1.1', phase: 1 });
      const taskBeta  = await h.createTask(deliv2.id, { title: 'Beta task 1.1',  phase: 1 });

      const graph1 = await h.getGraph(deliv1.id);
      expect(graph1.tasks).toHaveLength(1);
      expect(graph1.tasks[0].id).toBe(taskAlpha.id);
      expect(graph1.relations).toHaveLength(0);

      const graph2 = await h.getGraph(deliv2.id);
      expect(graph2.tasks).toHaveLength(1);
      expect(graph2.tasks[0].id).toBe(taskBeta.id);
    });

    it('should exclude cross-deliverable relations from the graph', async () => {
      const deliv1 = await h.createDeliverable('Service A');
      const deliv2 = await h.createDeliverable('Service B');

      // Create tasks in each deliverable
      const taskA = await h.createTask(deliv1.id, { title: 'Service A task', phase: 1 });
      // Task B was created depending on taskA (cross-deliverable dep recorded via relation)
      const taskB = await h.createTask(deliv2.id, {
        title: 'Service B task',
        phase: 1,
        dependencies: [taskA.id]  // cross-deliverable dependency
      });

      // Deliverable 2's graph should include taskB but NOT the cross-deliv relation
      const graph2 = await h.getGraph(deliv2.id);
      expect(graph2.tasks).toHaveLength(1);
      expect(graph2.tasks[0].id).toBe(taskB.id);
      expect(graph2.relations).toHaveLength(0);  // taskA is outside deliverable 2
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe('Task cancellation', () => {
    it('should cancel a task, set status to COMPLETED, and make it immutable', async () => {
      const deliverable = await h.createDeliverable('Cancellation Test');
      const dId = deliverable.id;

      const task = await h.createTask(dId, { title: 'Task to cancel', phase: 1 });
      expect(task.status).toBe('READY');
      expect(task.isCancelled).toBe(false);

      // Leader cancels the task
      const cancelled = await spec()
        .patch(`/projects/ZAZZ/deliverables/${dId}/tasks/${task.id}/cancel`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200)
        .returns('res.body');

      expect(cancelled.isCancelled).toBe(true);
      expect(cancelled.status).toBe('COMPLETED');  // forced

      // Cannot change status of a cancelled task
      await spec()
        .patch(`/projects/ZAZZ/deliverables/${dId}/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'IN_PROGRESS' })
        .expectStatus(409);

      // Cannot cancel again
      await spec()
        .patch(`/projects/ZAZZ/deliverables/${dId}/tasks/${task.id}/cancel`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(409);

      // Final state: still COMPLETED + cancelled
      const allTasks = await h.getTasks(dId);
      expect(allTasks).toHaveLength(1);
      expect(allTasks[0]).toMatchObject({ isCancelled: true, status: 'COMPLETED' });
    });

    it('should allow the next task to be created after a cancelled predecessor', async () => {
      const deliverable = await h.createDeliverable('Post-Cancel Pipeline');
      const dId = deliverable.id;

      // Phase 1: create and immediately cancel a task
      const task1 = await h.createTask(dId, { title: 'Cancelled approach', phase: 1 });
      await spec()
        .patch(`/projects/ZAZZ/deliverables/${dId}/tasks/${task1.id}/cancel`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200);

      // Leader pivots: creates Phase 2 task depending on the cancelled one
      // (cancelled = COMPLETED, so the dep is considered satisfied)
      const task2 = await h.createTask(dId, {
        title: 'Alternative approach',
        phase: 2,
        dependencies: [task1.id]
      });
      expect(task2.status).toBe('READY');
      expect(task2.phaseStep).toBe('2.1');

      // Final state
      const allTasks = byPhaseTaskId(await h.getTasks(dId));
      expect(allTasks).toEqual([
        expect.objectContaining({ phaseStep: '1.1', status: 'COMPLETED', isCancelled: true }),
        expect.objectContaining({ phaseStep: '2.1', status: 'READY',     isCancelled: false }),
      ]);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe('Diamond dependency — sequential then parallel then convergence', () => {
    it('should enforce correct status progression through a diamond-shaped dependency graph', async () => {

      const deliverable = await h.createDeliverable('Diamond Pipeline');
      const dId = deliverable.id;

      // ── Phase 1: single prerequisite task ──────────────────────────────
      const t1 = await h.createTask(dId, {
        title: 'Design database schema',
        phase: 1,
        agentName: 'schema-agent',
        prompt: 'Define all tables and FK constraints'
      });
      expect(t1.status).toBe('READY');
      expect(t1.phaseStep).toBe('1.1');

      // schema-agent works it
      await h.setStatus(dId, t1.id, 'IN_PROGRESS');
      await h.appendNote(dId, t1.id, 'Schema drafted — 4 tables, 2 junction tables', 'schema-agent');
      await h.setStatus(dId, t1.id, 'QA');
      await h.appendNote(dId, t1.id, 'Schema reviewed and approved', 'qa-agent');
      const done1 = await h.setStatus(dId, t1.id, 'COMPLETED');
      expect(done1.status).toBe('COMPLETED');

      // ── Phase 2: single task that unblocks both parallel branches ───────
      const t2 = await h.createTask(dId, {
        title: 'Implement API endpoints',
        phase: 2,
        agentName: 'api-agent',
        dependencies: [t1.id],
        prompt: 'Build CRUD endpoints for deliverables'
      });
      expect(t2.status).toBe('READY');       // t1 is COMPLETED so dep is satisfied
      expect(t2.phaseStep).toBe('2.1');

      await h.setStatus(dId, t2.id, 'IN_PROGRESS');
      await h.appendNote(dId, t2.id, 'All 8 endpoints implemented', 'api-agent');
      await h.setStatus(dId, t2.id, 'QA');
      const done2 = await h.setStatus(dId, t2.id, 'COMPLETED');
      expect(done2.status).toBe('COMPLETED');

      // ── Phase 3: two parallel tasks, both depend on t2 ─────────────────
      const t3 = await h.createTask(dId, {
        title: 'Write unit tests',
        phase: 3,
        agentName: 'test-agent',
        dependencies: [t2.id],
        prompt: 'Cover all API endpoints with Vitest'
      });
      const t4 = await h.createTask(dId, {
        title: 'Build UI components',
        phase: 3,
        agentName: 'ui-agent',
        dependencies: [t2.id],
        prompt: 'React components for deliverable list and graph filter'
      });
      expect(t3.status).toBe('READY');
      expect(t3.phaseStep).toBe('3.1');
      expect(t4.status).toBe('READY');
      expect(t4.phaseStep).toBe('3.2');

      // test-agent and ui-agent work in parallel (simulated serially)
      await h.setStatus(dId, t3.id, 'IN_PROGRESS');
      await h.setStatus(dId, t4.id, 'IN_PROGRESS');

      await h.appendNote(dId, t3.id, '47 tests passing, 100% endpoint coverage', 'test-agent');
      await h.appendNote(dId, t4.id, 'Deliverable list and graph filter components complete', 'ui-agent');

      const done3 = await h.setStatus(dId, t3.id, 'COMPLETED');
      const done4 = await h.setStatus(dId, t4.id, 'COMPLETED');
      expect(done3.status).toBe('COMPLETED');
      expect(done4.status).toBe('COMPLETED');

      // ── Phase 4: convergence task — depends on BOTH parallel branches ───
      const t5 = await h.createTask(dId, {
        title: 'Integration testing',
        phase: 4,
        agentName: 'qa-agent',
        dependencies: [t3.id, t4.id],
        prompt: 'End-to-end tests across API and UI'
      });
      expect(t5.status).toBe('READY');       // both t3 and t4 COMPLETED
      expect(t5.phaseStep).toBe('4.1');

      await h.setStatus(dId, t5.id, 'IN_PROGRESS');
      await h.appendNote(dId, t5.id, 'All integration tests passing — 12/12', 'qa-agent');
      const done5 = await h.setStatus(dId, t5.id, 'COMPLETED');
      expect(done5.status).toBe('COMPLETED');

      // ── VERIFY: graph structure ─────────────────────────────────────────
      const graph = await h.getGraph(dId);
      expect(graph.tasks).toHaveLength(5);
      expect(graph.tasks.every(t => t.status === 'COMPLETED')).toBe(true);

      // 4 relations: t2→t1, t3→t2, t4→t2, t5→t3, t5→t4
      expect(graph.relations).toHaveLength(5);
      expect(graph.relations.every(r => r.relationType === 'DEPENDS_ON')).toBe(true);

      // t5 has 2 incoming deps (both parallel branches converge)
      const t5Deps = graph.relations.filter(r => r.taskId === t5.id);
      expect(t5Deps).toHaveLength(2);
      expect(t5Deps.map(r => r.relatedTaskId).sort()).toEqual([t3.id, t4.id].sort());

      // t3 and t4 each depend only on t2
      const t3Deps = graph.relations.filter(r => r.taskId === t3.id);
      const t4Deps = graph.relations.filter(r => r.taskId === t4.id);
      expect(t3Deps).toHaveLength(1);
      expect(t3Deps[0].relatedTaskId).toBe(t2.id);
      expect(t4Deps).toHaveLength(1);
      expect(t4Deps[0].relatedTaskId).toBe(t2.id);

      // ── VERIFY: final task list ─────────────────────────────────────────
      const allTasks = byPhaseTaskId(await h.getTasks(dId));
      expect(allTasks).toHaveLength(5);
      expect(allTasks).toEqual([
        expect.objectContaining({ phaseStep: '1.1', phase: 1, status: 'COMPLETED', title: 'Design database schema' }),
        expect.objectContaining({ phaseStep: '2.1', phase: 2, status: 'COMPLETED', title: 'Implement API endpoints' }),
        expect.objectContaining({ phaseStep: '3.1', phase: 3, status: 'COMPLETED', title: 'Write unit tests' }),
        expect.objectContaining({ phaseStep: '3.2', phase: 3, status: 'COMPLETED', title: 'Build UI components' }),
        expect.objectContaining({ phaseStep: '4.1', phase: 4, status: 'COMPLETED', title: 'Integration testing' }),
      ]);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe('Authentication and error cases', () => {
    it('should return 401 for unauthenticated task creation', async () => {
      const deliverable = await h.createDeliverable('Auth Test');
      await spec()
        .post(`/projects/ZAZZ/deliverables/${deliverable.id}/tasks`)
        .withJson({ title: 'Should fail' })
        .expectStatus(401);
    });

    it('should return 404 when creating task for non-existent project', async () => {
      await spec()
        .post('/projects/NOPE/deliverables/999/tasks')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ title: 'Ghost task' })
        .expectStatus(404);
    });

    it('should return 404 when appending note to non-existent task', async () => {
      const deliverable = await h.createDeliverable('Note Error Test');
      await spec()
        .patch(`/projects/ZAZZ/deliverables/${deliverable.id}/tasks/999999/notes`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ note: 'This task does not exist' })
        .expectStatus(404);
    });

    it('should return 404 for graph of deliverable not in project', async () => {
      await spec()
        .get('/projects/ZAZZ/deliverables/999999/graph')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(404);
    });
  });
});
