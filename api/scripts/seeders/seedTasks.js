import { db } from '../../lib/db/index.js';
import { TASKS, TASK_RELATIONS } from '../../lib/db/schema.js';

export async function seedTasks() {
  console.log('  📝 Seeding tasks...');
  try {
    const taskResults = await db.insert(TASKS).values([
      // ZAZZ-1 (deliverable_id=1) - Complex dependency chain (7 tasks deep)
      // Layer 1: Setup foundations
      { project_id: 1, deliverable_id: 1, title: 'Create DELIVERABLES schema', status: 'COMPLETED', priority: 'HIGH', assignee_id: 1, position: 10 },
      
      // Layer 2: Build on foundations
      { project_id: 1, deliverable_id: 1, title: 'Deliverable CRUD API routes', status: 'IN_PROGRESS', priority: 'HIGH', assignee_id: 1, position: 20 },
      
      // Layer 3: Frontend foundation
      { project_id: 1, deliverable_id: 1, title: 'Deliverable Kanban board UI', status: 'TO_DO', priority: 'MEDIUM', assignee_id: 2, position: 30 },
      
      // Layer 4: Advanced visualization
      { project_id: 1, deliverable_id: 1, title: 'Task graph swim lanes', status: 'TO_DO', priority: 'MEDIUM', assignee_id: 3, position: 40 },
      
      // Layer 5: Integration
      { project_id: 1, deliverable_id: 1, title: 'Connect board to task graph', status: 'TO_DO', priority: 'MEDIUM', assignee_id: 2, position: 50 },
      
      // Layer 6: Testing
      { project_id: 1, deliverable_id: 1, title: 'E2E integration tests', status: 'TO_DO', priority: 'HIGH', assignee_id: 3, position: 60 },
      
      // Layer 7: Polish
      { project_id: 1, deliverable_id: 1, title: 'Deliverable list page', status: 'TO_DO', priority: 'MEDIUM', assignee_id: 2, position: 70 },
      
      // Layer 8: Finalization
      { project_id: 1, deliverable_id: 1, title: 'Seed data and translations', status: 'TO_DO', priority: 'LOW', assignee_id: 4, position: 80 },

      // Coordinated tasks (3 tasks that work together)
      { project_id: 1, deliverable_id: 1, title: 'Create notification system', status: 'TO_DO', priority: 'MEDIUM', assignee_id: 4, position: 90 },
      { project_id: 1, deliverable_id: 1, title: 'Setup event bus infrastructure', status: 'TO_DO', priority: 'HIGH', assignee_id: 1, position: 100 },
      { project_id: 1, deliverable_id: 1, title: 'Integrate notifications with events', status: 'TO_DO', priority: 'MEDIUM', assignee_id: 2, position: 110 },

      // Multi-parent dependency (3 tasks waiting on 2 dependencies)
      { project_id: 1, deliverable_id: 1, title: 'Configure database connection pool', status: 'TO_DO', priority: 'CRITICAL', assignee_id: 1, position: 120 },
      { project_id: 1, deliverable_id: 1, title: 'Setup Redis cache layer', status: 'TO_DO', priority: 'HIGH', assignee_id: 4, position: 130 },
      { project_id: 1, deliverable_id: 1, title: 'Implement query optimization', status: 'TO_DO', priority: 'MEDIUM', assignee_id: 3, position: 140 },
      { project_id: 1, deliverable_id: 1, title: 'Write performance benchmarks', status: 'TO_DO', priority: 'MEDIUM', assignee_id: 2, position: 150 },
      { project_id: 1, deliverable_id: 1, title: 'Deploy to staging', status: 'TO_DO', priority: 'HIGH', assignee_id: 1, position: 160 },

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
    ]).returning();

    // Extract task IDs for reference (they're sequential)
    const tasks = taskResults.reduce((acc, task) => {
      acc[task.title] = task.id;
      return acc;
    }, {});

    // Create dependency chain (7 tasks deep)
    // Layer 1 → Layer 2
    await db.insert(TASK_RELATIONS).values({
      task_id: tasks['Deliverable CRUD API routes'],
      related_task_id: tasks['Create DELIVERABLES schema'],
      relation_type: 'DEPENDS_ON',
      updated_at: new Date()
    });

    // Layer 2 → Layer 3
    await db.insert(TASK_RELATIONS).values({
      task_id: tasks['Deliverable Kanban board UI'],
      related_task_id: tasks['Deliverable CRUD API routes'],
      relation_type: 'DEPENDS_ON',
      updated_at: new Date()
    });

    // Layer 3 → Layer 4
    await db.insert(TASK_RELATIONS).values({
      task_id: tasks['Task graph swim lanes'],
      related_task_id: tasks['Deliverable Kanban board UI'],
      relation_type: 'DEPENDS_ON',
      updated_at: new Date()
    });

    // Layer 4 → Layer 5
    await db.insert(TASK_RELATIONS).values({
      task_id: tasks['Connect board to task graph'],
      related_task_id: tasks['Task graph swim lanes'],
      relation_type: 'DEPENDS_ON',
      updated_at: new Date()
    });

    // Layer 5 → Layer 6
    await db.insert(TASK_RELATIONS).values({
      task_id: tasks['E2E integration tests'],
      related_task_id: tasks['Connect board to task graph'],
      relation_type: 'DEPENDS_ON',
      updated_at: new Date()
    });

    // Layer 6 → Layer 7
    await db.insert(TASK_RELATIONS).values({
      task_id: tasks['Deliverable list page'],
      related_task_id: tasks['E2E integration tests'],
      relation_type: 'DEPENDS_ON',
      updated_at: new Date()
    });

    // Layer 7 → Layer 8
    await db.insert(TASK_RELATIONS).values({
      task_id: tasks['Seed data and translations'],
      related_task_id: tasks['Deliverable list page'],
      relation_type: 'DEPENDS_ON',
      updated_at: new Date()
    });

    // Coordinated tasks (all three coordinate with each other)
    await db.insert(TASK_RELATIONS).values([
      {
        task_id: tasks['Create notification system'],
        related_task_id: tasks['Setup event bus infrastructure'],
        relation_type: 'COORDINATES_WITH',
        updated_at: new Date()
      },
      {
        task_id: tasks['Setup event bus infrastructure'],
        related_task_id: tasks['Create notification system'],
        relation_type: 'COORDINATES_WITH',
        updated_at: new Date()
      },
      {
        task_id: tasks['Integrate notifications with events'],
        related_task_id: tasks['Create notification system'],
        relation_type: 'DEPENDS_ON',
        updated_at: new Date()
      },
      {
        task_id: tasks['Integrate notifications with events'],
        related_task_id: tasks['Setup event bus infrastructure'],
        relation_type: 'DEPENDS_ON',
        updated_at: new Date()
      }
    ]);

    // Multi-parent dependency (3 tasks wait for 2 dependencies before proceeding)
    await db.insert(TASK_RELATIONS).values([
      // Implementation tasks depend on infrastructure
      {
        task_id: tasks['Implement query optimization'],
        related_task_id: tasks['Configure database connection pool'],
        relation_type: 'DEPENDS_ON',
        updated_at: new Date()
      },
      {
        task_id: tasks['Implement query optimization'],
        related_task_id: tasks['Setup Redis cache layer'],
        relation_type: 'DEPENDS_ON',
        updated_at: new Date()
      },
      // Benchmarking depends on both optimization and infrastructure
      {
        task_id: tasks['Write performance benchmarks'],
        related_task_id: tasks['Implement query optimization'],
        relation_type: 'DEPENDS_ON',
        updated_at: new Date()
      },
      {
        task_id: tasks['Write performance benchmarks'],
        related_task_id: tasks['Configure database connection pool'],
        relation_type: 'DEPENDS_ON',
        updated_at: new Date()
      },
      // Deployment depends on everything
      {
        task_id: tasks['Deploy to staging'],
        related_task_id: tasks['Write performance benchmarks'],
        relation_type: 'DEPENDS_ON',
        updated_at: new Date()
      },
      {
        task_id: tasks['Deploy to staging'],
        related_task_id: tasks['Implement query optimization'],
        relation_type: 'DEPENDS_ON',
        updated_at: new Date()
      }
    ]);

    console.log('  ✅ Tasks seeded successfully with complex dependencies');
  } catch (error) {
    console.error('  ❌ Error seeding tasks:', error.message);
    throw error;
  }
}
