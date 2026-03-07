import { db } from '../../lib/db/index.js';
import { TASKS, TASK_RELATIONS, DELIVERABLES } from '../../lib/db/schema.js';
import { sql } from 'drizzle-orm';
import { loadZazzProjectSnapshot } from './zazzSnapshot.js';

function toDateOrNull(value) {
  return value ? new Date(value) : null;
}

export async function seedTaskRelations() {
  console.log('  📝 Seeding task relations...');

  try {
    const [{ count }] = await db.select({ count: sql`COUNT(*)::int` }).from(TASK_RELATIONS);
    if ((count ?? 0) > 0) {
      console.log(`  ⏭️  Task relations already exist (${count}). Skipping task relation seeding.`);
      return;
    }

    const snapshot = await loadZazzProjectSnapshot();

    const deliverables = await db
      .select({ id: DELIVERABLES.id, key: DELIVERABLES.deliverable_id })
      .from(DELIVERABLES);
    const deliverableKeyByDbId = new Map(deliverables.map((deliverable) => [deliverable.id, deliverable.key]));

    const tasks = await db
      .select({
        id: TASKS.id,
        title: TASKS.title,
        phaseStep: TASKS.phase_step,
        deliverableDbId: TASKS.deliverable_id,
      })
      .from(TASKS);
    if (tasks.length === 0) {
      console.log('  ⏭️  No tasks found. Skipping task relation seeding.');
      return;
    }

    const byDeliverableAndPhaseTask = new Map();
    const byDeliverableAndTitle = new Map();

    for (const task of tasks) {
      const deliverableKey = deliverableKeyByDbId.get(task.deliverableDbId);
      if (!deliverableKey) continue;

      if (task.phaseStep) {
        byDeliverableAndPhaseTask.set(`${deliverableKey}::${task.phaseStep}`, task.id);
      }

      byDeliverableAndTitle.set(`${deliverableKey}::${task.title}`, task.id);
    }

    const resolveTaskId = (deliverableId, phaseStep, title) => {
      if (phaseStep) {
        const byPhaseTask = byDeliverableAndPhaseTask.get(`${deliverableId}::${phaseStep}`);
        if (byPhaseTask) return byPhaseTask;
      }
      return byDeliverableAndTitle.get(`${deliverableId}::${title}`) || null;
    };

    const now = new Date();
    const rels = [];
    const seen = new Set();

    for (const relation of snapshot.task_relations) {
      const taskId = resolveTaskId(
        relation.from_deliverable_id,
        relation.from_phase_step,
        relation.from_title
      );
      const relatedTaskId = resolveTaskId(
        relation.to_deliverable_id,
        relation.to_phase_step,
        relation.to_title
      );

      if (!taskId || !relatedTaskId) continue;

      const dedupeKey = `${taskId}::${relatedTaskId}::${relation.relation_type}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      rels.push({
        task_id: taskId,
        related_task_id: relatedTaskId,
        relation_type: relation.relation_type,
        updated_by: relation.updated_by,
        updated_at: toDateOrNull(relation.updated_at) || now,
      });
    }

    if (rels.length === 0) {
      console.log('  ⏭️  No relations to insert.');
      return;
    }

    await db.insert(TASK_RELATIONS).values(rels);
    console.log(`  ✅ Task relations seeded successfully (${rels.length})`);
  } catch (error) {
    // If tasks are missing (e.g., seedTasks intentionally skipped), don't hard fail the whole seed.
    console.error('  ❌ Error seeding task relations:', error.message);
    throw error;
  }
}
