import { db } from '../../lib/db/index.js';
import { TASK_RELATIONS, TASKS } from '../../lib/db/schema.js';
import { eq } from 'drizzle-orm';

export async function seedTaskRelations() {
  console.log('  📝 Seeding task relations...');
  
  try {
    // ══════════════════════════════════════════════════════════════
    // APIMOD project tasks (ids 5-18 based on seed insertion order)
    // ══════════════════════════════════════════════════════════════
    // id=5:  APIMOD-1  (Audit existing API endpoints) — IN_PROGRESS
    // id=6:  APIMOD-2  (Design new REST API architecture) — TO_DO
    // id=7:  APIMOD-3  (Implement authentication middleware) — TO_DO
    // id=8:  APIMOD-4  (Create database migration scripts) — IN_REVIEW
    // id=9:  APIMOD-5  (Write API documentation) — READY (solo)
    // id=10: APIMOD-6  (Performance testing and optimization) — TO_DO
    // id=11: APIMOD-7  (Implement API versioning strategy) — TO_DO
    // id=12: APIMOD-8  (Add rate limiting middleware) — TO_DO
    // id=13: APIMOD-9  (Standardize error handling responses) — TO_DO
    // id=14: APIMOD-10 (Build response caching layer) — TO_DO
    // id=15: APIMOD-11 (Setup structured request logging) — TO_DO
    // id=16: APIMOD-12 (End-to-end integration testing) — TO_DO
    // id=17: APIMOD-13 (API gateway configuration) — TO_DO
    // id=18: APIMOD-14 (Production deployment readiness) — TO_DO
    //
    // Dependency Graph (7-wide fan-out at depth 2):
    //
    //                        ┌──→ APIMOD-3  ─┐ (TEST_TOGETHER)
    //                        ├──→ APIMOD-4  ─┤──→ APIMOD-6 (perf testing) ──┐
    // APIMOD-1 ──→ APIMOD-2 ─┼──→ APIMOD-7  ─┐                              │
    //                        ├──→ APIMOD-8  ─┤ (DEPLOY_TOGETHER)            ├──→ APIMOD-14 (deploy)
    //                        ├──→ APIMOD-9  ─┘──→ APIMOD-12 (E2E) ─────────┤
    //                        ├──→ APIMOD-10 ─┐──→ APIMOD-13 (gateway) ─────┘
    //                        └──→ APIMOD-11 ─┘
    //
    // APIMOD-5 is standalone (solo, no relations)
    //
    // ══════════════════════════════════════════════════════════════
    // WEBRED project tasks (ids 19-25)
    // ══════════════════════════════════════════════════════════════
    // id=1:  WEBRED-1 (Design mockups) — READY
    // id=2:  WEBRED-2 (Responsive navigation) — IN_PROGRESS
    // id=19: WEBRED-3 (Setup component library) — TO_DO
    // id=20: WEBRED-4 (Header component) — TO_DO
    // id=21: WEBRED-5 (Footer component) — TO_DO
    // id=22: WEBRED-6 (Sidebar navigation) — TO_DO
    // id=23: WEBRED-7 (Hero section) — TO_DO
    // id=24: WEBRED-8 (Integration testing) — TO_DO
    // id=25: WEBRED-9 (Cross-browser QA) — TO_DO
    //
    // Graph (4-wide fan-out):
    // WEBRED-1 ──→ WEBRED-3 ──→ { 4, 5, 6, 7 } ──→ WEBRED-8 ──→ WEBRED-9
    // WEBRED-2 (solo, already IN_PROGRESS)

    // ── APIMOD DEPENDS_ON ────────────────────────────────────────
    await db.insert(TASK_RELATIONS).values([
      // Sequential chain: 1→2
      { task_id: 6, related_task_id: 5, relation_type: 'DEPENDS_ON' },   // APIMOD-2 depends on APIMOD-1

      // 7-wide fan-out from APIMOD-2 (all depend on APIMOD-2 except APIMOD-4 which depends on APIMOD-1)
      { task_id: 7, related_task_id: 6, relation_type: 'DEPENDS_ON' },   // APIMOD-3 depends on APIMOD-2
      { task_id: 8, related_task_id: 5, relation_type: 'DEPENDS_ON' },   // APIMOD-4 depends on APIMOD-1 (bumped to depth 2 via coordination)
      { task_id: 11, related_task_id: 6, relation_type: 'DEPENDS_ON' },  // APIMOD-7 depends on APIMOD-2
      { task_id: 12, related_task_id: 6, relation_type: 'DEPENDS_ON' },  // APIMOD-8 depends on APIMOD-2
      { task_id: 13, related_task_id: 6, relation_type: 'DEPENDS_ON' },  // APIMOD-9 depends on APIMOD-2
      { task_id: 14, related_task_id: 6, relation_type: 'DEPENDS_ON' },  // APIMOD-10 depends on APIMOD-2
      { task_id: 15, related_task_id: 6, relation_type: 'DEPENDS_ON' },  // APIMOD-11 depends on APIMOD-2

      // Fan-in: APIMOD-6 depends on APIMOD-3 + APIMOD-4
      { task_id: 10, related_task_id: 7, relation_type: 'DEPENDS_ON' },  // APIMOD-6 depends on APIMOD-3
      { task_id: 10, related_task_id: 8, relation_type: 'DEPENDS_ON' },  // APIMOD-6 depends on APIMOD-4

      // Fan-in: APIMOD-12 depends on APIMOD-7 + APIMOD-8 + APIMOD-9
      { task_id: 16, related_task_id: 11, relation_type: 'DEPENDS_ON' }, // APIMOD-12 depends on APIMOD-7
      { task_id: 16, related_task_id: 12, relation_type: 'DEPENDS_ON' }, // APIMOD-12 depends on APIMOD-8
      { task_id: 16, related_task_id: 13, relation_type: 'DEPENDS_ON' }, // APIMOD-12 depends on APIMOD-9

      // Fan-in: APIMOD-13 depends on APIMOD-10 + APIMOD-11
      { task_id: 17, related_task_id: 14, relation_type: 'DEPENDS_ON' }, // APIMOD-13 depends on APIMOD-10
      { task_id: 17, related_task_id: 15, relation_type: 'DEPENDS_ON' }, // APIMOD-13 depends on APIMOD-11

      // Final convergence: APIMOD-14 depends on APIMOD-6, 12, 13
      { task_id: 18, related_task_id: 10, relation_type: 'DEPENDS_ON' }, // APIMOD-14 depends on APIMOD-6
      { task_id: 18, related_task_id: 16, relation_type: 'DEPENDS_ON' }, // APIMOD-14 depends on APIMOD-12
      { task_id: 18, related_task_id: 17, relation_type: 'DEPENDS_ON' }, // APIMOD-14 depends on APIMOD-13

      // ── APIMOD COORDINATES_WITH ─────────────────────────────────
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

      // ── WEBRED DEPENDS_ON ──────────────────────────────────────
      // WEBRED-3 depends on WEBRED-1 (design mockups)
      { task_id: 19, related_task_id: 1, relation_type: 'DEPENDS_ON' },

      // 4-wide fan-out from WEBRED-3
      { task_id: 20, related_task_id: 19, relation_type: 'DEPENDS_ON' },  // WEBRED-4 depends on WEBRED-3
      { task_id: 21, related_task_id: 19, relation_type: 'DEPENDS_ON' },  // WEBRED-5 depends on WEBRED-3
      { task_id: 22, related_task_id: 19, relation_type: 'DEPENDS_ON' },  // WEBRED-6 depends on WEBRED-3
      { task_id: 23, related_task_id: 19, relation_type: 'DEPENDS_ON' },  // WEBRED-7 depends on WEBRED-3

      // Fan-in: WEBRED-8 depends on all 4 components
      { task_id: 24, related_task_id: 20, relation_type: 'DEPENDS_ON' },  // WEBRED-8 depends on WEBRED-4
      { task_id: 24, related_task_id: 21, relation_type: 'DEPENDS_ON' },  // WEBRED-8 depends on WEBRED-5
      { task_id: 24, related_task_id: 22, relation_type: 'DEPENDS_ON' },  // WEBRED-8 depends on WEBRED-6
      { task_id: 24, related_task_id: 23, relation_type: 'DEPENDS_ON' },  // WEBRED-8 depends on WEBRED-7

      // WEBRED-9 depends on WEBRED-8
      { task_id: 25, related_task_id: 24, relation_type: 'DEPENDS_ON' },  // WEBRED-9 depends on WEBRED-8
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
