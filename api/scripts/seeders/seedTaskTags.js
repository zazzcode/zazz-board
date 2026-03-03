import { db } from '../../lib/db/index.js';
import { TASKS, TAGS, TASK_TAGS } from '../../lib/db/schema.js';
import { eq, sql } from 'drizzle-orm';

export async function seedTaskTags() {
  console.log('  📝 Seeding task-tag relationships...');

  try {
    const [{ count }] = await db.select({ count: sql`COUNT(*)::int` }).from(TASK_TAGS);
    if ((count ?? 0) > 0) {
      console.log(`  ⏭️  Task tags already exist (${count}). Skipping task-tag seeding.`);
      return;
    }

    const tags = await db.select({ tag: TAGS.tag }).from(TAGS);
    const tagSet = new Set(tags.map(t => t.tag));

    const tasks = await db.select({ id: TASKS.id, title: TASKS.title }).from(TASKS);
    if (tasks.length === 0) {
      console.log('  ⏭️  No tasks found. Skipping task-tag seeding.');
      return;
    }

    const byTitle = new Map(tasks.map(t => [t.title, t.id]));

    const links = [];
    const add = (title, tag) => {
      const id = byTitle.get(title);
      if (!id) return;
      if (!tagSet.has(tag)) return;
      links.push({ task_id: id, tag });
    };

    // Keep tags consistent with TAGS seed data.
    add('ZAZZ-1: Foundation completed (schema + API read paths)', 'backend');
    add('ZAZZ-1: Remaining work (UI polish + edge cases)', 'frontend');

    add('ZAZZ-3: Reproduce bug and capture failing cases', 'bug-fix');
    add('ZAZZ-3: Add regression tests for invalid tag formats', 'testing');
    add('ZAZZ-3: Fix validation for trailing hyphen and edge cases', 'bug-fix');

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
