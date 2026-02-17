import { db } from '../../lib/db/index.js';
import { TASKS } from '../../lib/db/schema.js';
import { eq } from 'drizzle-orm';

export async function seedTaskRelations() {
  console.log('  📝 Seeding task relations (additional coordination codes)...');
  try {
    // Note: Most task relations are created in seedTasks.js
    // This function only sets coordination_code for coordinated tasks
    
    await db.update(TASKS).set({ coordination_code: 'TEST_TOGETHER' }).where(eq(TASKS.id, 3));
    await db.update(TASKS).set({ coordination_code: 'TEST_TOGETHER' }).where(eq(TASKS.id, 4));

    console.log('  ✅ Task relation coordination codes seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding task relations:', error.message);
    throw error;
  }
}
