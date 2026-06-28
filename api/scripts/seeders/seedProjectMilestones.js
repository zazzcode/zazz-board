import { db } from '../../lib/db/index.js';
import {
  DELIVERABLES,
  DELIVERABLE_RELATIONS,
  MILESTONES,
  PROJECTS,
  PROJECT_GANTT_SETTINGS,
} from '../../lib/db/schema.js';
import { eq, sql } from 'drizzle-orm';

const DEFAULT_START_DATE = '2026-06-01';
const DEFAULT_END_DATE = '2026-08-14';

const ZAZZ_MILESTONES = [
  { key: 'm1', start_date: '2026-06-15', end_date: '2026-07-03', status: 'IN_PROGRESS' },
  { key: 'm2', start_date: '2026-07-06', end_date: '2026-07-31', status: 'PENDING' },
  { key: 'm3', start_date: '2026-08-03', end_date: '2026-08-28', status: 'PENDING' },
];

const ZAZZ_DELIVERABLE_SCHEDULES = {
  'ZAZZ-1': {
    milestoneKey: 'm1',
    planned_start_at: '2026-06-15T00:00:00.000Z',
    planned_completion_at: '2026-06-26T00:00:00.000Z',
    position: 10,
  },
  'ZAZZ-3': {
    milestoneKey: 'm2',
    planned_start_at: '2026-07-06T00:00:00.000Z',
    planned_completion_at: '2026-07-17T00:00:00.000Z',
    actual_start_at: '2026-07-06T00:00:00.000Z',
    actual_completion_at: '2026-07-15T00:00:00.000Z',
    position: 10,
  },
  'ZAZZ-5': {
    milestoneKey: 'm3',
    planned_start_at: '2026-08-03T00:00:00.000Z',
    planned_completion_at: '2026-08-14T00:00:00.000Z',
    position: 10,
  },
  'ZAZZ-6': {
    milestoneKey: 'default',
    planned_start_at: '2026-06-03T00:00:00.000Z',
    planned_completion_at: '2026-06-12T00:00:00.000Z',
    actual_start_at: '2026-06-03T00:00:00.000Z',
    position: 10,
  },
};

function toDate(value) {
  return new Date(value);
}

async function seedDefaultMilestone(project) {
  const [milestone] = await db.insert(MILESTONES).values({
    project_id: project.id,
    start_date: DEFAULT_START_DATE,
    end_date: DEFAULT_END_DATE,
    is_default: true,
    status: 'IN_PROGRESS',
    created_by: project.created_by,
    updated_by: project.updated_by,
  }).returning();

  return milestone;
}

async function seedProjectSettings(project) {
  await db.insert(PROJECT_GANTT_SETTINGS).values({
    project_id: project.id,
    timeline_mode: 'sprint',
    show_date_labels: false,
    show_default_milestone: false,
    period_start_date: DEFAULT_START_DATE,
    sprint_length_weeks: 2,
    period_number_start: 1,
    sprint_label_prefix: 'Sprint',
    week_label_prefix: 'W',
    created_by: project.created_by,
    updated_by: project.updated_by,
  });
}

async function seedZazzPlannedMilestones(project) {
  const milestonesByKey = {};

  for (const milestone of ZAZZ_MILESTONES) {
    const [row] = await db.insert(MILESTONES).values({
      project_id: project.id,
      start_date: milestone.start_date,
      end_date: milestone.end_date,
      is_default: false,
      status: milestone.status,
      created_by: project.created_by,
      updated_by: project.updated_by,
    }).returning();
    milestonesByKey[milestone.key] = row;
  }

  return milestonesByKey;
}

async function assignZazzDeliverables(defaultMilestone, plannedMilestones) {
  const deliverables = await db.select().from(DELIVERABLES).where(eq(DELIVERABLES.project_id, defaultMilestone.project_id));

  for (const deliverable of deliverables) {
    const schedule = ZAZZ_DELIVERABLE_SCHEDULES[deliverable.code] || {};
    const milestone = schedule.milestoneKey && schedule.milestoneKey !== 'default'
      ? plannedMilestones[schedule.milestoneKey]
      : defaultMilestone;

    await db.update(DELIVERABLES)
      .set({
        milestone_id: milestone.id,
        milestone_position: schedule.position || deliverable.position,
        planned_start_at: schedule.planned_start_at ? toDate(schedule.planned_start_at) : toDate('2026-06-03T00:00:00.000Z'),
        planned_completion_at: schedule.planned_completion_at ? toDate(schedule.planned_completion_at) : toDate('2026-06-14T00:00:00.000Z'),
        actual_start_at: schedule.actual_start_at ? toDate(schedule.actual_start_at) : null,
        actual_completion_at: schedule.actual_completion_at ? toDate(schedule.actual_completion_at) : null,
        updated_at: new Date(),
      })
      .where(eq(DELIVERABLES.id, deliverable.id));
  }
}

async function assignDefaultDeliverables(projectId, defaultMilestoneId) {
  await db.update(DELIVERABLES)
    .set({
      milestone_id: defaultMilestoneId,
      planned_start_at: sql`COALESCE(${DELIVERABLES.planned_start_at}, ${DELIVERABLES.created_at})`,
      planned_completion_at: sql`COALESCE(${DELIVERABLES.planned_completion_at}, ${DELIVERABLES.created_at} + interval '14 days')`,
      updated_at: new Date(),
    })
    .where(eq(DELIVERABLES.project_id, projectId));
}

async function seedZazzDeliverableRelations() {
  const deliverables = await db.select().from(DELIVERABLES).where(eq(DELIVERABLES.project_code, 'ZAZZ'));
  const byCode = Object.fromEntries(deliverables.map((deliverable) => [deliverable.code, deliverable]));
  const relations = [
    ['ZAZZ-3', 'ZAZZ-1'],
    ['ZAZZ-5', 'ZAZZ-3'],
    ['ZAZZ-6', 'ZAZZ-5'],
  ].filter(([deliverableCode, relatedCode]) => byCode[deliverableCode] && byCode[relatedCode]);

  if (!relations.length) return 0;

  await db.insert(DELIVERABLE_RELATIONS).values(relations.map(([deliverableCode, relatedCode]) => ({
    deliverable_id: byCode[deliverableCode].id,
    related_deliverable_id: byCode[relatedCode].id,
    relation_type: 'DEPENDS_ON',
    created_by: byCode[deliverableCode].created_by,
    updated_by: byCode[deliverableCode].updated_by,
  })));

  return relations.length;
}

export async function seedProjectMilestones() {
  const projects = await db.select().from(PROJECTS);
  let milestoneCount = 0;
  let settingsCount = 0;

  for (const project of projects) {
    const defaultMilestone = await seedDefaultMilestone(project);
    milestoneCount += 1;
    await seedProjectSettings(project);
    settingsCount += 1;

    if (project.code === 'ZAZZ') {
      const plannedMilestones = await seedZazzPlannedMilestones(project);
      milestoneCount += Object.keys(plannedMilestones).length;
      await assignZazzDeliverables(defaultMilestone, plannedMilestones);
    } else {
      await assignDefaultDeliverables(project.id, defaultMilestone.id);
    }
  }

  const relationCount = await seedZazzDeliverableRelations();
  return {
    milestones: milestoneCount,
    project_gantt_settings: settingsCount,
    deliverable_relations: relationCount,
  };
}
