import { db } from '../../lib/db/index.js';
import { PROJECTS, DELIVERABLES, TASKS } from '../../lib/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { loadZazzProjectSnapshot } from './zazzSnapshot.js';

async function getProjectId(code) {
  const [project] = await db.select({ id: PROJECTS.id }).from(PROJECTS).where(eq(PROJECTS.code, code)).limit(1);
  if (!project) throw new Error(`Project not found: ${code}`);
  return project.id;
}

async function getDeliverableIdMap(projectId) {
  const deliverables = await db
    .select({ id: DELIVERABLES.id, key: DELIVERABLES.code })
    .from(DELIVERABLES)
    .where(eq(DELIVERABLES.project_id, projectId));

  return new Map(deliverables.map((deliverable) => [deliverable.key, deliverable.id]));
}

async function tasksExistForProject(projectId) {
  const [{ count }] = await db
    .select({ count: sql`COUNT(*)::int` })
    .from(TASKS)
    .where(eq(TASKS.project_id, projectId));
  return (count ?? 0) > 0;
}

function toDateOrNull(value) {
  return value ? new Date(value) : null;
}

export async function seedTasks() {
  console.log('  📝 Seeding tasks...');

  try {
    const snapshot = await loadZazzProjectSnapshot();
    const projectId = await getProjectId('ZAZZ');
    const hasTasks = await tasksExistForProject(projectId);
    if (hasTasks) {
      console.log('  ⏭️  Tasks already exist for ZAZZ project. Skipping task seeding.');
      return;
    }

    const deliverableIdMap = await getDeliverableIdMap(projectId);
    const now = new Date();

    const tasks = snapshot.tasks.map((task, index) => {
      const deliverableDbId = deliverableIdMap.get(task.code);
      if (!deliverableDbId) {
        throw new Error(`Deliverable not found for task seed: ${task.code}`);
      }

      return {
        project_id: projectId,
        deliverable_id: deliverableDbId,
        phase: task.phase,
        phase_step: task.phase_step,
        title: task.title,
        status: task.status || 'READY',
        priority: task.priority || 'MEDIUM',
        agent_name: task.agent_name,
        prompt: task.prompt,
        notes: task.notes,
        story_points: task.story_points,
        position: task.position ?? (index + 1) * 10,
        is_blocked: task.is_blocked ?? false,
        blocked_reason: task.blocked_reason,
        is_cancelled: task.is_cancelled ?? false,
        git_worktree: task.git_worktree,
        started_at: toDateOrNull(task.started_at),
        completed_at: toDateOrNull(task.completed_at),
        coordination_code: task.coordination_code,
        created_by: task.created_by ?? 5,
        created_at: toDateOrNull(task.created_at) || now,
        updated_by: task.updated_by ?? task.created_by ?? 5,
        updated_at: toDateOrNull(task.updated_at) || now,
      };
    });

    await db.insert(TASKS).values(tasks);

    console.log(`  ✅ Tasks seeded successfully (${tasks.length})`);
  } catch (error) {
    console.error('  ❌ Error seeding tasks:', error.message);
    throw error;
  }
}
