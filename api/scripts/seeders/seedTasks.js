import { db } from '../../lib/db/index.js';
import { TASKS } from '../../lib/db/schema.js';

export async function seedTasks() {
  console.log('  📝 Seeding tasks...');
  try {
    await db.insert(TASKS).values([
      // ZAZZ-1 (deliverable_id=1)
      { project_id: 1, deliverable_id: 1, title: 'Create DELIVERABLES schema', status: 'COMPLETED', priority: 'HIGH', assignee_id: 1, position: 10 },
      { project_id: 1, deliverable_id: 1, title: 'Deliverable CRUD API routes', status: 'IN_PROGRESS', priority: 'HIGH', assignee_id: 1, position: 20 },
      { project_id: 1, deliverable_id: 1, title: 'Deliverable Kanban board UI', status: 'TO_DO', priority: 'MEDIUM', assignee_id: 2, position: 30 },
      { project_id: 1, deliverable_id: 1, title: 'Task graph swim lanes', status: 'TO_DO', priority: 'MEDIUM', assignee_id: 3, position: 40 },
      { project_id: 1, deliverable_id: 1, title: 'Deliverable list page', status: 'READY', priority: 'MEDIUM', assignee_id: 2, position: 50 },
      { project_id: 1, deliverable_id: 1, title: 'Seed data and translations', status: 'QA', priority: 'LOW', assignee_id: 4, position: 60 },

      // ZAZZ-3 (deliverable_id=3)
      { project_id: 1, deliverable_id: 3, title: 'Fix tag regex pattern', status: 'COMPLETED', priority: 'HIGH', assignee_id: 1, position: 10 },
      { project_id: 1, deliverable_id: 3, title: 'Add tag validation tests', status: 'COMPLETED', priority: 'MEDIUM', assignee_id: 1, position: 20 },

      // MOBDEV-1 (deliverable_id=4)
      { project_id: 2, deliverable_id: 4, title: 'Login screen layout', status: 'COMPLETED', priority: 'HIGH', assignee_id: 3, position: 10 },
      { project_id: 2, deliverable_id: 4, title: 'Registration form', status: 'IN_PROGRESS', priority: 'MEDIUM', assignee_id: 2, position: 20 },
      { project_id: 2, deliverable_id: 4, title: 'Password reset flow', status: 'TO_DO', priority: 'MEDIUM', assignee_id: 3, position: 30 },

      // APIMOD-1 (deliverable_id=5)
      { project_id: 3, deliverable_id: 5, title: 'Audit existing endpoints', status: 'COMPLETED', priority: 'HIGH', assignee_id: 4, position: 10 },
      { project_id: 3, deliverable_id: 5, title: 'Design OpenAPI spec', status: 'IN_PROGRESS', priority: 'CRITICAL', assignee_id: 3, position: 20 },
      { project_id: 3, deliverable_id: 5, title: 'Implement versioning', status: 'READY', priority: 'HIGH', assignee_id: 3, position: 30 },
      { project_id: 3, deliverable_id: 5, title: 'Add rate limiting', status: 'TO_DO', priority: 'MEDIUM', assignee_id: 4, position: 40 },
      { project_id: 3, deliverable_id: 5, title: 'Integration test suite', status: 'TO_DO', priority: 'HIGH', assignee_id: 1, position: 50 }
    ]);
    console.log('  ✅ Tasks seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding tasks:', error.message);
    throw error;
  }
}
