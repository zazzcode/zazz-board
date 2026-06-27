import * as pactum from 'pactum';

const { spec } = pactum;
const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

describe('Gantt mock routes', () => {
  it('returns the project-level milestone and deliverable projection for a known project', async () => {
    const gantt = await spec()
      .get('/projects/ZAZZ/gantt')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(gantt.projectCode).toBe('ZAZZ');
    expect(gantt.timeline).toEqual(
      expect.objectContaining({
        unit: 'sprint',
        sprintStartDate: '2026-06-01',
        sprintLengthWeeks: 2,
        showDefaultMilestone: false,
      })
    );
    expect(gantt.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'milestone:default',
          entityType: 'milestone',
          labelKey: 'gantt.defaultMilestone',
          isDefault: true,
        }),
        expect.objectContaining({
          id: 'milestone:one',
          labelKey: 'gantt.numberedMilestone',
          labelParams: { number: 1 },
        }),
        expect.objectContaining({
          id: 'milestone:two',
          labelParams: { number: 2 },
        }),
        expect.objectContaining({
          id: 'milestone:three',
          labelParams: { number: 3 },
        }),
        expect.objectContaining({
          id: 'milestone:four',
          labelParams: { number: 4 },
        }),
        expect.objectContaining({
          id: 'milestone:five',
          labelParams: { number: 5 },
        }),
        expect.objectContaining({
          id: 'milestone:six',
          labelParams: { number: 6 },
        }),
        expect.objectContaining({
          id: 'deliverable:default-docs',
          parentId: 'milestone:default',
        }),
        expect.objectContaining({
          id: 'deliverable:m1-d1',
          parentId: 'milestone:one',
          completed: true,
        }),
        expect.objectContaining({
          id: 'deliverable:m6-export',
          parentId: 'milestone:six',
        }),
      ])
    );
    expect(gantt.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'link:m1-d1-to-m1-d2',
          sourceId: 'deliverable:m1-d1',
          targetId: 'deliverable:m1-d2',
          type: 'e2s',
        }),
      ])
    );
  });

  it('returns task rows for an expanded deliverable', async () => {
    const tasks = await spec()
      .get('/projects/ZAZZ/gantt/deliverables/m1-d1/tasks')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(tasks.projectCode).toBe('ZAZZ');
    expect(tasks.deliverableId).toBe('m1-d1');
    expect(tasks.rows.length).toBeGreaterThanOrEqual(2);
    expect(tasks.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'task:gantt-contract',
          parentId: 'deliverable:m1-d1',
          entityType: 'task',
          completed: true,
        }),
      ])
    );
    expect(tasks.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: 'task:gantt-contract',
          targetId: 'task:gantt-widget',
          type: 'e2s',
        }),
      ])
    );
  });

  it('returns task rows for at least two deliverables', async () => {
    const first = await spec()
      .get('/projects/ZAZZ/gantt/deliverables/default-docs/tasks')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');
    const second = await spec()
      .get('/projects/ZAZZ/gantt/deliverables/m1-d1/tasks')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(first.rows.length).toBeGreaterThan(0);
    expect(second.rows.length).toBeGreaterThan(0);
  });

  it('returns and updates mocked project Gantt settings', async () => {
    const settings = await spec()
      .get('/projects/ZAZZ/gantt/settings')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(settings).toEqual(
      expect.objectContaining({
        projectCode: 'ZAZZ',
        timelineMode: 'sprint',
        showDefaultMilestone: false,
        periodStartDate: '2026-06-01',
        sprintLengthWeeks: 2,
        periodNumberStart: 1,
      })
    );

    const updated = await spec()
      .put('/projects/ZAZZ/gantt/settings')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
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
      .returns('res.body');

    expect(updated).toEqual(
      expect.objectContaining({
        projectCode: 'ZAZZ',
        timelineMode: 'weeks',
        showDateLabels: true,
        showDefaultMilestone: true,
        periodStartDate: '2026-06-08',
        sprintLengthWeeks: 3,
        periodNumberStart: 4,
        sprintLabelPrefix: 'Iteration',
        weekLabelPrefix: 'PW',
      })
    );

    const gantt = await spec()
      .get('/projects/ZAZZ/gantt')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(gantt.timeline).toEqual(
      expect.objectContaining({
        unit: 'week',
        showDateLabels: true,
        showDefaultMilestone: true,
        periodStartDate: '2026-06-08',
        sprintLengthWeeks: 3,
        periodNumberStart: 4,
      })
    );
  });

  it('returns 404 for unknown project and unknown deliverable mocks', async () => {
    await spec()
      .get('/projects/NOPE/gantt')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(404);

    await spec()
      .get('/projects/ZAZZ/gantt/deliverables/not-real/tasks')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(404);

    await spec()
      .get('/projects/NOPE/gantt/settings')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(404);
  });
});
