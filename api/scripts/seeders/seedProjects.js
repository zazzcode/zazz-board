import { db } from '../../lib/db/index.js';
import { PROJECTS } from '../../lib/db/schema.js';

export async function seedProjects() {
  console.log('  📝 Seeding projects...');
  try {
    await db.insert(PROJECTS).values([
      {
        title: 'Zazz Board',
        code: 'ZAZZ',
        description: 'Zazz-Board application development — primary test project',
        leader_id: 5,
        next_deliverable_sequence: 4,
        status_workflow: ['READY', 'IN_PROGRESS', 'QA', 'COMPLETED'],
        deliverable_status_workflow: ['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'STAGED', 'DONE'],
        task_graph_layout_direction: 'LR',
        completion_criteria_status: 'COMPLETED',
        created_by: 5
      },
      {
        title: 'Mobile App Development',
        code: 'MOBDEV',
        description: 'Native mobile app for iOS and Android platforms',
        leader_id: 2,
        next_deliverable_sequence: 2,
        status_workflow: ['READY', 'IN_PROGRESS', 'QA', 'COMPLETED'],
        deliverable_status_workflow: ['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'STAGED', 'DONE'],
        created_by: 2
      },
      {
        title: 'API Modernization',
        code: 'APIMOD',
        description: 'Migrate legacy APIs to modern REST architecture',
        leader_id: 3,
        next_deliverable_sequence: 3,
        status_workflow: ['READY', 'IN_PROGRESS', 'QA', 'COMPLETED'],
        deliverable_status_workflow: ['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'UAT', 'STAGED', 'PROD'],
        task_graph_layout_direction: 'LR',
        completion_criteria_status: 'COMPLETED',
        created_by: 3
      },
      {
        title: 'Database Migration',
        code: 'DATAMIG',
        description: 'Migrate all customer data to new clustered database',
        leader_id: 5,
        next_deliverable_sequence: 1,
        status_workflow: ['READY', 'IN_PROGRESS', 'QA', 'COMPLETED'],
        deliverable_status_workflow: ['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'STAGED', 'DONE'],
        created_by: 5
      },
      {
        title: 'Security Compliance',
        code: 'SECURE',
        description: 'Annual security audit and compliance updates',
        leader_id: 4,
        next_deliverable_sequence: 1,
        status_workflow: ['READY', 'IN_PROGRESS', 'QA', 'COMPLETED'],
        deliverable_status_workflow: ['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'STAGED', 'DONE'],
        created_by: 4
      }
    ]);
    console.log('  ✅ Projects seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding projects:', error.message);
    throw error;
  }
}
