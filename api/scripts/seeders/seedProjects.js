import { db } from '../../lib/db/index.js';
import { PROJECTS } from '../../lib/db/schema.js';
import { loadZazzProjectSnapshot } from './zazzSnapshot.js';

export async function seedProjects() {
  console.log('  📝 Seeding projects...');
  try {
    const snapshot = await loadZazzProjectSnapshot();
    const zazzProject = snapshot.project;
    const zedLeaderId = zazzProject.leader_id === 2 ? 3 : 2;

    await db.insert(PROJECTS).values([
      {
        title: zazzProject.title || 'Zazz Board',
        code: zazzProject.code || 'ZAZZ',
        description: zazzProject.description || 'Zazz-Board application development — primary test project',
        leader_id: zazzProject.leader_id || 5,
        next_deliverable_sequence: zazzProject.next_deliverable_sequence || 4,
        status_workflow: Array.isArray(zazzProject.status_workflow) ? zazzProject.status_workflow : ['READY', 'IN_PROGRESS', 'QA', 'COMPLETED'],
        deliverable_status_workflow: Array.isArray(zazzProject.deliverable_status_workflow) ? zazzProject.deliverable_status_workflow : ['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'STAGED', 'DONE'],
        task_graph_layout_direction: zazzProject.task_graph_layout_direction || 'LR',
        completion_criteria_status: zazzProject.completion_criteria_status || 'COMPLETED',
        created_by: zazzProject.created_by || 5
      },
      {
        title: 'Zed Mermaid',
        code: 'ZED_MER',
        description: 'Product-only project for real deliverable creation',
        leader_id: zedLeaderId,
        next_deliverable_sequence: 1,
        status_workflow: ['READY', 'IN_PROGRESS', 'QA', 'COMPLETED'],
        deliverable_status_workflow: ['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'STAGED', 'DONE'],
        task_graph_layout_direction: 'LR',
        completion_criteria_status: 'COMPLETED',
        created_by: zedLeaderId
      }
    ]);
    console.log('  ✅ Projects seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding projects:', error.message);
    throw error;
  }
}
