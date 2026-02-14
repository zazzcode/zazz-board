import { db } from '../../lib/db/index.js';
import { COORDINATION_REQUIREMENT_DEFINITIONS } from '../../lib/db/schema.js';

export async function seedCoordinationRequirementDefinitions() {
  console.log('  📝 Seeding coordination requirement definitions...');
  
  try {
    await db.insert(COORDINATION_REQUIREMENT_DEFINITIONS).values([
      {
        code: 'MERGE_TOGETHER',
        description: 'All PRs must merge to dev together'
      },
      {
        code: 'DEPLOY_TOGETHER',
        description: 'Changes must be deployed together to avoid breaking changes'
      },
      {
        code: 'MIGRATE_TOGETHER',
        description: 'Database migration and API changes must merge simultaneously'
      },
      {
        code: 'RELEASE_TOGETHER',
        description: 'All changes must be released to production together'
      },
      {
        code: 'TEST_TOGETHER',
        description: 'Changes must be tested together before deployment'
      }
    ]);
    
    console.log('  ✅ Coordination requirement definitions seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding coordination requirement definitions:', error.message);
    throw error;
  }
}
