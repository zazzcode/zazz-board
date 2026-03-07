import { db } from '../../lib/db/index.js';
import { PROJECTS, DELIVERABLES } from '../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { loadZazzProjectSnapshot } from './zazzSnapshot.js';

async function getProjectId(code) {
  const [project] = await db
    .select({ id: PROJECTS.id })
    .from(PROJECTS)
    .where(eq(PROJECTS.code, code))
    .limit(1);

  if (!project) throw new Error(`Project not found: ${code}`);
  return project.id;
}

function toDateOrNull(value) {
  return value ? new Date(value) : null;
}

export async function seedDeliverables() {
  console.log('  📝 Seeding deliverables...');
  try {
    const snapshot = await loadZazzProjectSnapshot();
    const zazzProjectId = await getProjectId('ZAZZ');
    const excludedDeliverableIds = new Set(['ZAZZ-2']);

    const zazzDeliverables = snapshot.deliverables
      .filter((deliverable) => !excludedDeliverableIds.has(deliverable.deliverable_code))
      .map((deliverable, index) => ({
        project_id: zazzProjectId,
        project_code: deliverable.project_code,
        deliverable_code: deliverable.deliverable_code,
        name: deliverable.name,
        description: deliverable.description,
        type: deliverable.type,
        status: deliverable.status,
        position: deliverable.position ?? (index + 1) * 10,
        status_history: deliverable.status_history ?? [],
        spec_filepath: deliverable.spec_filepath,
        plan_filepath: deliverable.plan_filepath,
        approved_by: deliverable.approved_by,
        approved_at: toDateOrNull(deliverable.approved_at),
        git_worktree: deliverable.git_worktree,
        git_branch: deliverable.git_branch,
        pull_request_url: deliverable.pull_request_url,
        created_by: deliverable.created_by ?? 5,
        created_at: toDateOrNull(deliverable.created_at) || new Date(),
        updated_by: deliverable.updated_by,
        updated_at: toDateOrNull(deliverable.updated_at) || new Date(),
      }));

    await db.insert(DELIVERABLES).values([
      ...zazzDeliverables
    ]);
    console.log('  ✅ Deliverables seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding deliverables:', error.message);
    throw error;
  }
}
