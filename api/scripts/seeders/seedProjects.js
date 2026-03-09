import { db } from '../../lib/db/index.js';
import { PROJECTS } from '../../lib/db/schema.js';
import { loadZazzProjectSnapshot } from './zazzSnapshot.js';

function toDateOrNull(value) {
  return value ? new Date(value) : null;
}

function deriveFallbackProjectTimestamp(snapshot) {
  const timestamps = [
    snapshot?.project?.created_at,
    snapshot?.project?.updated_at,
    ...(Array.isArray(snapshot?.deliverables)
      ? snapshot.deliverables.flatMap((deliverable) => [deliverable.created_at, deliverable.updated_at])
      : []),
    ...(Array.isArray(snapshot?.tasks)
      ? snapshot.tasks.flatMap((task) => [task.created_at, task.updated_at, task.completed_at, task.started_at])
      : []),
  ]
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());

  return timestamps[0] ?? new Date('2026-03-04T23:01:41.016Z');
}

export async function seedProjects() {
  console.log('  📝 Seeding projects...');
  try {
    const snapshot = await loadZazzProjectSnapshot();
    const zazzProject = snapshot.project;
    const zedLeaderId = zazzProject.leader_id === 2 ? 3 : 2;
    const fallbackProjectTimestamp = deriveFallbackProjectTimestamp(snapshot);
    const zazzCreatedAt = toDateOrNull(zazzProject.created_at) || fallbackProjectTimestamp;
    const zazzUpdatedAt = toDateOrNull(zazzProject.updated_at) || zazzCreatedAt;

    await db.insert(PROJECTS).values([
      {
        title: zazzProject.title || 'Zazz Board',
        code: zazzProject.code || 'ZAZZ',
        description: zazzProject.description || 'Zazz-Board application development — primary test project',
        leader_id: zazzProject.leader_id || 5,
        next_deliverable_sequence: zazzProject.next_deliverable_sequence || 4,
        status_workflow: Array.isArray(zazzProject.status_workflow) ? zazzProject.status_workflow : ['READY', 'IN_PROGRESS', 'QA', 'COMPLETED'],
        deliverable_status_workflow: Array.isArray(zazzProject.deliverable_status_workflow) ? zazzProject.deliverable_status_workflow : ['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'STAGED', 'DONE'],
        task_graph_layout_direction: zazzProject.task_graph_layout_direction || 'LR',
        completion_criteria_status: zazzProject.completion_criteria_status || 'COMPLETED',
        created_by: zazzProject.created_by || 5,
        created_at: zazzCreatedAt,
        updated_at: zazzUpdatedAt,
      },
      {
        title: 'Zed Mermaid',
        code: 'ZED_MER',
        description: 'Product-only project for real deliverable creation',
        leader_id: zedLeaderId,
        next_deliverable_sequence: 1,
        status_workflow: ['READY', 'IN_PROGRESS', 'QA', 'COMPLETED'],
        deliverable_status_workflow: ['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'STAGED', 'DONE'],
        task_graph_layout_direction: 'LR',
        completion_criteria_status: 'COMPLETED',
        created_by: zedLeaderId,
        created_at: fallbackProjectTimestamp,
        updated_at: fallbackProjectTimestamp,
      }
    ]);
    console.log('  ✅ Projects seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding projects:', error.message);
    throw error;
  }
}
