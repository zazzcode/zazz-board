import { db } from '../../lib/db/index.js';
import {
  DELIVERABLES,
  DELIVERABLE_RELATIONS,
  MILESTONES,
  PROJECTS,
  PROJECT_GANTT_SETTINGS,
  TASKS,
} from '../../lib/db/schema.js';
import { asc, eq, sql } from 'drizzle-orm';

const DEFAULT_START_DATE = '2026-02-02';
const DEFAULT_END_DATE = '2026-04-03';
const DAY_MS = 24 * 60 * 60 * 1000;
const ZAZZ_MILESTONES = [
  { key: 'm1', start_date: '2026-02-02', end_date: '2026-02-13', status: 'IN_PROGRESS' },
  { key: 'm2', start_date: '2026-03-02', end_date: '2026-03-20', status: 'IN_PROGRESS' },
  { key: 'm3', start_date: '2026-03-23', end_date: '2026-04-03', status: 'IN_PROGRESS' },
];

const ZAZZ_DELIVERABLE_SCHEDULES = {
  'ZAZZ-1': {
    milestoneKey: 'm2',
    planned_start_at: '2026-03-02T00:00:00.000Z',
    planned_completion_at: '2026-03-06T00:00:00.000Z',
    actual_start_at: '2026-03-02T00:00:00.000Z',
    actual_completion_at: '2026-03-06T00:00:00.000Z',
    position: 10,
  },
  'ZAZZ-3': {
    milestoneKey: 'm1',
    planned_start_at: '2026-02-02T00:00:00.000Z',
    planned_completion_at: '2026-02-13T00:00:00.000Z',
    actual_start_at: '2026-02-02T00:00:00.000Z',
    actual_completion_at: '2026-02-06T00:00:00.000Z',
    position: 10,
  },
  'ZAZZ-5': {
    milestoneKey: 'm2',
    planned_start_at: '2026-03-09T00:00:00.000Z',
    planned_completion_at: '2026-03-20T00:00:00.000Z',
    actual_start_at: '2026-03-09T00:00:00.000Z',
    actual_completion_at: '2026-03-20T00:00:00.000Z',
    position: 20,
  },
  'ZAZZ-6': {
    milestoneKey: 'm3',
    planned_start_at: '2026-03-23T00:00:00.000Z',
    planned_completion_at: '2026-04-03T00:00:00.000Z',
    actual_start_at: '2026-03-23T00:00:00.000Z',
    actual_completion_at: '2026-04-03T00:00:00.000Z',
    position: 10,
  },
};

function toDate(value) {
  return new Date(value);
}

function addDays(value, days, hour = 0) {
  const date = new Date(value);
  date.setUTCHours(hour, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function dateRangeDays(startValue, endValue) {
  return Math.max(1, Math.round((toDate(endValue).getTime() - toDate(startValue).getTime()) / DAY_MS) + 1);
}

function parsePhaseStep(value) {
  if (!value) return [Number.MAX_SAFE_INTEGER];
  return String(value)
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .map((part) => Number.isNaN(part) ? 0 : part);
}

function comparePhaseSteps(left, right) {
  const leftParts = parsePhaseStep(left.phase_step);
  const rightParts = parsePhaseStep(right.phase_step);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (diff !== 0) return diff;
  }

  return (left.position ?? 0) - (right.position ?? 0) || left.id - right.id;
}

function getTaskWindow(schedule, taskIndex, taskCount) {
  const days = dateRangeDays(schedule.planned_start_at, schedule.planned_completion_at);
  const startOffset = Math.min(days - 1, Math.floor((taskIndex * days) / taskCount));
  const endOffset = Math.min(days - 1, Math.max(startOffset, Math.floor(((taskIndex + 1) * days) / taskCount) - 1));

  return {
    started_at: addDays(schedule.planned_start_at, startOffset, 9),
    completed_at: addDays(schedule.planned_start_at, endOffset, 17),
  };
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

async function getMilestoneAssignmentsByProject() {
  const milestones = await db.select()
    .from(MILESTONES)
    .orderBy(asc(MILESTONES.project_id), asc(MILESTONES.start_date), asc(MILESTONES.end_date), asc(MILESTONES.id));
  const assignments = new Map();

  for (const milestone of milestones) {
    const current = assignments.get(milestone.project_id) || {
      defaultMilestone: null,
      plannedByKey: {},
    };

    if (milestone.is_default) {
      current.defaultMilestone = milestone;
    } else {
      const plannedIndex = Object.keys(current.plannedByKey).length;
      const key = ZAZZ_MILESTONES[plannedIndex]?.key;
      if (key) current.plannedByKey[key] = milestone;
    }

    assignments.set(milestone.project_id, current);
  }

  return assignments;
}

export async function prepareDeliverablesForProjectMilestones(/** @type {any[]} */ rows) {
  const assignmentsByProject = await getMilestoneAssignmentsByProject();

  return rows.map((row) => {
    const assignments = assignmentsByProject.get(row.project_id);
    if (!assignments?.defaultMilestone) {
      throw new Error(`Default milestone not found for project ${row.project_id}`);
    }

    const schedule = row.project_code === 'ZAZZ' ? ZAZZ_DELIVERABLE_SCHEDULES[row.code] : null;
    const milestone = schedule?.milestoneKey && schedule.milestoneKey !== 'default'
      ? assignments.plannedByKey[schedule.milestoneKey]
      : assignments.defaultMilestone;
    if (!milestone) {
      throw new Error(`Milestone not found for seeded deliverable ${row.code}`);
    }

    return {
      ...row,
      milestone_id: milestone.id,
      milestone_position: schedule?.position || row.position || 10,
      planned_start_at: schedule?.planned_start_at ? toDate(schedule.planned_start_at) : row.planned_start_at,
      planned_completion_at: schedule?.planned_completion_at ? toDate(schedule.planned_completion_at) : row.planned_completion_at,
      actual_start_at: schedule?.actual_start_at ? toDate(schedule.actual_start_at) : row.actual_start_at,
      actual_completion_at: schedule?.actual_completion_at ? toDate(schedule.actual_completion_at) : row.actual_completion_at,
    };
  });
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
        planned_start_at: schedule.planned_start_at ? toDate(schedule.planned_start_at) : toDate('2026-02-02T00:00:00.000Z'),
        planned_completion_at: schedule.planned_completion_at ? toDate(schedule.planned_completion_at) : toDate('2026-02-13T00:00:00.000Z'),
        actual_start_at: schedule.actual_start_at ? toDate(schedule.actual_start_at) : null,
        actual_completion_at: schedule.actual_completion_at ? toDate(schedule.actual_completion_at) : null,
        updated_at: new Date(),
      })
      .where(eq(DELIVERABLES.id, deliverable.id));
  }
}

async function assignZazzTaskTiming(projectId) {
  const deliverables = await db.select().from(DELIVERABLES).where(eq(DELIVERABLES.project_id, projectId));
  const schedulesByDeliverableId = new Map(
    deliverables
      .filter((deliverable) => ZAZZ_DELIVERABLE_SCHEDULES[deliverable.code])
      .map((deliverable) => [deliverable.id, ZAZZ_DELIVERABLE_SCHEDULES[deliverable.code]])
  );
  const tasks = await db.select()
    .from(TASKS)
    .where(eq(TASKS.project_id, projectId))
    .orderBy(asc(TASKS.deliverable_id), asc(TASKS.position), asc(TASKS.id));
  const tasksByDeliverableId = new Map();

  for (const task of tasks) {
    if (!schedulesByDeliverableId.has(task.deliverable_id)) continue;
    const current = tasksByDeliverableId.get(task.deliverable_id) || [];
    current.push(task);
    tasksByDeliverableId.set(task.deliverable_id, current);
  }

  for (const [deliverableId, deliverableTasks] of tasksByDeliverableId.entries()) {
    const schedule = schedulesByDeliverableId.get(deliverableId);
    const orderedTasks = [...deliverableTasks].sort(comparePhaseSteps);

    for (const [index, task] of orderedTasks.entries()) {
      const window = getTaskWindow(schedule, index, orderedTasks.length);

      await db.update(TASKS)
        .set({
          started_at: window.started_at,
          completed_at: window.completed_at,
        })
        .where(eq(TASKS.id, task.id));
    }
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
  const counts = await seedProjectMilestoneContainers();
  const assignmentCounts = await seedProjectMilestoneAssignments();
  return { ...counts, ...assignmentCounts };
}

export async function seedProjectMilestoneContainers() {
  const projects = await db.select().from(PROJECTS);
  let milestoneCount = 0;
  let settingsCount = 0;

  for (const project of projects) {
    await seedDefaultMilestone(project);
    milestoneCount += 1;
    await seedProjectSettings(project);
    settingsCount += 1;

    if (project.code === 'ZAZZ') {
      const plannedMilestones = await seedZazzPlannedMilestones(project);
      milestoneCount += Object.keys(plannedMilestones).length;
    }
  }

  return {
    milestones: milestoneCount,
    project_gantt_settings: settingsCount,
  };
}

export async function seedProjectMilestoneAssignments() {
  const projects = await db.select().from(PROJECTS);

  for (const project of projects) {
    const [defaultMilestone] = await db.select()
      .from(MILESTONES)
      .where(sql`${MILESTONES.project_id} = ${project.id} AND ${MILESTONES.is_default} = true`)
      .limit(1);
    if (!defaultMilestone) throw new Error(`Default milestone not found for project ${project.id}`);

    if (project.code === 'ZAZZ') {
      const assignmentsByProject = await getMilestoneAssignmentsByProject();
      const plannedMilestones = assignmentsByProject.get(project.id)?.plannedByKey || {};
      await assignZazzDeliverables(defaultMilestone, plannedMilestones);
      await assignZazzTaskTiming(project.id);
    } else {
      await assignDefaultDeliverables(project.id, defaultMilestone.id);
    }
  }

  const relationCount = await seedZazzDeliverableRelations();
  return {
    deliverable_relations: relationCount,
  };
}
