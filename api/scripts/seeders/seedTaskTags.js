import { db } from '../../lib/db/index.js';
import { TASK_TAGS } from '../../lib/db/schema.js';

export async function seedTaskTags() {
  console.log('  📝 Seeding task-tag relationships...');
  
  try {
    await db.insert(TASK_TAGS).values([
      // ZAZZ deliverables work
      { task_id: 1, tag: 'frontend' },
      { task_id: 1, tag: 'feature' },
      { task_id: 2, tag: 'frontend' },
      { task_id: 2, tag: 'urgent' },

      { task_id: 6, tag: 'database' },
      { task_id: 7, tag: 'bug-fix' },
      { task_id: 8, tag: 'testing' },

      // MOBDEV/APIMOD
      { task_id: 9, tag: 'frontend' },
      { task_id: 10, tag: 'feature' },
      { task_id: 12, tag: 'backend' },
      { task_id: 13, tag: 'backend' }
    ]);
    
    console.log('  ✅ Task-tag relationships seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding task-tag relationships:', error.message);
    throw error;
  }
}
