import { db } from '../../lib/db/index.js';
import { STATUS_DEFINITIONS } from '../../lib/db/schema.js';

export async function seedStatusDefinitions() {
  console.log('  📝 Seeding status definitions...');
  try {
    await db.insert(STATUS_DEFINITIONS).values([
      { code: 'PENDING', description: 'Tasks waiting for upstream dependencies to complete' },
      { code: 'TO_DO', description: 'Tasks that are planned but not yet started' },
      { code: 'READY', description: 'Tasks that are ready to be started' },
      { code: 'IN_PROGRESS', description: 'Tasks currently being worked on' },
      { code: 'IN_REVIEW', description: 'Tasks awaiting code review or approval' },
      { code: 'QA', description: 'Task undergoing quality assurance and acceptance testing' },
      { code: 'COMPLETED', description: 'Task finished and verified against acceptance criteria' },
      { code: 'DONE', description: 'Merged to main, deliverable complete' },
      { code: 'PLANNING', description: 'SPEC and implementation plan being created or refined' },
      { code: 'STAGED', description: 'Merged to staging branch for integration testing' },
      { code: 'UAT', description: 'User acceptance testing in integration environment' },
      { code: 'PROD', description: 'Merged to main and deployed to production (terminal state)' },
      { code: 'TESTING', description: 'Tasks in testing phase' },
      { code: 'AWAITING_APPROVAL', description: 'Tasks waiting for stakeholder approval' },
      { code: 'READY_FOR_DEPLOY', description: 'Tasks ready to be deployed to production' },
      { code: 'ICEBOX', description: 'Tasks that are deprioritized or on hold' },
      { code: 'BACKLOG', description: 'Tasks in backlog awaiting prioritization' }
    ]);
    console.log('  ✅ Status definitions seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding status definitions:', error.message);
    throw error;
  }
}
