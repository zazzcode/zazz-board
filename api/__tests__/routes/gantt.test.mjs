import * as pactum from 'pactum';
import { clearTaskData, createTestDeliverable, createTestTask, resetProjectDefaults } from '../helpers/testDatabase.js';

const { spec } = pactum;
const TEST_TOKEN = '550e8400-e29b-41d4-a716-446655440000';
const NON_LEADER_TOKEN = '18b3759f-bb53-430c-bbf3-514e8004b769';

describe('Seeded project Gantt data', () => {
  it('seeds rich ZAZZ milestone data without dropping existing records', async () => {
    const gantt = await spec()
      .get('/projects/ZAZZ/gantt')
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    const milestones = gantt.rows.filter((row) => row.entityType === 'milestone');
    const deliverables = gantt.rows.filter((row) => row.entityType === 'deliverable');

    expect(milestones.filter((row) => row.isDefault)).toHaveLength(1);
    expect(milestones.filter((row) => !row.isDefault).length).toBeGreaterThanOrEqual(3);
    expect(deliverables.map((row) => row.deliverableCode)).toEqual(
      expect.arrayContaining(['ZAZZ-1', 'ZAZZ-3', 'ZAZZ-5', 'ZAZZ-6'])
    );
    expect(gantt.links.length).toBeGreaterThanOrEqual(3);
    expect(gantt.timeline).toEqual(
      expect.objectContaining({
        unit: 'sprint',
        showDefaultMilestone: false,
        sprintStartDate: '2026-06-01',
        sprintLengthWeeks: 2,
      })
    );
  });
});

describe('Project Gantt API', () => {
  beforeEach(async () => {
    await clearTaskData();
    await resetProjectDefaults();
  });

  it('returns a project Gantt hierarchy with the default milestone', async () => {
    const deliverable = await createTestDeliverable(1, {
      name: 'DB Gantt',
      code: 'ZAZZ-GANTT-RED',
    });

    const gantt = await spec()
      .get('/projects/ZAZZ/gantt')
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .expectStatus(200)
      .expectJsonLike({
        projectCode: 'ZAZZ',
        rows: [{ entityType: 'milestone', isDefault: true }],
      })
      .returns('res.body');

    expect(gantt.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: 'deliverable',
          deliverableId: String(deliverable.id),
          deliverableCode: 'ZAZZ-GANTT-RED',
          parentId: expect.stringMatching(/^milestone:/),
        }),
      ])
    );
  });

  it('preserves D1 fields while returning D2 production metadata', async () => {
    const deliverable = await createTestDeliverable(1, {
      name: 'Gantt Fields',
      code: 'ZAZZ-GANTT-FIELDS',
      status: 'IN_PROGRESS',
      plannedStartAt: new Date('2026-06-10T00:00:00.000Z'),
      plannedCompletionAt: new Date('2026-06-21T00:00:00.000Z'),
      actualStartAt: new Date('2026-06-11T00:00:00.000Z'),
    });
    await createTestTask(1, { deliverableId: deliverable.id, title: 'Done task', status: 'COMPLETED' });
    await createTestTask(1, { deliverableId: deliverable.id, title: 'Blocked task', status: 'READY', isBlocked: true });

    const gantt = await spec()
      .get('/projects/ZAZZ/gantt')
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    const row = gantt.rows.find((item) => item.deliverableCode === 'ZAZZ-GANTT-FIELDS');
    expect(gantt).toEqual(
      expect.objectContaining({
        projectCode: 'ZAZZ',
        projectName: 'Zazz Board',
        version: expect.any(String),
        updatedAt: expect.any(String),
        range: expect.objectContaining({ startDate: expect.any(String), endDate: expect.any(String) }),
        timeline: expect.objectContaining({ unit: 'sprint', periodStartDate: '2026-06-01' }),
        links: expect.any(Array),
      })
    );
    expect(row).toEqual(
      expect.objectContaining({
        id: `deliverable:${deliverable.id}`,
        entityType: 'deliverable',
        parentId: expect.stringMatching(/^milestone:/),
        deliverableId: String(deliverable.id),
        deliverableCode: 'ZAZZ-GANTT-FIELDS',
        displayName: 'Gantt Fields',
        startDate: '2026-06-10',
        endDate: '2026-06-21',
        plannedStartAt: '2026-06-10T00:00:00.000Z',
        plannedCompletionAt: '2026-06-21T00:00:00.000Z',
        actualStartAt: '2026-06-11T00:00:00.000Z',
        status: 'IN_PROGRESS',
        statusCategory: 'BLOCKED',
        completed: false,
        blocked: true,
        taskCount: 2,
        completedTaskCount: 1,
        blockedTaskCount: 1,
        taskStatusCounts: { COMPLETED: 1, READY: 1 },
        lazyTasks: false,
      })
    );
  });

  it('returns and updates project Gantt settings', async () => {
    await spec()
      .get('/projects/ZAZZ/gantt/settings')
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .expectStatus(200)
      .expectJsonLike({
        projectCode: 'ZAZZ',
        timelineMode: 'sprint',
        showDefaultMilestone: false,
      });

    await spec()
      .put('/projects/ZAZZ/gantt/settings')
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .withJson({
        timelineMode: 'weeks',
        showDateLabels: true,
        showDefaultMilestone: true,
        periodStartDate: '2026-06-08',
        sprintLengthWeeks: 3,
        periodNumberStart: 4,
        sprintLabelPrefix: 'Iteration',
        weekLabelPrefix: 'PW',
      })
      .expectStatus(200)
      .expectJsonLike({
        timelineMode: 'weeks',
        showDateLabels: true,
        showDefaultMilestone: true,
      });

    await spec()
      .get('/projects/ZAZZ/gantt')
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .expectStatus(200)
      .expectJsonLike({
        timeline: {
          unit: 'week',
          showDateLabels: true,
          showDefaultMilestone: true,
          periodStartDate: '2026-06-08',
          periodNumberStart: 4,
          sprintLengthWeeks: 3,
        },
      });

    await spec()
      .put('/projects/ZAZZ/gantt/settings')
      .withHeaders('TB_TOKEN', NON_LEADER_TOKEN)
      .withJson({
        timelineMode: 'dates',
        showDateLabels: false,
        showDefaultMilestone: false,
        periodStartDate: '2026-07-01',
        sprintLengthWeeks: 2,
        periodNumberStart: 1,
        sprintLabelPrefix: 'Sprint',
        weekLabelPrefix: 'W',
      })
      .expectStatus(403);

    await spec()
      .get('/projects/ZAZZ/gantt/settings')
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .expectStatus(200)
      .expectJsonLike({
        timelineMode: 'weeks',
        showDefaultMilestone: true,
        periodStartDate: '2026-06-08',
      });

    await spec()
      .put('/projects/ZAZZ/gantt/settings')
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .withJson({
        timelineMode: 'sprint',
        showDateLabels: false,
        showDefaultMilestone: false,
        periodStartDate: '2026-06-01',
        sprintLengthWeeks: 0,
        periodNumberStart: 1,
        sprintLabelPrefix: 'Sprint',
        weekLabelPrefix: 'W',
      })
      .expectStatus(400);
  });

  it('creates updates lists and deletes empty planned milestones', async () => {
    const created = await spec()
      .post('/projects/ZAZZ/milestones')
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .withJson({ startDate: '2026-09-01', endDate: '2026-09-15', status: 'PLANNING' })
      .expectStatus(201)
      .returns('res.body');

    expect(created).toEqual(
      expect.objectContaining({
        isDefault: false,
        labelKey: 'gantt.numberedMilestone',
        status: 'PLANNING',
      })
    );

    await spec()
      .put(`/projects/ZAZZ/milestones/${created.id}`)
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .withJson({ startDate: '2026-09-02', endDate: '2026-09-16', status: 'PENDING' })
      .expectStatus(200)
      .expectJsonLike({ id: created.id, startDate: '2026-09-02', status: 'PENDING' });

    const milestones = await spec()
      .get('/projects/ZAZZ/milestones')
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .expectStatus(200)
      .returns('res.body');
    const defaultMilestone = milestones.find((milestone) => milestone.isDefault);

    await spec()
      .delete(`/projects/ZAZZ/milestones/${defaultMilestone.id}`)
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .expectStatus(400);

    await spec()
      .delete(`/projects/ZAZZ/milestones/${created.id}`)
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .expectStatus(200);
  });

  it('moves a deliverable between milestones within the same project', async () => {
    const deliverable = await createTestDeliverable(1, { name: 'Move Me', code: 'ZAZZ-MOVE' });
    const milestone = await spec()
      .post('/projects/ZAZZ/milestones')
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .withJson({ startDate: '2026-09-01', endDate: '2026-09-15' })
      .expectStatus(201)
      .returns('res.body');

    const projection = await spec()
      .patch(`/projects/ZAZZ/gantt/deliverables/${deliverable.id}/milestone`)
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .withJson({ milestoneId: milestone.id })
      .expectStatus(200)
      .returns('res.body');

    const row = projection.rows.find((item) => item.deliverableCode === 'ZAZZ-MOVE');
    expect(row.parentId).toBe(`milestone:${milestone.id}`);

    const otherProjectMilestones = await spec()
      .get('/projects/ZED_MER/milestones')
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    await spec()
      .patch(`/projects/ZAZZ/gantt/deliverables/${deliverable.id}/milestone`)
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .withJson({ milestoneId: otherProjectMilestones[0].id })
      .expectStatus(404);
  });

  it('replaces milestone deliverable list and preserves order', async () => {
    const first = await createTestDeliverable(1, { name: 'First', code: 'ZAZZ-ORDER-A' });
    const second = await createTestDeliverable(1, { name: 'Second', code: 'ZAZZ-ORDER-B' });
    const milestone = await spec()
      .post('/projects/ZAZZ/milestones')
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .withJson({ startDate: '2026-09-01', endDate: '2026-09-15' })
      .expectStatus(201)
      .returns('res.body');
    const current = await spec()
      .get('/projects/ZAZZ/gantt')
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    const projection = await spec()
      .put(`/projects/ZAZZ/milestones/${milestone.id}/deliverables`)
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .withJson({ deliverableIds: [second.id, first.id], expectedVersion: current.version })
      .expectStatus(200)
      .returns('res.body');

    const milestoneChildren = projection.rows.filter((row) => row.parentId === `milestone:${milestone.id}`);
    expect(milestoneChildren.map((row) => row.deliverableCode)).toEqual(['ZAZZ-ORDER-B', 'ZAZZ-ORDER-A']);

    const updated = await spec()
      .put(`/projects/ZAZZ/milestones/${milestone.id}/deliverables`)
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .withJson({ deliverableIds: [first.id] })
      .expectStatus(200)
      .returns('res.body');
    const secondRow = updated.rows.find((row) => row.deliverableCode === 'ZAZZ-ORDER-B');
    const defaultRow = updated.rows.find((row) => row.entityType === 'milestone' && row.isDefault);
    expect(secondRow.parentId).toBe(defaultRow.id);

    await spec()
      .put(`/projects/ZAZZ/milestones/${milestone.id}/deliverables`)
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .withJson({ deliverableIds: [first.id, first.id] })
      .expectStatus(400);
  });

  it('rejects pulling deliverables directly from another planned milestone', async () => {
    const deliverable = await createTestDeliverable(1, { name: 'No Pull', code: 'ZAZZ-NOPULL' });
    const firstMilestone = await spec()
      .post('/projects/ZAZZ/milestones')
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .withJson({ startDate: '2026-09-01', endDate: '2026-09-15' })
      .expectStatus(201)
      .returns('res.body');
    const secondMilestone = await spec()
      .post('/projects/ZAZZ/milestones')
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .withJson({ startDate: '2026-10-01', endDate: '2026-10-15' })
      .expectStatus(201)
      .returns('res.body');

    await spec()
      .put(`/projects/ZAZZ/milestones/${firstMilestone.id}/deliverables`)
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .withJson({ deliverableIds: [deliverable.id] })
      .expectStatus(200);

    await spec()
      .put(`/projects/ZAZZ/milestones/${secondMilestone.id}/deliverables`)
      .withHeaders('TB_TOKEN', TEST_TOKEN)
      .withJson({ deliverableIds: [deliverable.id] })
      .expectStatus(400);
  });
});
