import { db } from '../../lib/db/index.js';
import { DELIVERABLES } from '../../lib/db/schema.js';

export async function seedDeliverables() {
  console.log('  📝 Seeding deliverables...');
  try {
    await db.insert(DELIVERABLES).values([
      {
        project_id: 1,
        deliverable_id: 'ZAZZ-1',
        name: 'Deliverables Feature',
        description: 'Add deliverable entity, Kanban board, and task graph swim lanes',
        type: 'FEATURE',
        status: 'IN_PROGRESS',
        position: 10,
        status_history: [
          { status: 'PLANNING', changedAt: '2026-01-15T10:00:00Z', changedBy: 5 },
          { status: 'IN_PROGRESS', changedAt: '2026-01-20T14:30:00Z', changedBy: 5 }
        ],
        ded_file_path: 'docs/deliverables_feature_DED.md',
        plan_file_path: 'docs/deliverables_feature_plan.md',
        approved_by: 5,
        approved_at: new Date('2026-01-20T14:30:00Z'),
        git_worktree: 'deliverables-mvp',
        git_branch: 'deliverables-mvp',
        created_by: 5
      },
      {
        project_id: 1,
        deliverable_id: 'ZAZZ-2',
        name: 'Agent Skill Framework',
        description: 'Define and register agent skills for task creation and QA',
        type: 'FEATURE',
        status: 'PLANNING',
        position: 20,
        status_history: [{ status: 'PLANNING', changedAt: '2026-02-10T09:00:00Z', changedBy: 5 }],
        ded_file_path: 'docs/agent-skills-DED.md',
        created_by: 5
      },
      {
        project_id: 1,
        deliverable_id: 'ZAZZ-3',
        name: 'Fix Tag Validation Bug',
        description: 'Tags with trailing hyphens bypass API validation',
        type: 'BUG_FIX',
        status: 'IN_REVIEW',
        position: 30,
        status_history: [
          { status: 'PLANNING', changedAt: '2026-02-01T10:00:00Z', changedBy: 5 },
          { status: 'IN_PROGRESS', changedAt: '2026-02-02T09:00:00Z', changedBy: 5 },
          { status: 'IN_REVIEW', changedAt: '2026-02-05T16:00:00Z', changedBy: null }
        ],
        ded_file_path: 'docs/fix-tag-validation-DED.md',
        plan_file_path: 'docs/fix-tag-validation-plan.md',
        approved_by: 5,
        approved_at: new Date('2026-02-02T09:00:00Z'),
        git_worktree: 'fix-tag-validation',
        git_branch: 'fix-tag-validation',
        pull_request_url: 'https://github.com/michaelwitz/task-blaster/pull/12',
        created_by: 5
      },
      {
        project_id: 2,
        deliverable_id: 'MOBDEV-1',
        name: 'Auth Screens',
        description: 'Login, registration, and password reset screens',
        type: 'FEATURE',
        status: 'IN_PROGRESS',
        position: 10,
        status_history: [
          { status: 'PLANNING', changedAt: '2026-01-20T08:00:00Z', changedBy: 2 },
          { status: 'IN_PROGRESS', changedAt: '2026-01-25T10:00:00Z', changedBy: 2 }
        ],
        ded_file_path: 'docs/mobdev-auth-screens-DED.md',
        plan_file_path: 'docs/mobdev-auth-screens-plan.md',
        approved_by: 2,
        approved_at: new Date('2026-01-25T10:00:00Z'),
        git_worktree: 'auth-screens',
        git_branch: 'auth-screens',
        created_by: 2
      },
      {
        project_id: 3,
        deliverable_id: 'APIMOD-1',
        name: 'REST Endpoint Migration',
        description: 'Migrate legacy endpoints to modern REST with OpenAPI spec',
        type: 'REFACTOR',
        status: 'IN_PROGRESS',
        position: 10,
        status_history: [
          { status: 'PLANNING', changedAt: '2026-01-05T08:00:00Z', changedBy: 3 },
          { status: 'IN_PROGRESS', changedAt: '2026-01-12T11:00:00Z', changedBy: 3 }
        ],
        ded_file_path: 'docs/apimod-rest-migration-DED.md',
        plan_file_path: 'docs/apimod-rest-migration-plan.md',
        approved_by: 3,
        approved_at: new Date('2026-01-12T11:00:00Z'),
        git_worktree: 'rest-migration',
        git_branch: 'rest-migration',
        created_by: 3
      },
      {
        project_id: 3,
        deliverable_id: 'APIMOD-2',
        name: 'Fix Auth Token Expiry',
        description: 'Tokens not expiring correctly under high concurrency',
        type: 'BUG_FIX',
        status: 'PROD',
        position: 20,
        status_history: [
          { status: 'PLANNING', changedAt: '2026-01-28T10:00:00Z', changedBy: 3 },
          { status: 'IN_PROGRESS', changedAt: '2026-01-29T09:00:00Z', changedBy: 3 },
          { status: 'IN_REVIEW', changedAt: '2026-02-01T16:00:00Z', changedBy: null },
          { status: 'UAT', changedAt: '2026-02-02T11:00:00Z', changedBy: 3 },
          { status: 'STAGED', changedAt: '2026-02-03T10:00:00Z', changedBy: 3 },
          { status: 'PROD', changedAt: '2026-02-05T14:00:00Z', changedBy: 3 }
        ],
        ded_file_path: 'docs/apimod-auth-token-fix-DED.md',
        plan_file_path: 'docs/apimod-auth-token-fix-plan.md',
        approved_by: 3,
        approved_at: new Date('2026-01-29T09:00:00Z'),
        git_worktree: 'fix-auth-token-expiry',
        git_branch: 'fix-auth-token-expiry',
        pull_request_url: 'https://github.com/michaelwitz/task-blaster/pull/8',
        created_by: 3
      }
    ]);
    console.log('  ✅ Deliverables seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding deliverables:', error.message);
    throw error;
  }
}
