import { db } from '../../lib/db/index.js';
import { TASK_RELATIONS, TASKS } from '../../lib/db/schema.js';
import { eq } from 'drizzle-orm';

export async function seedTaskRelations() {
  console.log('  📝 Seeding task relations...');
  try {
    await db.insert(TASK_RELATIONS).values([
      // ZAZZ-1 flow (tasks 1-6)
      { task_id: 2, related_task_id: 1, relation_type: 'DEPENDS_ON' },
      { task_id: 3, related_task_id: 2, relation_type: 'DEPENDS_ON' },
      { task_id: 4, related_task_id: 2, relation_type: 'DEPENDS_ON' },
      { task_id: 5, related_task_id: 2, relation_type: 'DEPENDS_ON' },
      { task_id: 6, related_task_id: 5, relation_type: 'DEPENDS_ON' },

      // Coordination example
      { task_id: 3, related_task_id: 4, relation_type: 'COORDINATES_WITH' },
      { task_id: 4, related_task_id: 3, relation_type: 'COORDINATES_WITH' },

      // APIMOD-1 flow (tasks 12-16)
      { task_id: 13, related_task_id: 12, relation_type: 'DEPENDS_ON' },
      { task_id: 14, related_task_id: 13, relation_type: 'DEPENDS_ON' },
      { task_id: 15, related_task_id: 13, relation_type: 'DEPENDS_ON' },
      { task_id: 16, related_task_id: 14, relation_type: 'DEPENDS_ON' }
    ]);

    await db.update(TASKS).set({ coordination_code: 'TEST_TOGETHER' }).where(eq(TASKS.id, 3));
    await db.update(TASKS).set({ coordination_code: 'TEST_TOGETHER' }).where(eq(TASKS.id, 4));

    console.log('  ✅ Task relations seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding task relations:', error.message);
    throw error;
  }
}
