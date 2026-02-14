import { db } from '../../lib/db/index.js';
import { TASK_RELATIONS, TASKS } from '../../lib/db/schema.js';
import { eq } from 'drizzle-orm';

export async function seedTaskRelations() {
  console.log('  📝 Seeding task relations...');
  
  try {
    // APIMOD project tasks are ids 5-13 based on seed insertion order:
    // id=5:  APIMOD-1 (Audit existing API endpoints) — IN_PROGRESS
    // id=6:  APIMOD-2 (Design new REST API architecture) — TO_DO
    // id=7:  APIMOD-3 (Implement authentication middleware) — TO_DO
    // id=8:  APIMOD-4 (Create database migration scripts) — IN_REVIEW
    // id=9:  APIMOD-5 (Write API documentation) — DONE (solo, no deps)
    // id=10: APIMOD-6 (Performance testing and optimization) — TO_DO
    // id=11: APIMOD-7 (Implement API versioning strategy) — TO_DO
    // id=12: APIMOD-8 (Add rate limiting middleware) — TO_DO
    // id=13: APIMOD-9 (Standardize error handling responses) — TO_DO
    //
    // Dependency Graph:
    //
    // APIMOD-1 ──→ APIMOD-2 ──→ APIMOD-3 ─────────────┐
    //          │        ├──→ APIMOD-7 (versioning)      │
    //          │        ├──→ APIMOD-8 (rate limiting)    ├──→ APIMOD-6 (perf testing) [fan-in]
    //          │        └──→ APIMOD-9 (error handling)   │
    //          └──→ APIMOD-4 ────────────────────────────┘
    //
    // Coordination groups:
    //   APIMOD-3 ↔ APIMOD-4 (TEST_TOGETHER) — 2-task group
    //   APIMOD-7 ↔ APIMOD-8 ↔ APIMOD-9 (DEPLOY_TOGETHER) — 3-task group
    //
    // APIMOD-5 is standalone (already DONE, no relations)
    //
    // Scenarios covered:
    //   - Solo task: APIMOD-5
    //   - Sequential chain: 1→2→3→6
    //   - Fan-out: APIMOD-2 → 3, 7, 8, 9
    //   - Fan-in: APIMOD-6 depends on both APIMOD-3 AND APIMOD-4
    //   - 2-task coordination: APIMOD-3 ↔ 4 (TEST_TOGETHER)
    //   - 3-task coordination: APIMOD-7 ↔ 8 ↔ 9 (DEPLOY_TOGETHER)
    //   - Blocked past READY: APIMOD-4 is IN_REVIEW but dep APIMOD-1 only IN_PROGRESS

    // DEPENDS_ON relations
    await db.insert(TASK_RELATIONS).values([
      // Sequential chain: 1→2→3→6
      { task_id: 6, related_task_id: 5, relation_type: 'DEPENDS_ON' },   // APIMOD-2 depends on APIMOD-1
      { task_id: 7, related_task_id: 6, relation_type: 'DEPENDS_ON' },   // APIMOD-3 depends on APIMOD-2
      { task_id: 10, related_task_id: 7, relation_type: 'DEPENDS_ON' },  // APIMOD-6 depends on APIMOD-3

      // Branch from APIMOD-1: APIMOD-4 depends on APIMOD-1
      { task_id: 8, related_task_id: 5, relation_type: 'DEPENDS_ON' },

      // Fan-in at APIMOD-6: also depends on APIMOD-4
      { task_id: 10, related_task_id: 8, relation_type: 'DEPENDS_ON' },  // APIMOD-6 depends on APIMOD-4

      // Fan-out from APIMOD-2: 3-task coordination group depends on Design
      { task_id: 11, related_task_id: 6, relation_type: 'DEPENDS_ON' },  // APIMOD-7 depends on APIMOD-2
      { task_id: 12, related_task_id: 6, relation_type: 'DEPENDS_ON' },  // APIMOD-8 depends on APIMOD-2
      { task_id: 13, related_task_id: 6, relation_type: 'DEPENDS_ON' },  // APIMOD-9 depends on APIMOD-2

      // 2-task coordination: APIMOD-3 ↔ APIMOD-4 (TEST_TOGETHER)
      { task_id: 7, related_task_id: 8, relation_type: 'COORDINATES_WITH' },
      { task_id: 8, related_task_id: 7, relation_type: 'COORDINATES_WITH' },

      // 3-task coordination: APIMOD-7 ↔ APIMOD-8 ↔ APIMOD-9 (DEPLOY_TOGETHER)
      { task_id: 11, related_task_id: 12, relation_type: 'COORDINATES_WITH' },
      { task_id: 12, related_task_id: 11, relation_type: 'COORDINATES_WITH' },
      { task_id: 11, related_task_id: 13, relation_type: 'COORDINATES_WITH' },
      { task_id: 13, related_task_id: 11, relation_type: 'COORDINATES_WITH' },
      { task_id: 12, related_task_id: 13, relation_type: 'COORDINATES_WITH' },
      { task_id: 13, related_task_id: 12, relation_type: 'COORDINATES_WITH' },
    ]);

    // Set coordination_code on 2-task group (APIMOD-3 and APIMOD-4: TEST_TOGETHER)
    await db.update(TASKS)
      .set({ coordination_code: 'TEST_TOGETHER' })
      .where(eq(TASKS.id, 7));
    await db.update(TASKS)
      .set({ coordination_code: 'TEST_TOGETHER' })
      .where(eq(TASKS.id, 8));

    // Set coordination_code on 3-task group (APIMOD-7, 8, 9: DEPLOY_TOGETHER)
    await db.update(TASKS)
      .set({ coordination_code: 'DEPLOY_TOGETHER' })
      .where(eq(TASKS.id, 11));
    await db.update(TASKS)
      .set({ coordination_code: 'DEPLOY_TOGETHER' })
      .where(eq(TASKS.id, 12));
    await db.update(TASKS)
      .set({ coordination_code: 'DEPLOY_TOGETHER' })
      .where(eq(TASKS.id, 13));
    
    console.log('  ✅ Task relations seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding task relations:', error.message);
    throw error;
  }
}
