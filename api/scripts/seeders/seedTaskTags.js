import { db } from '../../lib/db/index.js';
import { TASK_TAGS } from '../../lib/db/schema.js';

export async function seedTaskTags() {
  console.log('  📝 Seeding task-tag relationships...');
  
  try {
    await db.insert(TASK_TAGS).values([
      // WEB-1: Design mockups (frontend, feature)
      { task_id: 1, tag: 'frontend' },
      { task_id: 1, tag: 'feature' },
      
      // WEB-2: Navigation (frontend, urgent) 
      { task_id: 2, tag: 'frontend' },
      { task_id: 2, tag: 'urgent' },
      
      // MOB-1: React Native setup (backend, feature)
      { task_id: 3, tag: 'backend' },
      { task_id: 3, tag: 'feature' },
      
      // MOB-2: Auth screens (frontend, feature)
      { task_id: 4, tag: 'frontend' },
      { task_id: 4, tag: 'feature' },
      
      // API-1: API audit (backend, urgent)
      { task_id: 5, tag: 'backend' },
      { task_id: 5, tag: 'urgent' }
    ]);
    
    console.log('  ✅ Task-tag relationships seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding task-tag relationships:', error.message);
    throw error;
  }
}
