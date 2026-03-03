import { db } from '../../lib/db/index.js';
import { TASKS, TASK_RELATIONS } from '../../lib/db/schema.js';
import { eq, sql } from 'drizzle-orm';

export async function seedTaskRelations() {
  console.log('  📝 Seeding task relations...');

  try {
    const [{ count }] = await db.select({ count: sql`COUNT(*)::int` }).from(TASK_RELATIONS);
    if ((count ?? 0) > 0) {
      console.log(`  ⏭️  Task relations already exist (${count}). Skipping task relation seeding.`);
      return;
    }

    const tasks = await db.select({ id: TASKS.id, title: TASKS.title }).from(TASKS);
    if (tasks.length === 0) {
      console.log('  ⏭️  No tasks found. Skipping task relation seeding.');
      return;
    }

    const byTitle = new Map(tasks.map(t => [t.title, t.id]));

    const depends = (a, b) => {
      const taskId = byTitle.get(a);
      const relatedId = byTitle.get(b);
      if (!taskId || !relatedId) return null;
      return { task_id: taskId, related_task_id: relatedId, relation_type: 'DEPENDS_ON' };
    };

    const coordinates = (a, b) => {
      const taskId = byTitle.get(a);
      const relatedId = byTitle.get(b);
      if (!taskId || !relatedId) return [];
      // Store both directions so consumers that treat the table as directed still see the edge.
      return [
        { task_id: taskId, related_task_id: relatedId, relation_type: 'COORDINATES_WITH' },
        { task_id: relatedId, related_task_id: taskId, relation_type: 'COORDINATES_WITH' },
      ];
    };

    const rels = [
      // ZAZZ-1 simple dependency (1.1 must complete before 1.2)
      depends('ZAZZ-1: Remaining work (UI polish + edge cases)', 'ZAZZ-1: Foundation completed (schema + API read paths)'),

      // ZAZZ-3 progression chain (each task depends on the previous phase)
      depends('ZAZZ-3: Add regression tests for invalid tag formats', 'ZAZZ-3: Reproduce bug and capture failing cases'),
      depends('ZAZZ-3: Confirm API validation contract + error messaging', 'ZAZZ-3: Add regression tests for invalid tag formats'),
      depends('ZAZZ-3: Fix validation for trailing hyphen and edge cases', 'ZAZZ-3: Confirm API validation contract + error messaging'),
      depends('ZAZZ-3: Add server-side canonicalization (lowercase + hyphens)', 'ZAZZ-3: Fix validation for trailing hyphen and edge cases'),
      depends('ZAZZ-3: Ensure tag creation/upsert handles collisions', 'ZAZZ-3: Add server-side canonicalization (lowercase + hyphens)'),
      depends('ZAZZ-3: QA run (API + UI) for tag flows', 'ZAZZ-3: Ensure tag creation/upsert handles collisions'),
      depends('ZAZZ-3: Address review feedback / small refactor', 'ZAZZ-3: QA run (API + UI) for tag flows'),
      depends('ZAZZ-3: Final sign-off checklist', 'ZAZZ-3: Address review feedback / small refactor'),
    ].flat().filter(Boolean);

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
