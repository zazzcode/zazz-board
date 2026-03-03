import { db } from '../../lib/db/index.js';
import { PROJECTS, DELIVERABLES, TASKS } from '../../lib/db/schema.js';
import { and, eq, sql } from 'drizzle-orm';

async function getProjectId(code) {
  const [project] = await db.select({ id: PROJECTS.id }).from(PROJECTS).where(eq(PROJECTS.code, code)).limit(1);
  if (!project) throw new Error(`Project not found: ${code}`);
  return project.id;
}

async function getDeliverableId(projectId, deliverableKey) {
  const [deliverable] = await db
    .select({ id: DELIVERABLES.id })
    .from(DELIVERABLES)
    .where(and(eq(DELIVERABLES.project_id, projectId), eq(DELIVERABLES.deliverable_id, deliverableKey)))
    .limit(1);
  if (!deliverable) throw new Error(`Deliverable not found: ${deliverableKey}`);
  return deliverable.id;
}

async function tasksExistForDeliverable(deliverableId) {
  const [{ count }] = await db
    .select({ count: sql`COUNT(*)::int` })
    .from(TASKS)
    .where(eq(TASKS.deliverable_id, deliverableId));
  return (count ?? 0) > 0;
}

/**
 * Seed interdependent tasks for demo.
 * Seed rules requested:
 * - ZAZZ-3 (IN_REVIEW): lots of COMPLETED tasks + a small tail of IN_REVIEW/READY.
 * - ZAZZ-1 (IN_PROGRESS): one COMPLETED + one READY.
 * - Other deliverables: no tasks.
 */
export async function seedTasks() {
  console.log('  📝 Seeding tasks...');

  try {
    const projectId = await getProjectId('ZAZZ');

    const zazz1 = await getDeliverableId(projectId, 'ZAZZ-1');
    const zazz3 = await getDeliverableId(projectId, 'ZAZZ-3');

    // Idempotency: if either deliverable already has tasks, don’t insert again.
    const zazz1Has = await tasksExistForDeliverable(zazz1);
    const zazz3Has = await tasksExistForDeliverable(zazz3);
    if (zazz1Has || zazz3Has) {
      console.log('  ⏭️  Tasks already exist for seeded deliverables. Skipping task seeding.');
      return;
    }

    const createdBy = 5;
    const now = new Date();

    const mk = (overrides) => ({
      project_id: projectId,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
      priority: 'MEDIUM',
      status: 'READY',
      position: 10,
      ...overrides,
    });

    const tasks = [
      // ---------------- ZAZZ-1 (IN_PROGRESS) ----------------
      mk({
        deliverable_id: zazz1,
        phase: 1,
        phase_task_id: '1.1',
        title: 'ZAZZ-1: Foundation completed (schema + API read paths)',
        status: 'COMPLETED',
        priority: 'HIGH',
        position: 10,
        completed_at: now,
      }),
      mk({
        deliverable_id: zazz1,
        phase: 2,
        phase_task_id: '2.1',
        title: 'ZAZZ-1: Remaining work (UI polish + edge cases)',
        status: 'READY',
        priority: 'MEDIUM',
        position: 20,
      }),

      // ---------------- ZAZZ-3 (IN_REVIEW) ----------------
      // Phase 1: reproduce + analysis
      mk({ deliverable_id: zazz3, phase: 1, phase_task_id: '1.1', title: 'ZAZZ-3: Reproduce bug and capture failing cases', status: 'COMPLETED', priority: 'HIGH', position: 10, completed_at: now }),
      mk({ deliverable_id: zazz3, phase: 1, phase_task_id: '1.2', title: 'ZAZZ-3: Add regression tests for invalid tag formats', status: 'COMPLETED', priority: 'HIGH', position: 20, completed_at: now }),
      mk({ deliverable_id: zazz3, phase: 1, phase_task_id: '1.3', title: 'ZAZZ-3: Confirm API validation contract + error messaging', status: 'COMPLETED', priority: 'MEDIUM', position: 30, completed_at: now }),

      // Phase 2: implement fix
      mk({ deliverable_id: zazz3, phase: 2, phase_task_id: '2.1', title: 'ZAZZ-3: Fix validation for trailing hyphen and edge cases', status: 'COMPLETED', priority: 'HIGH', position: 40, completed_at: now }),
      mk({ deliverable_id: zazz3, phase: 2, phase_task_id: '2.2', title: 'ZAZZ-3: Add server-side canonicalization (lowercase + hyphens)', status: 'COMPLETED', priority: 'MEDIUM', position: 50, completed_at: now }),
      mk({ deliverable_id: zazz3, phase: 2, phase_task_id: '2.3', title: 'ZAZZ-3: Ensure tag creation/upsert handles collisions', status: 'COMPLETED', priority: 'MEDIUM', position: 60, completed_at: now }),

      // Phase 3: QA + wrap-up tail
      mk({ deliverable_id: zazz3, phase: 3, phase_task_id: '3.1', title: 'ZAZZ-3: QA run (API + UI) for tag flows', status: 'COMPLETED', priority: 'MEDIUM', position: 70, completed_at: now }),
      mk({ deliverable_id: zazz3, phase: 3, phase_task_id: '3.2', title: 'ZAZZ-3: Address review feedback / small refactor', status: 'COMPLETED', priority: 'MEDIUM', position: 80, completed_at: now }),
      mk({ deliverable_id: zazz3, phase: 3, phase_task_id: '3.3', title: 'ZAZZ-3: Final sign-off checklist', status: 'COMPLETED', priority: 'LOW', position: 90, completed_at: now }),
    ];

    await db.insert(TASKS).values(tasks);

    console.log(`  ✅ Tasks seeded successfully (${tasks.length})`);
  } catch (error) {
    console.error('  ❌ Error seeding tasks:', error.message);
    throw error;
  }
}
