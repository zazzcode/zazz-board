import { db } from '../../lib/db/index.js';
import { USERS, PROJECTS, DELIVERABLES, TASKS, TAGS, TASK_TAGS, TASK_RELATIONS, IMAGE_METADATA, IMAGE_DATA } from '../../lib/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Validates we're running against a test database
 * @throws {Error} if not in test environment or wrong database
 */
export async function validateTestEnvironment() {
  // Check 1: NODE_ENV must be 'test'
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      `SAFETY CHECK FAILED: Tests must run with NODE_ENV=test (current: ${process.env.NODE_ENV})\n` +
      `Use: npm run test`
    );
  }

  // Check 2: DATABASE_URL_TEST must be set and point to test database
  const testDbUrl = process.env.DATABASE_URL_TEST;
  if (!testDbUrl) {
    throw new Error(
      'SAFETY CHECK FAILED: DATABASE_URL_TEST not set\n' +
      'Add DATABASE_URL_TEST to api/.env'
    );
  }

  const testDbName = testDbUrl.split('/').pop()?.split('?')[0];
  if (testDbName !== 'zazz_board_test') {
    throw new Error(
      `SAFETY CHECK FAILED: DATABASE_URL_TEST must point to 'zazz_board_test' (current: ${testDbName})\n` +
      `Check api/.env configuration`
    );
  }

  // Check 3: Query database to verify we're connected to test database
  try {
    const result = await db.execute(sql`SELECT current_database()`);
    const currentDb = result[0]?.current_database;
    
    if (currentDb !== 'zazz_board_test') {
      throw new Error(
        `SAFETY CHECK FAILED: Connected to wrong database: ${currentDb}\n` +
        `Expected: zazz_board_test`
      );
    }
  } catch (error) {
    if (error.message.includes('SAFETY CHECK FAILED')) {
      throw error;
    }
    // If DB query fails for other reasons, log warning but continue
    console.warn('Warning: Could not verify database name via query:', error.message);
  }
}

/**
 * Clear all task-related data (but keep users/projects for faster tests)
 * Called before each test to ensure isolation
 */
export async function clearTaskData() {
  await validateTestEnvironment();

  // Explicitly clear image tables so image route tests remain isolated.
  await db.delete(IMAGE_DATA);
  await db.delete(IMAGE_METADATA);
  await db.delete(TASK_RELATIONS);
  await db.delete(TASK_TAGS);
  await db.delete(TASKS);
  await db.delete(DELIVERABLES);
}

/**
 * Reset Project 1 (ZAZZ) settings to seeded defaults.
 * Called to ensure test isolation when other tests modify project settings.
 * Tests that need specific project settings (e.g. APIMOD) should set them explicitly.
 */
export async function resetProjectDefaults() {
  await db.update(PROJECTS)
    .set({
      status_workflow: ['READY', 'IN_PROGRESS', 'QA', 'COMPLETED'],
      deliverable_status_workflow: ['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'STAGED', 'DONE'],
      completion_criteria_status: null,
      task_graph_layout_direction: 'LR'
    })
    .where(eq(PROJECTS.id, 1));
}

export async function createTestDeliverable(projectId, overrides = {}) {
  const [project] = await db.select().from(PROJECTS).where(eq(PROJECTS.id, projectId));
  if (!project) {
    throw new Error(`Project with id ${projectId} not found`);
  }

  const [count] = await db.select({ count: sql`COUNT(*)`.as('count') })
    .from(DELIVERABLES)
    .where(eq(DELIVERABLES.project_id, projectId));
  const sequence = parseInt(count.count) + 1;

  const [deliverable] = await db.insert(DELIVERABLES).values({
    project_id: projectId,
    deliverable_id: overrides.deliverableId || `${project.code}-T${sequence}`,
    name: overrides.name || `Test Deliverable ${sequence}`,
    description: overrides.description || null,
    type: overrides.type || 'FEATURE',
    status: overrides.status || 'PLANNING',
    status_history: overrides.statusHistory || [{ status: overrides.status || 'PLANNING', changedAt: new Date().toISOString(), changedBy: 1 }],
    plan_file_path: overrides.planFilePath || null,
    approved_by: overrides.approvedBy || null,
    approved_at: overrides.approvedAt || null,
    position: overrides.position ?? sequence * 10,
    created_by: overrides.createdBy || 1,
    updated_by: overrides.updatedBy || 1
  }).returning();

  return deliverable;
}

export async function createTestTask(projectId, overrides = {}) {
  const deliverableId = overrides.deliverableId || (await createTestDeliverable(projectId)).id;
  const [task] = await db.insert(TASKS).values({
    project_id: projectId,
    deliverable_id: deliverableId,
    title: overrides.title || 'Test Task',
    status: overrides.status || 'READY',
    priority: overrides.priority || 'MEDIUM',
    position: overrides.position !== undefined ? overrides.position : 10,
    agent_name: overrides.agentName || null,
    prompt: overrides.prompt || 'Test prompt',
    is_blocked: overrides.isBlocked || false,
    blocked_reason: overrides.blockedReason || null,
    story_points: overrides.storyPoints || null,
    git_worktree: overrides.gitWorktree || null,
    phase: overrides.phase || null,
    phase_task_id: overrides.phaseTaskId || null,
    notes: overrides.notes || null,
    is_cancelled: overrides.isCancelled || false,
    created_by: overrides.createdBy || 1,
    updated_by: overrides.updatedBy || 1
  }).returning();
  return task;
}

/**
 * Get task by ID
 * @param {number} id - Task ID
 * @returns {Promise<object|null>} Task or null if not found
 */
export async function getTaskById(id) {
  const [task] = await db.select().from(TASKS).where(eq(TASKS.id, id));
  return task || null;
}

export async function getDeliverableById(id) {
  const [deliverable] = await db.select().from(DELIVERABLES).where(eq(DELIVERABLES.id, id));
  return deliverable || null;
}

/**
 * Get all tasks for a project with a specific status
 * @param {number} projectId - Project ID
 * @param {string} status - Task status (READY, IN_PROGRESS, etc.)
 * @returns {Promise<Array>} Array of tasks
 */
export async function getTasksByStatus(projectId, status) {
  return await db.select()
    .from(TASKS)
    .where(
      and(
        eq(TASKS.project_id, projectId),
        eq(TASKS.status, status)
      )
    );
}

/**
 * Create a test task relation
 * @param {number} taskId - Source task ID
 * @param {number} relatedTaskId - Target task ID
 * @param {string} relationType - 'DEPENDS_ON' or 'COORDINATES_WITH'
 * @returns {Promise<object>} Created relation
 */
export async function createTestRelation(taskId, relatedTaskId, relationType) {
  const [relation] = await db.insert(TASK_RELATIONS).values({
    task_id: taskId,
    related_task_id: relatedTaskId,
    relation_type: relationType
  }).returning();
  
  return relation;
}

/**
 * Get all relations for a task
 * @param {number} taskId - Task ID
 * @returns {Promise<Array>} Array of relations
 */
export async function getRelationsForTask(taskId) {
  return await db.select()
    .from(TASK_RELATIONS)
    .where(eq(TASK_RELATIONS.task_id, taskId));
}
