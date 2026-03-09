import { db } from '../../lib/db/index.js';
import { TASKS, TAGS, TASK_TAGS, DELIVERABLES } from '../../lib/db/schema.js';
import { sql } from 'drizzle-orm';
import { loadZazzProjectSnapshot } from './zazzSnapshot.js';

export async function seedTaskTags() {
  console.log('  📝 Seeding task-tag relationships...');

  try {
    const [{ count }] = await db.select({ count: sql`COUNT(*)::int` }).from(TASK_TAGS);
    if ((count ?? 0) > 0) {
      console.log(`  ⏭️  Task tags already exist (${count}). Skipping task-tag seeding.`);
      return;
    }

    const snapshot = await loadZazzProjectSnapshot();
    const tags = await db.select({ tag: TAGS.tag }).from(TAGS);
    const tagSet = new Set(tags.map(t => t.tag));

    const deliverables = await db
      .select({ id: DELIVERABLES.id, key: DELIVERABLES.code })
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
      console.log('  ⏭️  No tasks found. Skipping task-tag seeding.');
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

    const links = [];
    const seen = new Set();

    for (const tagLink of snapshot.task_tags) {
      if (!tagSet.has(tagLink.tag)) continue;

      const taskId = tagLink.phase_step
        ? byDeliverableAndPhaseTask.get(`${tagLink.code}::${tagLink.phase_step}`)
        : null;

      const resolvedTaskId = taskId || byDeliverableAndTitle.get(`${tagLink.code}::${tagLink.title}`);
      if (!resolvedTaskId) continue;

      const dedupeKey = `${resolvedTaskId}::${tagLink.tag}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      links.push({ task_id: resolvedTaskId, tag: tagLink.tag });
    }

    if (links.length === 0) {
      console.log('  ⏭️  No task-tag links to insert.');
      return;
    }

    await db.insert(TASK_TAGS).values(links);
    console.log(`  ✅ Task tags seeded successfully (${links.length})`);
  } catch (error) {
    console.error('  ❌ Error seeding task-tag relationships:', error.message);
    throw error;
  }
}
