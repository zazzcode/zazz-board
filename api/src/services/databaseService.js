import { eq, and, sql, asc, like, or, inArray } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import {
  USERS,
  PROJECTS,
  DELIVERABLES,
  DELIVERABLE_RELATIONS,
  MILESTONES,
  PROJECT_GANTT_SETTINGS,
  TASKS,
  TAGS,
  TASK_TAGS,
  IMAGE_METADATA,
  IMAGE_DATA,
  STATUS_DEFINITIONS,
  TRANSLATIONS,
  TASK_RELATIONS,
  COORDINATION_TYPES,
  FILE_LOCKS,
  AGENT_TOKENS,
} from '../../lib/db/schema.js';
import { getRandomTagColor } from '../utils/tagColors.js';
import { randomUUID } from 'crypto';

/**
 * @typedef {import('../types.js').User} User
 * @typedef {import('../types.js').Project} Project
 * @typedef {import('../types.js').Deliverable} Deliverable
 * @typedef {import('../types.js').Task} Task
 * @typedef {import('../types.js').Tag} Tag
 * @typedef {import('../types.js').StatusDefinition} StatusDefinition
 * @typedef {import('../types.js').FileLock} FileLock
 * @typedef {import('../types.js').ImageMetadata} ImageMetadata
 * @typedef {import('../types.js').TaskRelationType} TaskRelationType
 */

const DEFAULT_GANTT_START_DATE = '2026-06-01';
const DEFAULT_GANTT_END_DATE = '2026-08-14';
const DEFAULT_GANTT_PERIOD_START_DATE = '2026-01-04';

function toDateOnly(/** @type {string|Date|null|undefined} */ value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function addDays(/** @type {string|Date|null|undefined} */ value, /** @type {number} */ days) {
  const date = value ? new Date(value) : new Date(`${DEFAULT_GANTT_START_DATE}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function getTimelineFromSettings(/** @type {any} */ settings) {
  /** @type {Record<string, string>} */
  const unitMap = {
    dates: 'date',
    weeks: 'week',
    sprint: 'sprint',
  };

  return {
    unit: unitMap[settings.timelineMode] || 'sprint',
    showDateLabels: settings.showDateLabels,
    showDefaultMilestone: settings.showDefaultMilestone,
    showMonthHeader: settings.showMonthHeader,
    showSprintHeader: settings.showSprintHeader,
    showWeekHeader: settings.showWeekHeader,
    periodStartDate: settings.periodStartDate,
    periodNumberStart: settings.periodNumberStart,
    sprintStartDate: settings.periodStartDate,
    sprintLengthWeeks: settings.sprintLengthWeeks,
    sprintLabelPrefix: settings.sprintLabelPrefix,
    weekLabelPrefix: settings.weekLabelPrefix,
  };
}

function getStatusCategory(/** @type {string} */ status, /** @type {boolean} */ blocked = false) {
  if (blocked) return 'BLOCKED';
  if (['DONE', 'COMPLETED'].includes(status)) return 'COMPLETED';
  if (['IN_PROGRESS', 'IN_REVIEW', 'QA', 'STAGED'].includes(status)) return 'IN_PROGRESS';
  return 'NOT_STARTED';
}

function isCompletedStatus(/** @type {string} */ status) {
  return ['DONE', 'COMPLETED'].includes(status);
}

function getProgress(/** @type {number} */ completedCount, /** @type {number} */ totalCount, /** @type {number} */ fallback = 0) {
  if (!totalCount) return fallback;
  return Math.round((completedCount / totalCount) * 100);
}

/**
 * Database Service
 * Comprehensive service layer for all database operations.
 * Uses Drizzle ORM aliasing for snake_case to camelCase field mapping.
 */
class DatabaseService {
  
// ==================== USER OPERATIONS ====================
  
  /**
   * Get all users with optional search
   */
  async getUsers(/** @type {any} */ searchTerm = null) {
    /** @type {any} */
    let query = db.select({
      id: USERS.id,
      fullName: USERS.full_name,
      email: USERS.email,
      createdAt: USERS.created_at,
      updatedAt: USERS.updated_at
    }).from(USERS);
    
    if (searchTerm) {
      query = query.where(
        or(
          like(USERS.full_name, `%${searchTerm}%`),
          like(USERS.email, `%${searchTerm}%`)
        )
      );
    }
    
    return await query.orderBy(asc(USERS.full_name));
  }

  /**
   * Get user by ID
   * @param {number} id - User primary key.
   * @returns {Promise<User|null>} User contract or null when not found.
   */
  async getUserById(/** @type {number} */ id) {
    const [user] = await db.select({
      id: USERS.id,
      fullName: USERS.full_name,
      email: USERS.email,
      createdAt: USERS.created_at,
      updatedAt: USERS.updated_at
    })
    .from(USERS)
    .where(eq(USERS.id, id))
    .limit(1);
    
    return user || null;
  }

  /**
   * Create new user
   */
  async createUser(/** @type {any} */ userData) {
    const [user] = await db.insert(USERS)
      .values({
        full_name: userData.fullName,
        email: userData.email,
        access_token: userData.accessToken || randomUUID()
      })
      .returning();
    
    return user;
  }

  /**
   * Update user
   */
  async updateUser(/** @type {any} */ id, /** @type {any} */ userData) {
    const updateData = {};
    if (userData.fullName !== undefined) updateData.full_name = userData.fullName;
    if (userData.email !== undefined) updateData.email = userData.email;
    
    const [user] = await db.update(USERS)
      .set(updateData)
      .where(eq(USERS.id, id))
      .returning();
    
    return user || null;
  }

  /**
   * Delete user
   */
  async deleteUser(/** @type {any} */ id) {
    const [user] = await db.delete(USERS)
      .where(eq(USERS.id, id))
      .returning();
    
    return user || null;
  }

  // ==================== PROJECT OPERATIONS ====================

  /**
   * Get all projects with leader info and task counts
   */
  async getProjectsWithDetails() {
    const projects = await db.select({
      id: PROJECTS.id,
      title: PROJECTS.title,
      code: PROJECTS.code,
      description: PROJECTS.description,
      leaderId: PROJECTS.leader_id,
      leaderName: USERS.full_name,
      leaderEmail: USERS.email,
      statusWorkflow: PROJECTS.status_workflow,
      deliverableStatusWorkflow: PROJECTS.deliverable_status_workflow,
      nextDeliverableSequence: PROJECTS.next_deliverable_sequence,
      completionCriteriaStatus: PROJECTS.completion_criteria_status,
      taskGraphLayoutDirection: PROJECTS.task_graph_layout_direction,
      createdAt: PROJECTS.created_at,
      updatedAt: PROJECTS.updated_at,
      taskCount: sql`COUNT(DISTINCT ${TASKS.id})`.as('taskCount'),
      deliverableCount: sql`COUNT(DISTINCT ${DELIVERABLES.id})`.as('deliverableCount')
    })
    .from(PROJECTS)
    .leftJoin(USERS, eq(PROJECTS.leader_id, USERS.id))
    .leftJoin(DELIVERABLES, eq(PROJECTS.id, DELIVERABLES.project_id))
    .leftJoin(TASKS, eq(PROJECTS.id, TASKS.project_id))
    .groupBy(
      PROJECTS.id, 
      PROJECTS.title, 
      PROJECTS.code,
      PROJECTS.description, 
      PROJECTS.leader_id,
      PROJECTS.status_workflow,
      PROJECTS.deliverable_status_workflow,
      PROJECTS.completion_criteria_status,
      PROJECTS.task_graph_layout_direction,
      PROJECTS.created_at,
      PROJECTS.updated_at,
      USERS.full_name,
      USERS.email
    )
    .orderBy(asc(PROJECTS.title));

    return projects;
  }

  /**
   * Get project by ID with full details
   */
  async getProjectById(/** @type {any} */ id) {
    const [project] = await db.select({
      id: PROJECTS.id,
      title: PROJECTS.title,
      code: PROJECTS.code,
      description: PROJECTS.description,
      leaderId: PROJECTS.leader_id,
      leaderName: USERS.full_name,
      leaderEmail: USERS.email,
      statusWorkflow: PROJECTS.status_workflow,
      deliverableStatusWorkflow: PROJECTS.deliverable_status_workflow,
      nextDeliverableSequence: PROJECTS.next_deliverable_sequence,
      completionCriteriaStatus: PROJECTS.completion_criteria_status,
      taskGraphLayoutDirection: PROJECTS.task_graph_layout_direction,
      createdAt: PROJECTS.created_at,
      updatedAt: PROJECTS.updated_at
    })
    .from(PROJECTS)
    .leftJoin(USERS, eq(PROJECTS.leader_id, USERS.id))
    .where(eq(PROJECTS.id, id))
    .limit(1);

    return project || null;
  }

  /**
   * Get project by code
   * @param {string} code - Immutable project code.
   * @returns {Promise<Project|null>} Project contract or null when not found.
   */
  async getProjectByCode(/** @type {string} */ code) {
    const [project] = await db.select({
      id: PROJECTS.id,
      title: PROJECTS.title,
      code: PROJECTS.code,
      description: PROJECTS.description,
      leaderId: PROJECTS.leader_id,
      leaderName: USERS.full_name,
      leaderEmail: USERS.email,
      statusWorkflow: PROJECTS.status_workflow,
      deliverableStatusWorkflow: PROJECTS.deliverable_status_workflow,
      nextDeliverableSequence: PROJECTS.next_deliverable_sequence,
      completionCriteriaStatus: PROJECTS.completion_criteria_status,
      taskGraphLayoutDirection: PROJECTS.task_graph_layout_direction,
      createdAt: PROJECTS.created_at,
      updatedAt: PROJECTS.updated_at
    })
    .from(PROJECTS)
    .leftJoin(USERS, eq(PROJECTS.leader_id, USERS.id))
    .where(eq(PROJECTS.code, code))
    .limit(1);

    return project || null;
  }

  /**
   * Create new project
   */
  async createProject(/** @type {any} */ projectData) {
    const project = await db.transaction(async (/** @type {any} */ tx) => {
      const [created] = await tx.insert(PROJECTS).values({
        title: projectData.title,
        code: projectData.code,
        description: projectData.description,
        leader_id: projectData.leaderId,
        status_workflow: projectData.statusWorkflow || ['READY', 'IN_PROGRESS', 'QA', 'COMPLETED'],
        deliverable_status_workflow: projectData.deliverableStatusWorkflow || ['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'STAGED', 'DONE']
      }).returning();

      await tx.insert(MILESTONES).values({
        project_id: created.id,
        start_date: DEFAULT_GANTT_START_DATE,
        end_date: DEFAULT_GANTT_END_DATE,
        is_default: true,
        status: 'PLANNING',
        created_by: projectData.leaderId,
        updated_by: projectData.leaderId,
      });

      await tx.insert(PROJECT_GANTT_SETTINGS).values({
        project_id: created.id,
        timeline_mode: 'sprint',
        show_date_labels: false,
        show_default_milestone: false,
        show_month_header: true,
        show_sprint_header: true,
        show_week_header: true,
        period_start_date: DEFAULT_GANTT_PERIOD_START_DATE,
        sprint_length_weeks: 2,
        period_number_start: 1,
        sprint_label_prefix: 'Sprint',
        week_label_prefix: 'W',
        created_by: projectData.leaderId,
        updated_by: projectData.leaderId,
      });

      return created;
    });
    
    return project;
  }

  /**
   * Update project - Project codes are immutable after creation
   */
  async updateProject(/** @type {any} */ id, /** @type {any} */ projectData) {
    const updateData = {};
    if (projectData.title !== undefined) updateData.title = projectData.title;
    // Project codes are immutable - cannot be updated after creation
    if (projectData.description !== undefined) updateData.description = projectData.description;
    if (projectData.leaderId !== undefined) updateData.leader_id = projectData.leaderId;
    if (projectData.statusWorkflow !== undefined) updateData.status_workflow = projectData.statusWorkflow;
    if (projectData.deliverableStatusWorkflow !== undefined) updateData.deliverable_status_workflow = projectData.deliverableStatusWorkflow;
    if (projectData.completionCriteriaStatus !== undefined) updateData.completion_criteria_status = projectData.completionCriteriaStatus;
    if (projectData.taskGraphLayoutDirection !== undefined) updateData.task_graph_layout_direction = projectData.taskGraphLayoutDirection;
    
    // Check if there are any values to update
    if (Object.keys(updateData).length === 0) {
      throw new Error('No values to update');
    }
    
    updateData.updated_at = new Date();
    
    const [project] = await db.update(PROJECTS)
      .set(updateData)
      .where(eq(PROJECTS.id, id))
      .returning();
    
    return project || null;
  }

  /**
   * Delete project and all associated tasks/tags
   */
  async deleteProject(/** @type {any} */ id) {
    // First delete task-tag relationships for this project's tasks
    const projectTasks = await db.select({ id: TASKS.id })
      .from(TASKS)
      .where(eq(TASKS.project_id, id));

    if (projectTasks.length > 0) {
      const taskIds = projectTasks.map(task => task.id);
      await db.delete(TASK_TAGS)
        .where(inArray(TASK_TAGS.task_id, taskIds));
    }
    
    // Then delete tasks
    await db.delete(TASKS).where(eq(TASKS.project_id, id));
    
    // Finally delete the project
    const [project] = await db.delete(PROJECTS)
      .where(eq(PROJECTS.id, id))
      .returning();
    
    return project || null;
  }

  /**
   * Get project's status workflow
   */
  async getProjectStatusWorkflow(/** @type {any} */ projectId) {
    const [project] = await db.select({
      id: PROJECTS.id,
      code: PROJECTS.code,
      statusWorkflow: PROJECTS.status_workflow
    })
    .from(PROJECTS)
    .where(eq(PROJECTS.id, projectId))
    .limit(1);

    return project || null;
  }

  /**
   * Update project's status workflow
   */
  async updateProjectStatusWorkflow(/** @type {any} */ projectId, /** @type {any} */ statusWorkflow, /** @type {any} */ updatedBy) {
    const [project] = await db.update(PROJECTS)
      .set({ 
        status_workflow: statusWorkflow,
        updated_by: updatedBy,
        updated_at: new Date()
      })
      .where(eq(PROJECTS.id, projectId))
      .returning();
    
    return project || null;
  }

  /**
   * Check if any tasks in project use a specific status
   */
  async hasTasksWithStatus(/** @type {any} */ projectId, /** @type {any} */ status) {
    const [result] = await db.select({ 
      count: sql`COUNT(*)`.as('count') 
    })
    .from(TASKS)
    .where(
      and(
        eq(TASKS.project_id, projectId),
        eq(TASKS.status, status)
      )
    );
    
    return parseInt(result.count) > 0;
  }

  async hasDeliverablesWithStatus(/** @type {any} */ projectId, /** @type {any} */ status) {
    const [result] = await db.select({
      count: sql`COUNT(*)`.as('count')
    })
    .from(DELIVERABLES)
    .where(and(eq(DELIVERABLES.project_id, projectId), eq(DELIVERABLES.status, status)));

    return parseInt(result.count) > 0;
  }

  async getProjectDeliverableStatusWorkflow(/** @type {any} */ projectId) {
    const [project] = await db.select({
      id: PROJECTS.id,
      code: PROJECTS.code,
      deliverableStatusWorkflow: PROJECTS.deliverable_status_workflow
    })
    .from(PROJECTS)
    .where(eq(PROJECTS.id, projectId))
    .limit(1);
    return project || null;
  }

  async updateProjectDeliverableStatusWorkflow(/** @type {any} */ projectId, /** @type {any} */ deliverableStatusWorkflow, /** @type {any} */ updatedBy) {
    const [project] = await db.update(PROJECTS)
      .set({
        deliverable_status_workflow: deliverableStatusWorkflow,
        updated_by: updatedBy,
        updated_at: new Date()
      })
      .where(eq(PROJECTS.id, projectId))
      .returning();
    return project || null;
  }

  /**
   * @param {number} projectId - Project primary key.
   * @param {number} userId - User primary key.
   * @returns {Promise<object|null>} Agent token rows grouped by user.
   */
  async getAgentTokensForUser(/** @type {number} */ projectId, /** @type {number} */ userId) {
    const user = await this.getUserById(userId);
    if (!user) {
      return null;
    }

    const tokens = await db.select({
      id: AGENT_TOKENS.id,
      token: AGENT_TOKENS.token,
      label: AGENT_TOKENS.label,
      createdAt: AGENT_TOKENS.created_at,
    })
      .from(AGENT_TOKENS)
      .where(and(eq(AGENT_TOKENS.project_id, projectId), eq(AGENT_TOKENS.user_id, userId)))
      .orderBy(asc(AGENT_TOKENS.created_at), asc(AGENT_TOKENS.id));

    return {
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      tokens,
    };
  }

  async getAgentTokensForProject(/** @type {any} */ projectId) {
    const [users, tokenRows] = await Promise.all([
      this.getUsers(),
      db.select({
        id: AGENT_TOKENS.id,
        userId: AGENT_TOKENS.user_id,
        token: AGENT_TOKENS.token,
        label: AGENT_TOKENS.label,
        createdAt: AGENT_TOKENS.created_at,
      })
        .from(AGENT_TOKENS)
        .where(eq(AGENT_TOKENS.project_id, projectId))
        .orderBy(asc(AGENT_TOKENS.user_id), asc(AGENT_TOKENS.created_at), asc(AGENT_TOKENS.id)),
    ]);

    const tokensByUserId = new Map();
    for (const tokenRow of tokenRows) {
      if (!tokensByUserId.has(tokenRow.userId)) {
        tokensByUserId.set(tokenRow.userId, []);
      }
      tokensByUserId.get(tokenRow.userId).push({
        id: tokenRow.id,
        token: tokenRow.token,
        label: tokenRow.label,
        createdAt: tokenRow.createdAt,
      });
    }

    return users.map((/** @type {any} */ user) => ({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      tokens: tokensByUserId.get(user.id) || [],
    }));
  }

  async getAgentTokenById(/** @type {any} */ id) {
    const [token] = await db.select({
      id: AGENT_TOKENS.id,
      userId: AGENT_TOKENS.user_id,
      projectId: AGENT_TOKENS.project_id,
      token: AGENT_TOKENS.token,
      label: AGENT_TOKENS.label,
      createdAt: AGENT_TOKENS.created_at,
      userEmail: USERS.email,
      userFullName: USERS.full_name,
      projectCode: PROJECTS.code,
    })
      .from(AGENT_TOKENS)
      .innerJoin(USERS, eq(AGENT_TOKENS.user_id, USERS.id))
      .innerJoin(PROJECTS, eq(AGENT_TOKENS.project_id, PROJECTS.id))
      .where(eq(AGENT_TOKENS.id, id))
      .limit(1);

    return token || null;
  }

  async createAgentToken(/** @type {any} */ projectId, /** @type {any} */ userId, /** @type {any} */ label = null) {
    const project = await this.getProjectById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const [created] = await db.insert(AGENT_TOKENS)
      .values({
        user_id: userId,
        project_id: projectId,
        token: randomUUID(),
        label: label ?? null,
      })
      .returning({
        id: AGENT_TOKENS.id,
        token: AGENT_TOKENS.token,
        label: AGENT_TOKENS.label,
        createdAt: AGENT_TOKENS.created_at,
      });

    return {
      ...created,
      userId: user.id,
      userEmail: user.email,
      userFullName: user.fullName,
      projectId: project.id,
      projectCode: project.code,
    };
  }

  async deleteAgentToken(/** @type {any} */ id) {
    const existing = await this.getAgentTokenById(id);
    if (!existing) {
      return null;
    }

    await db.delete(AGENT_TOKENS).where(eq(AGENT_TOKENS.id, id));
    return existing;
  }

  async getDeliverablesForProject(/** @type {any} */ projectId, /** @type {any} */ filters = {}) {
    const conditions = [eq(DELIVERABLES.project_id, projectId)];
    if (filters.status) conditions.push(eq(DELIVERABLES.status, filters.status));
    if (filters.type) conditions.push(eq(DELIVERABLES.type, filters.type));

    const rows = await db.select({
      id: DELIVERABLES.id,
      projectId: DELIVERABLES.project_id,
      milestoneId: DELIVERABLES.milestone_id,
      projectCode: DELIVERABLES.project_code,
      deliverableCode: DELIVERABLES.code,
      name: DELIVERABLES.name,
      description: DELIVERABLES.description,
      type: DELIVERABLES.type,
      status: DELIVERABLES.status,
      statusHistory: DELIVERABLES.status_history,
      specFilepath: DELIVERABLES.spec_filepath,
      planFilepath: DELIVERABLES.plan_filepath,
      approvedBy: DELIVERABLES.approved_by,
      approvedByName: USERS.full_name,
      approvedAt: DELIVERABLES.approved_at,
      gitWorktree: DELIVERABLES.git_worktree,
      gitBranch: DELIVERABLES.git_branch,
      pullRequestUrl: DELIVERABLES.pull_request_url,
      position: DELIVERABLES.position,
      milestonePosition: DELIVERABLES.milestone_position,
      plannedStartAt: DELIVERABLES.planned_start_at,
      plannedCompletionAt: DELIVERABLES.planned_completion_at,
      actualStartAt: DELIVERABLES.actual_start_at,
      actualCompletionAt: DELIVERABLES.actual_completion_at,
      createdBy: DELIVERABLES.created_by,
      createdAt: DELIVERABLES.created_at,
      updatedBy: DELIVERABLES.updated_by,
      updatedAt: DELIVERABLES.updated_at,
      taskCount: sql`COUNT(${TASKS.id})`.as('taskCount'),
      completedTaskCount: sql`COUNT(CASE WHEN ${TASKS.status} = 'COMPLETED' THEN 1 END)`.as('completedTaskCount')
    })
    .from(DELIVERABLES)
    .leftJoin(USERS, eq(DELIVERABLES.approved_by, USERS.id))
    .leftJoin(TASKS, eq(DELIVERABLES.id, TASKS.deliverable_id))
    .where(and(...conditions))
    .groupBy(
      DELIVERABLES.id,
      DELIVERABLES.project_id,
      DELIVERABLES.milestone_id,
      DELIVERABLES.project_code,
      DELIVERABLES.code,
      DELIVERABLES.name,
      DELIVERABLES.description,
      DELIVERABLES.type,
      DELIVERABLES.status,
      DELIVERABLES.status_history,
      DELIVERABLES.spec_filepath,
      DELIVERABLES.plan_filepath,
      DELIVERABLES.approved_by,
      USERS.full_name,
      DELIVERABLES.approved_at,
      DELIVERABLES.git_worktree,
      DELIVERABLES.git_branch,
      DELIVERABLES.pull_request_url,
      DELIVERABLES.position,
      DELIVERABLES.milestone_position,
      DELIVERABLES.planned_start_at,
      DELIVERABLES.planned_completion_at,
      DELIVERABLES.actual_start_at,
      DELIVERABLES.actual_completion_at,
      DELIVERABLES.created_by,
      DELIVERABLES.created_at,
      DELIVERABLES.updated_by,
      DELIVERABLES.updated_at
    )
    .orderBy(asc(DELIVERABLES.position), asc(DELIVERABLES.id));

    return rows;
  }

  /**
   * @param {number} id - Deliverable primary key.
   * @returns {Promise<Deliverable|null>} Deliverable contract or null when not found.
   */
  async getDeliverableById(/** @type {number} */ id) {
    const [deliverable] = await db.select({
      id: DELIVERABLES.id,
      projectId: DELIVERABLES.project_id,
      milestoneId: DELIVERABLES.milestone_id,
      projectCode: DELIVERABLES.project_code,
      deliverableCode: DELIVERABLES.code,
      name: DELIVERABLES.name,
      description: DELIVERABLES.description,
      type: DELIVERABLES.type,
      status: DELIVERABLES.status,
      statusHistory: DELIVERABLES.status_history,
      specFilepath: DELIVERABLES.spec_filepath,
      planFilepath: DELIVERABLES.plan_filepath,
      approvedBy: DELIVERABLES.approved_by,
      approvedByName: USERS.full_name,
      approvedAt: DELIVERABLES.approved_at,
      gitWorktree: DELIVERABLES.git_worktree,
      gitBranch: DELIVERABLES.git_branch,
      pullRequestUrl: DELIVERABLES.pull_request_url,
      position: DELIVERABLES.position,
      milestonePosition: DELIVERABLES.milestone_position,
      plannedStartAt: DELIVERABLES.planned_start_at,
      plannedCompletionAt: DELIVERABLES.planned_completion_at,
      actualStartAt: DELIVERABLES.actual_start_at,
      actualCompletionAt: DELIVERABLES.actual_completion_at,
      createdBy: DELIVERABLES.created_by,
      createdAt: DELIVERABLES.created_at,
      updatedBy: DELIVERABLES.updated_by,
      updatedAt: DELIVERABLES.updated_at,
      taskCount: sql`COUNT(${TASKS.id})`.as('taskCount'),
      completedTaskCount: sql`COUNT(CASE WHEN ${TASKS.status} = 'COMPLETED' THEN 1 END)`.as('completedTaskCount')
    })
    .from(DELIVERABLES)
    .leftJoin(USERS, eq(DELIVERABLES.approved_by, USERS.id))
    .leftJoin(TASKS, eq(DELIVERABLES.id, TASKS.deliverable_id))
    .where(eq(DELIVERABLES.id, id))
    .groupBy(
      DELIVERABLES.id,
      USERS.full_name
    )
    .limit(1);
    return deliverable || null;
  }

  async createDeliverable(/** @type {any} */ projectId, /** @type {any} */ data, /** @type {any} */ userId) {
    const created = await db.transaction(async (/** @type {any} */ tx) => {
      const [project] = await tx.select().from(PROJECTS).where(eq(PROJECTS.id, projectId)).limit(1);
      if (!project) throw new Error('Project not found');

      const generatedCode = `${project.code}-${project.next_deliverable_sequence}`;
      await tx.update(PROJECTS)
        .set({ next_deliverable_sequence: project.next_deliverable_sequence + 1, updated_by: userId, updated_at: new Date() })
        .where(eq(PROJECTS.id, projectId));

      const [maxPosition] = await tx.select({ max: sql`COALESCE(MAX(${DELIVERABLES.position}),0)`.as('max') })
        .from(DELIVERABLES).where(eq(DELIVERABLES.project_id, projectId));
      const nextPosition = Math.floor(maxPosition.max / 10) * 10 + 10;
      const [defaultMilestone] = await tx.select()
        .from(MILESTONES)
        .where(and(eq(MILESTONES.project_id, projectId), eq(MILESTONES.is_default, true)))
        .limit(1);
      if (!defaultMilestone) throw new Error('Default milestone not found');

      const [maxMilestonePosition] = await tx.select({ max: sql`COALESCE(MAX(${DELIVERABLES.milestone_position}),0)`.as('max') })
        .from(DELIVERABLES)
        .where(eq(DELIVERABLES.milestone_id, defaultMilestone.id));
      const nextMilestonePosition = Math.floor(maxMilestonePosition.max / 10) * 10 + 10;
      const plannedStartAt = data.plannedStartAt ? new Date(data.plannedStartAt) : new Date(`${DEFAULT_GANTT_START_DATE}T00:00:00.000Z`);

      const [row] = await tx.insert(DELIVERABLES).values({
        project_id: projectId,
        milestone_id: defaultMilestone.id,
        project_code: project.code,
        code: generatedCode,
        name: data.name,
        description: data.description,
        type: data.type,
        status: 'PLANNING',
        status_history: [{ status: 'PLANNING', changedAt: new Date().toISOString(), changedBy: userId }],
        spec_filepath: data.specFilepath,
        plan_filepath: data.planFilepath,
        git_worktree: data.gitWorktree,
        git_branch: data.gitBranch,
        pull_request_url: data.pullRequestUrl,
        position: nextPosition,
        milestone_position: nextMilestonePosition,
        planned_start_at: plannedStartAt,
        planned_completion_at: data.plannedCompletionAt ? new Date(data.plannedCompletionAt) : addDays(plannedStartAt, 14),
        actual_start_at: data.actualStartAt ? new Date(data.actualStartAt) : null,
        actual_completion_at: data.actualCompletionAt ? new Date(data.actualCompletionAt) : null,
        created_by: userId,
        updated_by: userId
      }).returning();

      return row;
    });

    return await this.getDeliverableById(created.id);
  }

  async updateDeliverable(/** @type {any} */ id, /** @type {any} */ data, /** @type {any} */ userId) {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.specFilepath !== undefined) updateData.spec_filepath = data.specFilepath;
    if (data.planFilepath !== undefined) updateData.plan_filepath = data.planFilepath;
    if (data.gitWorktree !== undefined) updateData.git_worktree = data.gitWorktree;
    if (data.gitBranch !== undefined) updateData.git_branch = data.gitBranch;
    if (data.pullRequestUrl !== undefined) updateData.pull_request_url = data.pullRequestUrl;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.milestonePosition !== undefined) updateData.milestone_position = data.milestonePosition;
    if (data.plannedStartAt !== undefined) updateData.planned_start_at = data.plannedStartAt ? new Date(data.plannedStartAt) : null;
    if (data.plannedCompletionAt !== undefined) updateData.planned_completion_at = data.plannedCompletionAt ? new Date(data.plannedCompletionAt) : null;
    if (data.actualStartAt !== undefined) updateData.actual_start_at = data.actualStartAt ? new Date(data.actualStartAt) : null;
    if (data.actualCompletionAt !== undefined) updateData.actual_completion_at = data.actualCompletionAt ? new Date(data.actualCompletionAt) : null;
    updateData.updated_by = userId;
    updateData.updated_at = new Date();

    const [updated] = await db.update(DELIVERABLES).set(updateData).where(eq(DELIVERABLES.id, id)).returning();
    if (!updated) return null;
    return await this.getDeliverableById(id);
  }

  async deleteDeliverable(/** @type {any} */ id) {
    const [deleted] = await db.delete(DELIVERABLES).where(eq(DELIVERABLES.id, id)).returning();
    return deleted || null;
  }

  async approveDeliverablePlan(/** @type {any} */ id, /** @type {any} */ userId) {
    const deliverable = await this.getDeliverableById(id);
    if (!deliverable) throw new Error('Deliverable not found');
    if (!deliverable.planFilepath) throw new Error('plan_filepath must be set before approval');
    if (deliverable.approvedAt) throw new Error('Deliverable already approved');
    if (deliverable.status !== 'PLANNING') throw new Error('Only PLANNING deliverables can be approved');

    const [updated] = await db.update(DELIVERABLES)
      .set({ approved_by: userId, approved_at: new Date(), updated_by: userId, updated_at: new Date() })
      .where(eq(DELIVERABLES.id, id))
      .returning();
    if (!updated) return null;
    return await this.getDeliverableById(id);
  }

  async updateDeliverableStatus(/** @type {any} */ id, /** @type {any} */ status, /** @type {any} */ userId) {
    const deliverable = await this.getDeliverableById(id);
    if (!deliverable) throw new Error('Deliverable not found');

    const [project] = await db.select({ workflow: PROJECTS.deliverable_status_workflow })
      .from(PROJECTS).where(eq(PROJECTS.id, deliverable.projectId)).limit(1);
    if (!project?.workflow?.includes(status)) throw new Error(`Status ${status} not allowed for this project`);

    const nextHistory = Array.isArray(deliverable.statusHistory) ? [...deliverable.statusHistory] : [];
    nextHistory.push({ status, changedAt: new Date().toISOString(), changedBy: userId });

    /** @type {Record<string, any>} */
    const updateData = {
      status,
      status_history: nextHistory,
      updated_by: userId,
      updated_at: new Date(),
    };

    if (status === 'IN_PROGRESS') {
      if (!deliverable.planFilepath) throw new Error('plan_filepath must be set before moving to IN_PROGRESS');
      if (!deliverable.approvedAt) {
        updateData.approved_by = userId;
        updateData.approved_at = new Date();
      }
    }

    const [updated] = await db.update(DELIVERABLES)
      .set(updateData)
      .where(eq(DELIVERABLES.id, id))
      .returning();
    if (!updated) return null;
    return await this.getDeliverableById(id);
  }

  /**
   * @param {number} deliverableId - Deliverable primary key.
   * @returns {Promise<Task[]>} Tasks in the deliverable.
   */
  async getTasksForDeliverable(/** @type {number} */ deliverableId) {
    return await this.getTasks({ deliverableId });
  }

  // ==================== GANTT / MILESTONE OPERATIONS ====================

  mapMilestoneResponse(/** @type {any} */ milestone, /** @type {number|null} */ ordinal = null) {
    return {
      id: milestone.id,
      projectId: milestone.project_id ?? milestone.projectId,
      startDate: toDateOnly(milestone.start_date ?? milestone.startDate),
      endDate: toDateOnly(milestone.end_date ?? milestone.endDate),
      isDefault: Boolean(milestone.is_default ?? milestone.isDefault),
      status: milestone.status,
      labelKey: (milestone.is_default ?? milestone.isDefault) ? 'gantt.defaultMilestone' : 'gantt.numberedMilestone',
      labelParams: (milestone.is_default ?? milestone.isDefault) ? {} : { number: ordinal },
      createdAt: milestone.created_at ?? milestone.createdAt,
      updatedAt: milestone.updated_at ?? milestone.updatedAt,
    };
  }

  mapGanttSettingsResponse(/** @type {any} */ settings, /** @type {string} */ projectCode) {
    return {
      projectCode,
      timelineMode: settings.timeline_mode ?? settings.timelineMode,
      showDateLabels: settings.show_date_labels ?? settings.showDateLabels,
      showDefaultMilestone: settings.show_default_milestone ?? settings.showDefaultMilestone,
      showMonthHeader: settings.show_month_header ?? settings.showMonthHeader,
      showSprintHeader: settings.show_sprint_header ?? settings.showSprintHeader,
      showWeekHeader: settings.show_week_header ?? settings.showWeekHeader,
      periodStartDate: toDateOnly(settings.period_start_date ?? settings.periodStartDate),
      sprintLengthWeeks: settings.sprint_length_weeks ?? settings.sprintLengthWeeks,
      periodNumberStart: settings.period_number_start ?? settings.periodNumberStart,
      sprintLabelPrefix: settings.sprint_label_prefix ?? settings.sprintLabelPrefix,
      weekLabelPrefix: settings.week_label_prefix ?? settings.weekLabelPrefix,
      updatedAt: settings.updated_at ?? settings.updatedAt,
    };
  }

  async ensureDefaultMilestone(/** @type {number} */ projectId, /** @type {number|null} */ userId = null) {
    const [existing] = await db.select()
      .from(MILESTONES)
      .where(and(eq(MILESTONES.project_id, projectId), eq(MILESTONES.is_default, true)))
      .limit(1);
    if (existing) return existing;

    const [created] = await db.insert(MILESTONES).values({
      project_id: projectId,
      start_date: DEFAULT_GANTT_START_DATE,
      end_date: DEFAULT_GANTT_END_DATE,
      is_default: true,
      status: 'PLANNING',
      created_by: userId,
      updated_by: userId,
    }).returning();
    return created;
  }

  async ensureProjectGanttSettings(/** @type {number} */ projectId, /** @type {number|null} */ userId = null) {
    const [existing] = await db.select()
      .from(PROJECT_GANTT_SETTINGS)
      .where(eq(PROJECT_GANTT_SETTINGS.project_id, projectId))
      .limit(1);
    if (existing) return existing;

    const [created] = await db.insert(PROJECT_GANTT_SETTINGS).values({
      project_id: projectId,
      timeline_mode: 'sprint',
      show_date_labels: false,
      show_default_milestone: false,
      show_month_header: true,
      show_sprint_header: true,
      show_week_header: true,
      period_start_date: DEFAULT_GANTT_PERIOD_START_DATE,
      sprint_length_weeks: 2,
      period_number_start: 1,
      sprint_label_prefix: 'Sprint',
      week_label_prefix: 'W',
      created_by: userId,
      updated_by: userId,
    }).returning();
    return created;
  }

  async getProjectGanttSettings(/** @type {number} */ projectId) {
    const project = await this.getProjectById(projectId);
    if (!project) return null;
    const settings = await this.ensureProjectGanttSettings(projectId, project.leaderId);
    return this.mapGanttSettingsResponse(settings, project.code);
  }

  validateGanttSettings(/** @type {any} */ settings) {
    if (!['dates', 'weeks', 'sprint'].includes(settings.timelineMode)) {
      throw new Error('Invalid timelineMode');
    }
    if (![1, 2, 3].includes(settings.sprintLengthWeeks)) {
      throw new Error('sprintLengthWeeks must be 1, 2, or 3');
    }
    if (!settings.showMonthHeader && !settings.showSprintHeader && !settings.showWeekHeader) {
      throw new Error('At least one Gantt header row must be visible');
    }
    if (settings.periodNumberStart < 0) {
      throw new Error('periodNumberStart must be 0 or greater');
    }
  }

  async updateProjectGanttSettings(/** @type {number} */ projectId, /** @type {any} */ settings, /** @type {number|null} */ userId = null) {
    const project = await this.getProjectById(projectId);
    if (!project) return null;
    this.validateGanttSettings(settings);
    await this.ensureProjectGanttSettings(projectId, userId);

    const [updated] = await db.update(PROJECT_GANTT_SETTINGS)
      .set({
        timeline_mode: settings.timelineMode,
        show_date_labels: settings.showDateLabels,
        show_default_milestone: settings.showDefaultMilestone,
        show_month_header: settings.showMonthHeader,
        show_sprint_header: settings.showSprintHeader,
        show_week_header: settings.showWeekHeader,
        period_start_date: settings.periodStartDate,
        sprint_length_weeks: settings.sprintLengthWeeks,
        period_number_start: settings.periodNumberStart,
        sprint_label_prefix: settings.sprintLabelPrefix,
        week_label_prefix: settings.weekLabelPrefix,
        updated_by: userId,
        updated_at: new Date(),
      })
      .where(eq(PROJECT_GANTT_SETTINGS.project_id, projectId))
      .returning();

    return this.mapGanttSettingsResponse(updated, project.code);
  }

  async getMilestonesForProject(/** @type {number} */ projectId) {
    await this.ensureDefaultMilestone(projectId);
    const rows = await db.select()
      .from(MILESTONES)
      .where(eq(MILESTONES.project_id, projectId))
      .orderBy(sql`CASE WHEN ${MILESTONES.is_default} THEN 0 ELSE 1 END`, asc(MILESTONES.start_date), asc(MILESTONES.end_date), asc(MILESTONES.id));
    let ordinal = 0;
    return rows.map((row) => {
      if (!row.is_default) ordinal += 1;
      return this.mapMilestoneResponse(row, row.is_default ? null : ordinal);
    });
  }

  async createMilestone(/** @type {number} */ projectId, /** @type {any} */ data, /** @type {number|null} */ userId = null) {
    if (data.startDate > data.endDate) throw new Error('startDate must be before or equal to endDate');

    const [created] = await db.insert(MILESTONES).values({
      project_id: projectId,
      start_date: data.startDate,
      end_date: data.endDate,
      is_default: false,
      status: data.status || 'PLANNING',
      created_by: userId,
      updated_by: userId,
    }).returning();

    const milestones = await this.getMilestonesForProject(projectId);
    return milestones.find((milestone) => milestone.id === created.id) || this.mapMilestoneResponse(created);
  }

  async updateMilestone(/** @type {number} */ projectId, /** @type {number} */ milestoneId, /** @type {any} */ data, /** @type {number|null} */ userId = null) {
    const milestone = await this.getMilestoneById(milestoneId);
    if (!milestone || milestone.projectId !== projectId) return null;
    const startDate = data.startDate || milestone.startDate;
    const endDate = data.endDate || milestone.endDate;
    if (startDate > endDate) throw new Error('startDate must be before or equal to endDate');

    const [updated] = await db.update(MILESTONES)
      .set({
        start_date: startDate,
        end_date: endDate,
        status: data.status || milestone.status,
        updated_by: userId,
        updated_at: new Date(),
      })
      .where(eq(MILESTONES.id, milestoneId))
      .returning();
    return updated ? (await this.getMilestonesForProject(projectId)).find((row) => row.id === milestoneId) : null;
  }

  async getMilestoneById(/** @type {number} */ milestoneId) {
    const [row] = await db.select().from(MILESTONES).where(eq(MILESTONES.id, milestoneId)).limit(1);
    return row ? this.mapMilestoneResponse(row) : null;
  }

  async deleteMilestone(/** @type {number} */ projectId, /** @type {number} */ milestoneId) {
    const milestone = await this.getMilestoneById(milestoneId);
    if (!milestone || milestone.projectId !== projectId) return null;
    if (milestone.isDefault) throw new Error('Default milestone cannot be deleted');

    const [count] = await db.select({ count: sql`COUNT(*)`.as('count') })
      .from(DELIVERABLES)
      .where(eq(DELIVERABLES.milestone_id, milestoneId));
    if (Number(count.count) > 0) throw new Error('Only empty planned milestones can be deleted');

    const [deleted] = await db.delete(MILESTONES).where(eq(MILESTONES.id, milestoneId)).returning();
    return deleted ? this.mapMilestoneResponse(deleted) : null;
  }

  async getProjectGantt(/** @type {number} */ projectId) {
    const project = await this.getProjectById(projectId);
    if (!project) return null;

    const settings = await this.getProjectGanttSettings(projectId);
    const milestones = await this.getMilestonesForProject(projectId);
    const milestoneRowsById = new Map();
    const deliverableRows = await this.getGanttDeliverableRows(projectId);
    const taskAggregates = await this.getGanttTaskAggregates(projectId);
    const rows = [];
    const rowDates = [];
    let latestUpdatedAt = project.updatedAt;

    for (const milestone of milestones) {
      const children = deliverableRows.filter((deliverable) => deliverable.milestoneId === milestone.id);
      const completedChildren = children.filter((deliverable) => isCompletedStatus(deliverable.status)).length;
      const completed = children.length > 0 && completedChildren === children.length;
      const progress = completed ? 100 : getProgress(completedChildren, children.length, milestone.isDefault ? 0 : 0);
      const rowId = `milestone:${milestone.id}`;
      milestoneRowsById.set(milestone.id, rowId);
      rowDates.push(milestone.startDate, milestone.endDate);
      latestUpdatedAt = [latestUpdatedAt, milestone.updatedAt].filter(Boolean).sort().at(-1);
      rows.push({
        id: rowId,
        entityType: 'milestone',
        milestoneId: milestone.id,
        labelKey: milestone.labelKey,
        labelParams: milestone.labelParams,
        displayName: milestone.isDefault ? 'Default' : `Milestone ${milestone.labelParams.number}`,
        startDate: milestone.startDate,
        endDate: milestone.endDate,
        status: completed ? 'DONE' : milestone.status,
        statusCategory: getStatusCategory(completed ? 'DONE' : milestone.status),
        progress,
        completed,
        blocked: children.some((deliverable) => taskAggregates.get(deliverable.id)?.blockedTaskCount > 0),
        isDefault: milestone.isDefault,
        milestoneOrder: milestone.labelParams.number || 0,
      });

      for (const deliverable of children) {
        const aggregate = taskAggregates.get(deliverable.id) || {
          taskCount: 0,
          completedTaskCount: 0,
          blockedTaskCount: 0,
          taskStatusCounts: {},
        };
        const isCompleted = isCompletedStatus(deliverable.status);
        const blocked = aggregate.blockedTaskCount > 0;
        const startDate = toDateOnly(deliverable.plannedStartAt || deliverable.createdAt);
        const endDate = toDateOnly(deliverable.plannedCompletionAt || addDays(deliverable.createdAt, 14));
        rowDates.push(startDate, endDate);
        latestUpdatedAt = [latestUpdatedAt, deliverable.updatedAt].filter(Boolean).sort().at(-1);
        rows.push({
          id: `deliverable:${deliverable.id}`,
          entityType: 'deliverable',
          parentId: rowId,
          milestoneId: deliverable.milestoneId,
          deliverableId: String(deliverable.id),
          deliverableCode: deliverable.deliverableCode,
          displayName: deliverable.name,
          startDate,
          endDate,
          plannedStartAt: deliverable.plannedStartAt?.toISOString?.() || deliverable.plannedStartAt || null,
          plannedCompletionAt: deliverable.plannedCompletionAt?.toISOString?.() || deliverable.plannedCompletionAt || null,
          actualStartAt: deliverable.actualStartAt?.toISOString?.() || deliverable.actualStartAt || null,
          actualCompletionAt: deliverable.actualCompletionAt?.toISOString?.() || deliverable.actualCompletionAt || null,
          status: deliverable.status,
          statusCategory: getStatusCategory(deliverable.status, blocked),
          progress: isCompleted ? 100 : getProgress(aggregate.completedTaskCount, aggregate.taskCount, 0),
          completed: isCompleted,
          blocked,
          taskCount: aggregate.taskCount,
          completedTaskCount: aggregate.completedTaskCount,
          blockedTaskCount: aggregate.blockedTaskCount,
          taskStatusCounts: aggregate.taskStatusCounts,
          lazyTasks: aggregate.taskCount > 0,
          deliverableOrder: deliverable.milestonePosition,
        });
      }
    }

    const links = await this.getGanttDeliverableLinks(projectId);
    const rangeDates = rowDates.filter(Boolean).sort();
    const updatedAt = latestUpdatedAt ? new Date(latestUpdatedAt).toISOString() : new Date().toISOString();

    return {
      projectCode: project.code,
      projectName: project.title,
      version: updatedAt,
      updatedAt,
      range: {
        startDate: rangeDates[0] || DEFAULT_GANTT_START_DATE,
        endDate: rangeDates.at(-1) || DEFAULT_GANTT_END_DATE,
      },
      timeline: getTimelineFromSettings(settings),
      rows,
      links,
    };
  }

  async getGanttDeliverableRows(/** @type {number} */ projectId) {
    return await db.select({
      id: DELIVERABLES.id,
      projectId: DELIVERABLES.project_id,
      milestoneId: DELIVERABLES.milestone_id,
      deliverableCode: DELIVERABLES.code,
      name: DELIVERABLES.name,
      status: DELIVERABLES.status,
      milestonePosition: DELIVERABLES.milestone_position,
      plannedStartAt: DELIVERABLES.planned_start_at,
      plannedCompletionAt: DELIVERABLES.planned_completion_at,
      actualStartAt: DELIVERABLES.actual_start_at,
      actualCompletionAt: DELIVERABLES.actual_completion_at,
      createdAt: DELIVERABLES.created_at,
      updatedAt: DELIVERABLES.updated_at,
    })
      .from(DELIVERABLES)
      .where(eq(DELIVERABLES.project_id, projectId))
      .orderBy(asc(DELIVERABLES.milestone_id), asc(DELIVERABLES.milestone_position), asc(DELIVERABLES.id));
  }

  async getGanttTaskAggregates(/** @type {number} */ projectId) {
    const tasks = await db.select({
      deliverableId: TASKS.deliverable_id,
      status: TASKS.status,
      isBlocked: TASKS.is_blocked,
    })
      .from(TASKS)
      .where(eq(TASKS.project_id, projectId));

    const aggregates = new Map();
    for (const task of tasks) {
      const current = aggregates.get(task.deliverableId) || {
        taskCount: 0,
        completedTaskCount: 0,
        blockedTaskCount: 0,
        taskStatusCounts: {},
      };
      current.taskCount += 1;
      if (isCompletedStatus(task.status)) current.completedTaskCount += 1;
      if (task.isBlocked) current.blockedTaskCount += 1;
      current.taskStatusCounts[task.status] = (current.taskStatusCounts[task.status] || 0) + 1;
      aggregates.set(task.deliverableId, current);
    }
    return aggregates;
  }

  async getGanttDeliverableLinks(/** @type {number} */ projectId) {
    const deliverables = await db.select({
      id: DELIVERABLES.id,
    })
      .from(DELIVERABLES)
      .where(eq(DELIVERABLES.project_id, projectId));
    const projectDeliverableIds = new Set(deliverables.map((deliverable) => deliverable.id));
    const relations = await db.select().from(DELIVERABLE_RELATIONS);

    return relations
      .filter((relation) => (
        projectDeliverableIds.has(relation.deliverable_id)
        && projectDeliverableIds.has(relation.related_deliverable_id)
      ))
      .map((relation) => ({
        id: `link:${relation.related_deliverable_id}-to-${relation.deliverable_id}`,
        sourceId: `deliverable:${relation.related_deliverable_id}`,
        targetId: `deliverable:${relation.deliverable_id}`,
        type: 'e2s',
        relationType: relation.relation_type,
      }));
  }

  async updateDeliverableMilestone(/** @type {number} */ projectId, /** @type {number} */ deliverableId, /** @type {number} */ milestoneId, /** @type {number|null} */ userId = null) {
    const deliverable = await this.getDeliverableById(deliverableId);
    if (!deliverable || deliverable.projectId !== projectId) return null;
    const milestone = await this.getMilestoneById(milestoneId);
    if (!milestone || milestone.projectId !== projectId) throw new Error('Milestone not found in this project');

    const [maxPosition] = await db.select({ max: sql`COALESCE(MAX(${DELIVERABLES.milestone_position}),0)`.as('max') })
      .from(DELIVERABLES)
      .where(eq(DELIVERABLES.milestone_id, milestoneId));
    const nextPosition = Math.floor(Number(maxPosition.max) / 10) * 10 + 10;

    await db.update(DELIVERABLES)
      .set({
        milestone_id: milestoneId,
        milestone_position: nextPosition,
        updated_by: userId,
        updated_at: new Date(),
      })
      .where(eq(DELIVERABLES.id, deliverableId));

    return await this.getDeliverableById(deliverableId);
  }

  async replaceMilestoneDeliverables(
    /** @type {number} */ projectId,
    /** @type {number} */ milestoneId,
    /** @type {number[]} */ deliverableIds,
    /** @type {string|null} */ expectedVersion = null,
    /** @type {number|null} */ userId = null
  ) {
    const milestone = await this.getMilestoneById(milestoneId);
    if (!milestone || milestone.projectId !== projectId) return null;
    if (milestone.isDefault) throw new Error('Default milestone deliverable list cannot remove deliverables from the hierarchy');
    if (new Set(deliverableIds).size !== deliverableIds.length) throw new Error('Duplicate deliverable IDs are not allowed');

    if (expectedVersion) {
      const current = await this.getProjectGantt(projectId);
      if (current?.version && current.version !== expectedVersion) {
        /** @type {Error & { statusCode?: number, latestProjection?: any }} */
        const error = new Error('Project Gantt projection is stale');
        error.statusCode = 409;
        error.latestProjection = current;
        throw error;
      }
    }

    await db.transaction(async (/** @type {any} */ tx) => {
      const [defaultMilestone] = await tx.select()
        .from(MILESTONES)
        .where(and(eq(MILESTONES.project_id, projectId), eq(MILESTONES.is_default, true)))
        .limit(1);
      if (!defaultMilestone) throw new Error('Default milestone not found');

      const currentRows = await tx.select()
        .from(DELIVERABLES)
        .where(eq(DELIVERABLES.milestone_id, milestoneId));
      const currentIds = new Set(currentRows.map((/** @type {any} */ row) => row.id));
      const requestedRows = deliverableIds.length
        ? await tx.select().from(DELIVERABLES).where(inArray(DELIVERABLES.id, deliverableIds))
        : [];
      const requestedById = new Map(requestedRows.map((/** @type {any} */ row) => [row.id, row]));

      for (const deliverableId of deliverableIds) {
        const deliverable = requestedById.get(deliverableId);
        if (!deliverable || deliverable.project_id !== projectId) throw new Error('Deliverable not found in this project');
        const allowedSource = deliverable.milestone_id === milestoneId || deliverable.milestone_id === defaultMilestone.id;
        if (!allowedSource) throw new Error('Cannot pull deliverables directly from another planned milestone');
      }

      let position = 10;
      for (const deliverableId of deliverableIds) {
        await tx.update(DELIVERABLES)
          .set({
            milestone_id: milestoneId,
            milestone_position: position,
            updated_by: userId,
            updated_at: new Date(),
          })
          .where(eq(DELIVERABLES.id, deliverableId));
        position += 10;
      }

      const removedIds = [...currentIds].filter((id) => !deliverableIds.includes(id));
      if (removedIds.length) {
        const [maxDefaultPosition] = await tx.select({ max: sql`COALESCE(MAX(${DELIVERABLES.milestone_position}),0)`.as('max') })
          .from(DELIVERABLES)
          .where(eq(DELIVERABLES.milestone_id, defaultMilestone.id));
        let defaultPosition = Math.floor(Number(maxDefaultPosition.max) / 10) * 10 + 10;
        for (const deliverableId of removedIds) {
          await tx.update(DELIVERABLES)
            .set({
              milestone_id: defaultMilestone.id,
              milestone_position: defaultPosition,
              updated_by: userId,
              updated_at: new Date(),
            })
            .where(eq(DELIVERABLES.id, deliverableId));
          defaultPosition += 10;
        }
      }

    });

    return await this.getProjectGantt(projectId);
  }

  async createDeliverableRelation(
    /** @type {number} */ projectId,
    /** @type {number} */ deliverableId,
    /** @type {number} */ relatedDeliverableId,
    /** @type {'DEPENDS_ON'} */ relationType = 'DEPENDS_ON',
    /** @type {number|null} */ userId = null
  ) {
    if (deliverableId === relatedDeliverableId) throw new Error('Deliverable cannot depend on itself');
    const deliverables = await db.select()
      .from(DELIVERABLES)
      .where(inArray(DELIVERABLES.id, [deliverableId, relatedDeliverableId]));
    const byId = new Map(deliverables.map((deliverable) => [deliverable.id, deliverable]));
    if (byId.size !== 2 || [...byId.values()].some((deliverable) => deliverable.project_id !== projectId)) {
      throw new Error('Deliverables must belong to the same project');
    }

    const [created] = await db.insert(DELIVERABLE_RELATIONS).values({
      deliverable_id: deliverableId,
      related_deliverable_id: relatedDeliverableId,
      relation_type: relationType,
      created_by: userId,
      updated_by: userId,
    }).returning();
    return created;
  }

  // ==================== TASK OPERATIONS ====================

  /**
   * Get tasks for a specific project with assignees and tags
   */
  async getTasksForProject(/** @type {any} */ projectId) {
    const tasks = await db.select({
      id: TASKS.id,
      taskId: TASKS.id,
      title: TASKS.title,
      status: TASKS.status,
      priority: TASKS.priority,
      position: TASKS.position,
      storyPoints: TASKS.story_points,
      projectId: TASKS.project_id,
      deliverableId: TASKS.deliverable_id,
      deliverableName: DELIVERABLES.name,
      agentName: TASKS.agent_name,
      prompt: TASKS.prompt,
      isBlocked: TASKS.is_blocked,
      blockedReason: TASKS.blocked_reason,
      gitWorktree: TASKS.git_worktree,
      startedAt: TASKS.started_at,
      completedAt: TASKS.completed_at,
      coordinationCode: TASKS.coordination_code,
      createdAt: TASKS.created_at,
      updatedAt: TASKS.updated_at
    })
    .from(TASKS)
    .leftJoin(DELIVERABLES, eq(TASKS.deliverable_id, DELIVERABLES.id))
    .where(eq(TASKS.project_id, projectId))
    .orderBy(asc(TASKS.status), asc(TASKS.position));

    // Get tags for each task
    const tasksWithTags = await Promise.all(
      tasks.map(async (/** @type {any} */ task) => {
        const tags = await this.getTagsForTask(task.id);
        return { ...task, tags };
      })
    );

    return tasksWithTags;
  }

  /**
   * Get all tasks with filters
   */
  async getTasks(/** @type {any} */ filters = {}) {
    /** @type {any} */
    let query = db.select({
      id: TASKS.id,
      taskId: TASKS.id,
      phase: TASKS.phase,
      phaseStep: TASKS.phase_step,
      title: TASKS.title,
      status: TASKS.status,
      priority: TASKS.priority,
      position: TASKS.position,
      storyPoints: TASKS.story_points,
      projectId: TASKS.project_id,
      projectName: PROJECTS.title,
      deliverableId: TASKS.deliverable_id,
      deliverableName: DELIVERABLES.name,
      agentName: TASKS.agent_name,
      prompt: TASKS.prompt,
      notes: TASKS.notes,
      isBlocked: TASKS.is_blocked,
      blockedReason: TASKS.blocked_reason,
      isCancelled: TASKS.is_cancelled,
      gitWorktree: TASKS.git_worktree,
      startedAt: TASKS.started_at,
      completedAt: TASKS.completed_at,
      coordinationCode: TASKS.coordination_code,
      createdAt: TASKS.created_at,
      updatedAt: TASKS.updated_at
    })
    .from(TASKS)
    .leftJoin(PROJECTS, eq(TASKS.project_id, PROJECTS.id))
    .leftJoin(DELIVERABLES, eq(TASKS.deliverable_id, DELIVERABLES.id));

    // Apply filters
    const conditions = [];
    if (filters.projectId) {
      conditions.push(eq(TASKS.project_id, filters.projectId));
    }
    if (filters.status) {
      conditions.push(eq(TASKS.status, filters.status));
    }
    if (filters.agentName) {
      conditions.push(eq(TASKS.agent_name, filters.agentName));
    }
    if (filters.deliverableId) {
      conditions.push(eq(TASKS.deliverable_id, filters.deliverableId));
    }
    if (filters.search) {
      conditions.push(
        or(
          like(TASKS.title, `%${filters.search}%`),
          like(TASKS.prompt, `%${filters.search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const tasks = await query.orderBy(asc(TASKS.position));
    
    // Get tags for each task
    const tasksWithTags = await Promise.all(
      tasks.map(async (/** @type {any} */ task) => {
        const tags = await this.getTagsForTask(task.id);
        return { ...task, tags };
      })
    );

    return tasksWithTags;
  }

  /**
   * Get task by ID with full details
   */
  async getTaskById(/** @type {any} */ id) {
    const [task] = await db.select({
      id: TASKS.id,
      taskId: TASKS.id,
      phase: TASKS.phase,
      phaseStep: TASKS.phase_step,
      title: TASKS.title,
      status: TASKS.status,
      priority: TASKS.priority,
      position: TASKS.position,
      storyPoints: TASKS.story_points,
      projectId: TASKS.project_id,
      projectName: PROJECTS.title,
      deliverableId: TASKS.deliverable_id,
      deliverableName: DELIVERABLES.name,
      agentName: TASKS.agent_name,
      prompt: TASKS.prompt,
      notes: TASKS.notes,
      isBlocked: TASKS.is_blocked,
      blockedReason: TASKS.blocked_reason,
      isCancelled: TASKS.is_cancelled,
      gitWorktree: TASKS.git_worktree,
      startedAt: TASKS.started_at,
      completedAt: TASKS.completed_at,
      coordinationCode: TASKS.coordination_code,
      createdAt: TASKS.created_at,
      updatedAt: TASKS.updated_at
    })
    .from(TASKS)
    .leftJoin(PROJECTS, eq(TASKS.project_id, PROJECTS.id))
    .leftJoin(DELIVERABLES, eq(TASKS.deliverable_id, DELIVERABLES.id))
    .where(eq(TASKS.id, id))
    .limit(1);

    if (!task) return null;

    const tags = await this.getTagsForTask(id);
    return { ...task, tags };
  }

  /**
   * Get task by task_id (project code + sequence) with full details
   */
  async getTaskByTaskId(/** @type {any} */ taskId) {
    const [task] = await db.select({
      id: TASKS.id,
      taskId: TASKS.id,
      phase: TASKS.phase,
      phaseStep: TASKS.phase_step,
      title: TASKS.title,
      status: TASKS.status,
      priority: TASKS.priority,
      position: TASKS.position,
      storyPoints: TASKS.story_points,
      projectId: TASKS.project_id,
      projectName: PROJECTS.title,
      deliverableId: TASKS.deliverable_id,
      deliverableName: DELIVERABLES.name,
      agentName: TASKS.agent_name,
      prompt: TASKS.prompt,
      notes: TASKS.notes,
      isBlocked: TASKS.is_blocked,
      blockedReason: TASKS.blocked_reason,
      isCancelled: TASKS.is_cancelled,
      gitWorktree: TASKS.git_worktree,
      startedAt: TASKS.started_at,
      completedAt: TASKS.completed_at,
      coordinationCode: TASKS.coordination_code,
      createdAt: TASKS.created_at,
      updatedAt: TASKS.updated_at
    })
    .from(TASKS)
    .leftJoin(PROJECTS, eq(TASKS.project_id, PROJECTS.id))
    .leftJoin(DELIVERABLES, eq(TASKS.deliverable_id, DELIVERABLES.id))
    .where(eq(TASKS.id, parseInt(taskId)))
    .limit(1);

    if (!task) return null;

    const tags = await this.getTagsForTask(task.id);
    return { ...task, tags };
  }

  /**
   * Create new task with phase_step generation, dependency wiring, and auto-promotion.
   * Leader provides phase + optional dependencies array; system handles the rest.
   */
  async createTask(/** @type {any} */ taskData) {
    if (!taskData.deliverableId) {
      throw new Error('deliverableId is required');
    }

    const task = await db.transaction(async (/** @type {any} */ tx) => {
      const [deliverable] = await tx.select().from(DELIVERABLES).where(eq(DELIVERABLES.id, taskData.deliverableId)).limit(1);
      if (!deliverable) throw new Error('Deliverable not found');
      if (taskData.projectId && taskData.projectId !== deliverable.project_id) {
        throw new Error('projectId does not match deliverable project');
      }

      const projectId = deliverable.project_id;
      const status = taskData.status || 'READY';

      // --- Kanban position: sparse numbering within status column ---
      const [maxPos] = await tx.select({
        max: sql`COALESCE(MAX(${TASKS.position}), 0)`.as('max')
      })
      .from(TASKS)
      .where(and(eq(TASKS.project_id, projectId), eq(TASKS.status, status)));
      const nextPosition = Math.floor(maxPos.max / 10) * 10 + 10;

      // --- phase_step generation ---
      // Format: "{phase}.{seq}" e.g. "1.1", "1.2"
      // Rework tasks can be created with explicit phaseStep like "1.2.1"
      let phaseStep = taskData.phaseStep || null;
      const phase = taskData.phase ?? null;

      if (phase !== null && !phaseStep) {
        // Find all existing phase_steps for this deliverable+phase to determine next seq
        // Match format "{phase}.{digits}" (direct children only, not rework like "1.2.1")
        const existing = await tx.select({ phaseStep: TASKS.phase_step })
          .from(TASKS)
          .where(
            and(
              eq(TASKS.deliverable_id, taskData.deliverableId),
              eq(TASKS.phase, phase)
            )
          );

        // Find highest sequence number for direct phase tasks (e.g. "1.3" → seq 3)
        let maxSeq = 0;
        const directPattern = new RegExp(`^${phase}\\.(\\d+)$`);
        for (const row of existing) {
          if (row.phaseStep) {
            const m = row.phaseStep.match(directPattern);
            if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
          }
        }
        phaseStep = `${phase}.${maxSeq + 1}`;
      }

      // --- Insert task ---
      const [newTask] = await tx.insert(TASKS).values({
        title: taskData.title,
        status,
        priority: taskData.priority || 'MEDIUM',
        position: taskData.position ?? nextPosition,
        story_points: taskData.storyPoints,
        project_id: projectId,
        deliverable_id: taskData.deliverableId,
        agent_name: taskData.agentName || null,
        prompt: taskData.prompt,
        notes: taskData.notes || null,
        phase,
        phase_step: phaseStep,
        is_blocked: taskData.isBlocked || false,
        blocked_reason: taskData.blockedReason,
        is_cancelled: taskData.isCancelled || false,
        git_worktree: taskData.gitWorktree,
        started_at: taskData.startedAt,
        completed_at: taskData.completedAt,
        coordination_code: taskData.coordinationCode || null,
        created_by: taskData.createdBy || null,
        updated_by: taskData.updatedBy || null
      }).returning();

      // --- Wire DEPENDS_ON relations from dependencies array ---
      // Leader is responsible for DAG ordering; no cycle check on creation
      if (taskData.dependencies && taskData.dependencies.length > 0) {
    const depValues = taskData.dependencies.map((/** @type {any} */ depId) => ({
          task_id: newTask.id,
          related_task_id: depId,
          relation_type: 'DEPENDS_ON'
        }));
        await tx.insert(TASK_RELATIONS).values(depValues);
      }

      return newTask;
    });

    // Add tags if provided
    if (taskData.tags && taskData.tags.length > 0) {
      await this.setTaskTags(task.id, taskData.tags);
    }

    return await this.getTaskById(task.id);
  }

  /**
   * Update task
   */
  async updateTask(/** @type {any} */ id, /** @type {any} */ taskData) {
    // Read current state including cancellation flag
    const [current] = await db.select({
      status: TASKS.status,
      isCancelled: TASKS.is_cancelled
    }).from(TASKS).where(eq(TASKS.id, id)).limit(1);
    // Immutability: cancelled tasks cannot be uncancelled or have their status changed
    if (current?.isCancelled) {
      if (taskData.isCancelled === false) {
        throw Object.assign(new Error('Cannot uncancel a task'), { isImmutable: true });
      }
      if (taskData.status !== undefined && taskData.status !== 'COMPLETED') {
        throw Object.assign(new Error('Cannot change status of a cancelled task'), { isImmutable: true });
      }
    }

    const updateData = {};
    if (taskData.title !== undefined) updateData.title = taskData.title;
    if (taskData.status !== undefined) updateData.status = taskData.status;
    if (taskData.priority !== undefined) updateData.priority = taskData.priority;
    if (taskData.position !== undefined) updateData.position = taskData.position;
    if (taskData.storyPoints !== undefined) updateData.story_points = taskData.storyPoints;
    if (taskData.projectId !== undefined) updateData.project_id = taskData.projectId;
    if (taskData.deliverableId !== undefined) updateData.deliverable_id = taskData.deliverableId;
    if (taskData.agentName !== undefined) updateData.agent_name = taskData.agentName;
    if (taskData.prompt !== undefined) updateData.prompt = taskData.prompt;
    if (taskData.isBlocked !== undefined) updateData.is_blocked = taskData.isBlocked;
    if (taskData.blockedReason !== undefined) updateData.blocked_reason = taskData.blockedReason;
    if (taskData.gitWorktree !== undefined) updateData.git_worktree = taskData.gitWorktree;
    if (taskData.startedAt !== undefined) updateData.started_at = taskData.startedAt;
    if (taskData.completedAt !== undefined) updateData.completed_at = taskData.completedAt;
    if (taskData.coordinationCode !== undefined) updateData.coordination_code = taskData.coordinationCode;
    if (taskData.notes !== undefined) updateData.notes = taskData.notes;
    if (taskData.isCancelled !== undefined) updateData.is_cancelled = taskData.isCancelled;
    if (taskData.updatedBy !== undefined) updateData.updated_by = taskData.updatedBy;

    // Cancellation always forces COMPLETED — override any status in the payload
    if (taskData.isCancelled === true) {
      updateData.status = 'COMPLETED';
    }
    
    await db.update(TASKS)
      .set(updateData)
      .where(eq(TASKS.id, id))
      .returning();

    // Update tags if provided
    if (taskData.tagNames !== undefined) {
      await this.setTaskTags(id, taskData.tagNames || []);
    }

    // Return the full task object in camelCase format
    return await this.getTaskById(id);
  }

  /**
   * Update task position and handle related task adjustments
   */
  async updateTaskPosition(/** @type {any} */ taskId, /** @type {any} */ newPosition, /** @type {any} */ status) {
    // Get the current task
    const [currentTask] = await db.select()
      .from(TASKS)
      .where(eq(TASKS.id, taskId))
      .limit(1);

    if (!currentTask) return null;

    const oldPosition = currentTask.position;
    const oldStatus = currentTask.status;
    const projectId = currentTask.project_id;

    // If status is changing, delegate to updateTask so promotion is centralized there
    if (status !== oldStatus) {
      return await this.updateTask(taskId, { status, position: newPosition });
    }

    // Same status - handle position change with sparse positioning
    if (newPosition === oldPosition) {
      return currentTask; // No change needed
    }

    // Get all tasks in the same status column for this project
    const columnTasks = await db.select()
      .from(TASKS)
      .where(
        and(
          eq(TASKS.project_id, projectId),
          eq(TASKS.status, status)
        )
      )
      .orderBy(asc(TASKS.position));

    // Find the target position in the sorted list
    const targetIndex = columnTasks.findIndex(task => task.position >= newPosition);
    
    if (targetIndex === -1) {
      // Inserting at the end
      const [updatedTask] = await db.update(TASKS)
        .set({ 
          position: newPosition,
          updated_at: new Date()
        })
        .where(eq(TASKS.id, taskId))
        .returning();
      
      return updatedTask;
    }

    // Check if we need to redistribute positions
    const beforeTask = targetIndex > 0 ? columnTasks[targetIndex - 1] : null;
    const afterTask = columnTasks[targetIndex];
    
    let finalPosition = newPosition;
    
    if (beforeTask && afterTask) {
      const gap = afterTask.position - beforeTask.position;
      if (gap < 2) {
        // Need to redistribute - use sparse positioning
        finalPosition = beforeTask.position + Math.floor(gap / 2);
        
        // Redistribute all tasks in this column
        await this.redistributeColumnPositions(projectId, status);
      } else {
        // Enough space, use the calculated position
        finalPosition = beforeTask.position + Math.floor(gap / 2);
      }
    } else if (!beforeTask) {
      // Inserting at the beginning
      finalPosition = afterTask.position / 2;
    } else {
      // Inserting at the end
      finalPosition = beforeTask.position + 10;
    }

    // Update the task position
    const [updatedTask] = await db.update(TASKS)
      .set({ 
        position: finalPosition,
        updated_at: new Date()
      })
      .where(eq(TASKS.id, taskId))
      .returning();

    return updatedTask;
  }

  /**
   * Redistribute positions in a column using sparse positioning
   */
  async redistributeColumnPositions(/** @type {any} */ projectId, /** @type {any} */ status) {
    const tasks = await db.select()
      .from(TASKS)
      .where(
        and(
          eq(TASKS.project_id, projectId),
          eq(TASKS.status, status)
        )
      )
      .orderBy(asc(TASKS.position));

    // Update all tasks with new sparse positions
    const updatePromises = tasks.map((/** @type {any} */ task, /** @type {any} */ index) => {
      const newPosition = (index + 1) * 10;
      return db.update(TASKS)
        .set({ 
          position: newPosition,
          updated_at: new Date()
        })
        .where(eq(TASKS.id, task.id));
    });

    await Promise.all(updatePromises);
  }

  /**
   * Delete task
   */
  async deleteTask(/** @type {any} */ id) {
    // Delete task tags first
    await db.delete(TASK_TAGS).where(eq(TASK_TAGS.task_id, id));
    
    const [task] = await db.delete(TASKS)
      .where(eq(TASKS.id, id))
      .returning();
    
    return task || null;
  }

  // ==================== TAG OPERATIONS ====================

  /**
   * Validate tag name according to functional requirements
   * - Must be lowercase
   * - Only hyphens (-) allowed as separators
   * - Cannot start or end with hyphen
   */
  validateTagName(/** @type {any} */ tagName) {
    if (!tagName || typeof tagName !== 'string') {
      throw new Error('Tag name is required and must be a string');
    }

    // Check if tag is lowercase
    if (tagName !== tagName.toLowerCase()) {
      throw new Error('Tag name must be lowercase');
    }

    // Check if tag starts or ends with hyphen
    if (tagName.startsWith('-') || tagName.endsWith('-')) {
      throw new Error('Tag name cannot start or end with a hyphen');
    }

    // Check if tag contains only allowed characters (lowercase letters, numbers, hyphens)
    const validTagRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    if (!validTagRegex.test(tagName)) {
      throw new Error('Tag name can only contain lowercase letters, numbers, and hyphens as separators');
    }

    return true;
  }

  /**
   * Get all tags with optional search and usage counts
   * @param {string|null} searchTerm - Optional tag search term.
   * @returns {Promise<Tag[]>} Tags with usage counts.
   */
  async getTags(/** @type {string|null} */ searchTerm = null) {
    /** @type {any} */
    let query = db.select({
      tag: TAGS.tag,
      color: TAGS.color,
      createdAt: TAGS.created_at,
      usageCount: sql`COUNT(${TASK_TAGS.task_id})`.as('usage_count')
    })
    .from(TAGS)
    .leftJoin(TASK_TAGS, eq(TAGS.tag, TASK_TAGS.tag))
    .groupBy(TAGS.tag, TAGS.color, TAGS.created_at);

    if (searchTerm) {
      query = query.where(like(TAGS.tag, `%${searchTerm}%`));
    }

    const tags = await query.orderBy(asc(TAGS.tag));
    return tags;
  }

  /**
   * Get tag by tag name
   */
  async getTagByName(/** @type {any} */ tagName) {
    const [tag] = await db.select({
      tag: TAGS.tag,
      color: TAGS.color,
      createdAt: TAGS.created_at
    })
      .from(TAGS)
      .where(eq(TAGS.tag, tagName))
      .limit(1);
    
    return tag || null;
  }

  /**
   * Create new tag with random color
   */
  async createTag(/** @type {any} */ tagData) {
    // Validate tag name
    this.validateTagName(tagData.tag || tagData.name);
    
    const tagName = tagData.tag || tagData.name;
    const color = tagData.color || getRandomTagColor();
    
    const [tag] = await db.insert(TAGS)
      .values({
        tag: tagName,
        color: color
      })
      .returning();
    
    return {
      tag: tag.tag,
      color: tag.color,
      createdAt: tag.created_at
    };
  }

  /**
   * Update tag
   */
  async updateTag(/** @type {any} */ tagName, /** @type {any} */ tagData) {
    // Validate tag name if it's being updated
    if (tagData.tag || tagData.name) {
      this.validateTagName(tagData.tag || tagData.name);
    }
    
    const updateData = {};
    if (tagData.color) updateData.color = tagData.color;
    
    const [tag] = await db.update(TAGS)
      .set(updateData)
      .where(eq(TAGS.tag, tagName))
      .returning();
    
    return tag ? {
      tag: tag.tag,
      color: tag.color,
      createdAt: tag.created_at
    } : null;
  }

  /**
   * Delete tag
   */
  async deleteTag(/** @type {any} */ tagName) {
    const [tag] = await db.delete(TAGS)
      .where(eq(TAGS.tag, tagName))
      .returning();
    
    return tag ? {
      tag: tag.tag,
      color: tag.color,
      createdAt: tag.created_at
    } : null;
  }

  /**
   * Get tags for a specific task
   */
  async getTagsForTask(/** @type {any} */ taskId) {
    const tags = await db.select({
      tag: TAGS.tag,
      color: TAGS.color
    })
    .from(TAGS)
    .innerJoin(TASK_TAGS, eq(TAGS.tag, TASK_TAGS.tag))
    .where(eq(TASK_TAGS.task_id, taskId))
    .orderBy(asc(TAGS.tag));

    return tags;
  }

  /**
   * Set tags for a task (replaces existing tags)
   */
  async setTaskTags(/** @type {any} */ taskId, /** @type {any} */ tagNames) {
    // Remove existing tags
    await db.delete(TASK_TAGS).where(eq(TASK_TAGS.task_id, taskId));
    
    // Add new tags
    if (tagNames && tagNames.length > 0) {
      const taskTagData = tagNames.map((/** @type {any} */ tagName) => ({
        task_id: taskId,
        tag: tagName
      }));
      
      await db.insert(TASK_TAGS).values(taskTagData);
    }
  }

  // ==================== IMAGE OPERATIONS ====================

  /**
   * Get all images for a task
   */
  async getTaskImages(/** @type {any} */ taskId) {
    const images = await db.select({
      id: IMAGE_METADATA.id,
      taskId: IMAGE_METADATA.task_id,
      deliverableId: IMAGE_METADATA.deliverable_id,
      originalName: IMAGE_METADATA.original_name,
      contentType: IMAGE_METADATA.content_type,
      fileSize: IMAGE_METADATA.file_size,
      url: IMAGE_METADATA.url,
      storageType: IMAGE_METADATA.storage_type,
      createdAt: IMAGE_METADATA.created_at
    })
    .from(IMAGE_METADATA)
    .where(eq(IMAGE_METADATA.task_id, taskId))
    .orderBy(asc(IMAGE_METADATA.created_at));
    
    return images;
  }

  /**
   * Get all images attached directly to a deliverable
   */
  async getDeliverableImages(/** @type {any} */ deliverableId) {
    const images = await db.select({
      id: IMAGE_METADATA.id,
      taskId: IMAGE_METADATA.task_id,
      deliverableId: IMAGE_METADATA.deliverable_id,
      originalName: IMAGE_METADATA.original_name,
      contentType: IMAGE_METADATA.content_type,
      fileSize: IMAGE_METADATA.file_size,
      url: IMAGE_METADATA.url,
      storageType: IMAGE_METADATA.storage_type,
      createdAt: IMAGE_METADATA.created_at
    })
    .from(IMAGE_METADATA)
    .where(eq(IMAGE_METADATA.deliverable_id, deliverableId))
    .orderBy(asc(IMAGE_METADATA.created_at));

    return images;
  }

  /**
   * Store task-owned image with metadata and binary data
   * @param {number} taskId - Owning task primary key.
   * @param {{ originalName: string, contentType: string, fileSize: number, base64Data?: string, data?: string, thumbnailData?: string|null }} imageData - Image payload.
   * @param {string} [imageUrlBase] - Base URL for generated image URLs.
   * @returns {Promise<ImageMetadata>} Stored image metadata.
   */
  async storeTaskImage(/** @type {number} */ taskId, /** @type {{ originalName: string, contentType: string, fileSize: number, base64Data?: string, data?: string, thumbnailData?: string|null }} */ imageData, /** @type {string} */ imageUrlBase = '/images') {
    // Insert image metadata
    const [metadata] = await db.insert(IMAGE_METADATA)
      .values({
        task_id: taskId,
        deliverable_id: null,
        original_name: imageData.originalName,
        content_type: imageData.contentType,
        file_size: imageData.fileSize,
        url: `${imageUrlBase}/0`, // Temporary, will update with actual ID
        storage_type: 'local'
      })
      .returning();

    // Update URL with actual image ID
    const finalUrl = `${imageUrlBase}/${metadata.id}`;
    await db.update(IMAGE_METADATA)
      .set({ url: finalUrl })
      .where(eq(IMAGE_METADATA.id, metadata.id));
    
    // Insert binary data
    await db.insert(IMAGE_DATA)
      .values({
        id: metadata.id,
        data: imageData.base64Data,
        thumbnail_data: null // Could add thumbnail generation later
      });
    
    return {
      id: metadata.id,
      taskId: metadata.task_id,
      deliverableId: metadata.deliverable_id,
      originalName: metadata.original_name,
      contentType: metadata.content_type,
      fileSize: metadata.file_size,
      url: finalUrl,
      storageType: metadata.storage_type,
      createdAt: metadata.created_at
    };
  }

  /**
   * Store deliverable-owned image with metadata and binary data
   */
  async storeDeliverableImage(/** @type {any} */ deliverableId, /** @type {any} */ imageData, /** @type {any} */ imageUrlBase = '/images') {
    const [metadata] = await db.insert(IMAGE_METADATA)
      .values({
        task_id: null,
        deliverable_id: deliverableId,
        original_name: imageData.originalName,
        content_type: imageData.contentType,
        file_size: imageData.fileSize,
        url: `${imageUrlBase}/0`,
        storage_type: 'local'
      })
      .returning();

    const finalUrl = `${imageUrlBase}/${metadata.id}`;
    await db.update(IMAGE_METADATA)
      .set({ url: finalUrl })
      .where(eq(IMAGE_METADATA.id, metadata.id));

    await db.insert(IMAGE_DATA)
      .values({
        id: metadata.id,
        data: imageData.base64Data,
        thumbnail_data: null
      });

    return {
      id: metadata.id,
      taskId: metadata.task_id,
      deliverableId: metadata.deliverable_id,
      originalName: metadata.original_name,
      contentType: metadata.content_type,
      fileSize: metadata.file_size,
      url: finalUrl,
      storageType: metadata.storage_type,
      createdAt: metadata.created_at
    };
  }

  /**
   * Get image with binary data for serving
   */
  async getImageWithData(/** @type {any} */ imageId) {
    const [result] = await db
      .select({
        id: IMAGE_METADATA.id,
        taskId: IMAGE_METADATA.task_id,
        deliverableId: IMAGE_METADATA.deliverable_id,
        originalName: IMAGE_METADATA.original_name,
        contentType: IMAGE_METADATA.content_type,
        fileSize: IMAGE_METADATA.file_size,
        url: IMAGE_METADATA.url,
        storageType: IMAGE_METADATA.storage_type,
        data: IMAGE_DATA.data,
        thumbnailData: IMAGE_DATA.thumbnail_data
      })
      .from(IMAGE_METADATA)
      .leftJoin(IMAGE_DATA, eq(IMAGE_METADATA.id, IMAGE_DATA.id))
      .where(eq(IMAGE_METADATA.id, imageId))
      .limit(1);
    
    return result || null;
  }

  /**
   * Get image metadata only
   */
  async getImageMetadata(/** @type {any} */ imageId) {
    const [image] = await db.select({
      id: IMAGE_METADATA.id,
      taskId: IMAGE_METADATA.task_id,
      deliverableId: IMAGE_METADATA.deliverable_id,
      originalName: IMAGE_METADATA.original_name,
      contentType: IMAGE_METADATA.content_type,
      fileSize: IMAGE_METADATA.file_size,
      url: IMAGE_METADATA.url,
      storageType: IMAGE_METADATA.storage_type,
      createdAt: IMAGE_METADATA.created_at
    })
    .from(IMAGE_METADATA)
    .where(eq(IMAGE_METADATA.id, imageId))
    .limit(1);
    
    return image || null;
  }

  /**
   * Delete image and its binary data
   */
  async deleteImage(/** @type {any} */ imageId) {
    // Delete binary data first (cascade will handle this, but being explicit)
    await db.delete(IMAGE_DATA)
      .where(eq(IMAGE_DATA.id, imageId));
    
    // Delete metadata
    const [deletedImage] = await db.delete(IMAGE_METADATA)
      .where(eq(IMAGE_METADATA.id, imageId))
      .returning();
    
    return deletedImage ? {
      id: deletedImage.id,
      taskId: deletedImage.task_id,
      deliverableId: deletedImage.deliverable_id,
      originalName: deletedImage.original_name,
      contentType: deletedImage.content_type
    } : null;
  }

  // ==================== FILE LOCK OPERATIONS ====================

  normalizeLockFileRelativePaths(/** @type {any} */ fileRelativePaths = []) {
    if (!Array.isArray(fileRelativePaths)) return [];
    const normalized = fileRelativePaths
      .map((/** @type {any} */ value) => String(value || '').trim())
      .filter(Boolean);
    return [...new Set(normalized)];
  }

  normalizeLockTtlSeconds(/** @type {any} */ ttlSeconds) {
    const parsed = Number.parseInt(ttlSeconds, 10);
    if (!Number.isFinite(parsed)) return 30;
    if (parsed < 5) return 5;
    if (parsed > 300) return 300;
    return parsed;
  }

  mapFileLock(/** @type {any} */ lock) {
    return {
      id: lock.id,
      projectId: lock.project_id,
      deliverableId: lock.deliverable_id,
      taskId: lock.task_id,
      phaseStep: lock.phase_step,
      agentName: lock.agent_name,
      fileRelativePath: lock.file_relative_path,
      acquiredAt: lock.acquired_at,
      heartbeatAt: lock.heartbeat_at,
      leaseExpiresAt: lock.lease_expires_at,
      createdBy: lock.created_by,
      updatedBy: lock.updated_by,
      updatedAt: lock.updated_at,
    };
  }

  async reclaimExpiredFileLocks(/** @type {any} */ tx, /** @type {any} */ deliverableId) {
    return tx
      .delete(FILE_LOCKS)
      .where(
        and(
          eq(FILE_LOCKS.deliverable_id, deliverableId),
          sql`${FILE_LOCKS.lease_expires_at} <= NOW()`
        )
      );
  }

  /**
   * @param {{ projectId: number, deliverableId: number }} input - Project and deliverable scope.
   * @returns {Promise<FileLock[]>} Active file locks after expired leases are reclaimed.
   */
  async listActiveFileLocks(/** @type {{ projectId: number, deliverableId: number }} */ { projectId, deliverableId }) {
    return db.transaction(async (/** @type {any} */ tx) => {
      await this.reclaimExpiredFileLocks(tx, deliverableId);
      const rows = await tx
        .select()
        .from(FILE_LOCKS)
        .where(
          and(
            eq(FILE_LOCKS.project_id, projectId),
            eq(FILE_LOCKS.deliverable_id, deliverableId),
            sql`${FILE_LOCKS.lease_expires_at} > NOW()`
          )
        )
        .orderBy(asc(FILE_LOCKS.file_relative_path));
      return rows.map((/** @type {any} */ row) => this.mapFileLock(row));
    });
  }

  /**
   * @param {{ projectId: number, deliverableId: number, taskId: number, phaseStep?: string|null, agentName: string, fileRelativePaths: string[], ttlSeconds?: number, userId?: number|null }} input - Lock acquisition request.
   * @returns {Promise<{ acquired: boolean, locks?: FileLock[], ttlSeconds?: number, error?: string, conflicts?: Array<object>, pollIntervalSeconds?: number }>} Lock acquisition result.
   */
  async acquireFileLocks(/** @type {{ projectId: number, deliverableId: number, taskId: number, phaseStep?: string|null, agentName: string, fileRelativePaths: string[], ttlSeconds?: number, userId?: number|null }} */ { projectId, deliverableId, taskId, phaseStep = null, agentName, fileRelativePaths, ttlSeconds = 30, userId = null }) {
    const normalizedFileRelativePaths = this.normalizeLockFileRelativePaths(fileRelativePaths);
    if (normalizedFileRelativePaths.length === 0) {
      throw new Error('fileRelativePaths is required and must contain at least one path');
    }
    const normalizedAgentName = String(agentName || '').trim();
    if (!normalizedAgentName) {
      throw new Error('agentName is required');
    }
    const ttl = this.normalizeLockTtlSeconds(ttlSeconds);

    return db.transaction(async (/** @type {any} */ tx) => {
      await this.reclaimExpiredFileLocks(tx, deliverableId);

      const [task] = await tx.select({
        id: TASKS.id,
        projectId: TASKS.project_id,
        deliverableId: TASKS.deliverable_id,
      })
      .from(TASKS)
      .where(eq(TASKS.id, taskId))
      .limit(1);

      if (!task || task.projectId !== projectId || task.deliverableId !== deliverableId) {
        throw new Error('Task not found in this project/deliverable');
      }

      const existingLocks = await tx
        .select()
        .from(FILE_LOCKS)
        .where(
          and(
            eq(FILE_LOCKS.deliverable_id, deliverableId),
            inArray(FILE_LOCKS.file_relative_path, normalizedFileRelativePaths),
            sql`${FILE_LOCKS.lease_expires_at} > NOW()`
          )
        );

      const conflicts = existingLocks
        .filter((/** @type {any} */ lock) => !(lock.task_id === taskId && lock.agent_name === normalizedAgentName))
        .map((/** @type {any} */ lock) => ({
          fileRelativePath: lock.file_relative_path,
          taskId: lock.task_id,
          phaseStep: lock.phase_step,
          agentName: lock.agent_name,
          leaseExpiresAt: lock.lease_expires_at,
        }));

      if (conflicts.length > 0) {
        return {
          acquired: false,
          error: 'FILE_LOCK_CONFLICT',
          conflicts,
          pollIntervalSeconds: 3,
        };
      }

      const now = new Date();
      const leaseExpiresAt = new Date(now.getTime() + ttl * 1000);

      for (const fileRelativePath of normalizedFileRelativePaths) {
        const existing = existingLocks.find((/** @type {any} */ lock) => lock.file_relative_path === fileRelativePath);
        if (existing) {
          await tx
            .update(FILE_LOCKS)
            .set({
              phase_step: phaseStep ?? existing.phase_step,
              heartbeat_at: now,
              lease_expires_at: leaseExpiresAt,
              updated_by: userId,
              updated_at: now,
            })
            .where(eq(FILE_LOCKS.id, existing.id));
        } else {
          await tx
            .insert(FILE_LOCKS)
            .values({
              project_id: projectId,
              deliverable_id: deliverableId,
              task_id: taskId,
              phase_step: phaseStep,
              agent_name: normalizedAgentName,
              file_relative_path: fileRelativePath,
              acquired_at: now,
              heartbeat_at: now,
              lease_expires_at: leaseExpiresAt,
              created_by: userId,
              updated_by: userId,
              updated_at: now,
            });
        }
      }

      const acquiredRows = await tx
        .select()
        .from(FILE_LOCKS)
        .where(
          and(
            eq(FILE_LOCKS.project_id, projectId),
            eq(FILE_LOCKS.deliverable_id, deliverableId),
            eq(FILE_LOCKS.task_id, taskId),
            eq(FILE_LOCKS.agent_name, normalizedAgentName),
            inArray(FILE_LOCKS.file_relative_path, normalizedFileRelativePaths),
            sql`${FILE_LOCKS.lease_expires_at} > NOW()`
          )
        )
        .orderBy(asc(FILE_LOCKS.file_relative_path));

      return {
        acquired: true,
        locks: acquiredRows.map((/** @type {any} */ row) => this.mapFileLock(row)),
        ttlSeconds: ttl,
      };
    });
  }

  async heartbeatFileLocks(/** @type {any} */ { projectId, deliverableId, taskId, agentName, fileRelativePaths = [], ttlSeconds = 30, userId = null }) {
    const normalizedAgentName = String(agentName || '').trim();
    if (!normalizedAgentName) {
      throw new Error('agentName is required');
    }
    const normalizedFileRelativePaths = this.normalizeLockFileRelativePaths(fileRelativePaths);
    const ttl = this.normalizeLockTtlSeconds(ttlSeconds);

    return db.transaction(async (/** @type {any} */ tx) => {
      await this.reclaimExpiredFileLocks(tx, deliverableId);

      const now = new Date();
      const leaseExpiresAt = new Date(now.getTime() + ttl * 1000);

      const conditions = [
        eq(FILE_LOCKS.project_id, projectId),
        eq(FILE_LOCKS.deliverable_id, deliverableId),
        eq(FILE_LOCKS.task_id, taskId),
        eq(FILE_LOCKS.agent_name, normalizedAgentName),
        sql`${FILE_LOCKS.lease_expires_at} > NOW()`,
      ];

      if (normalizedFileRelativePaths.length > 0) {
        conditions.push(inArray(FILE_LOCKS.file_relative_path, normalizedFileRelativePaths));
      }

      const refreshedRows = await tx
        .update(FILE_LOCKS)
        .set({
          heartbeat_at: now,
          lease_expires_at: leaseExpiresAt,
          updated_by: userId,
          updated_at: now,
        })
        .where(and(...conditions))
        .returning();

      return {
        refreshedCount: refreshedRows.length,
        ttlSeconds: ttl,
        locks: refreshedRows.map((/** @type {any} */ row) => this.mapFileLock(row)),
      };
    });
  }

  async releaseFileLocks(/** @type {any} */ { projectId, deliverableId, taskId, agentName, fileRelativePaths = [] }) {
    const normalizedAgentName = String(agentName || '').trim();
    if (!normalizedAgentName) {
      throw new Error('agentName is required');
    }
    const normalizedFileRelativePaths = this.normalizeLockFileRelativePaths(fileRelativePaths);

    return db.transaction(async (/** @type {any} */ tx) => {
      await this.reclaimExpiredFileLocks(tx, deliverableId);

      const conditions = [
        eq(FILE_LOCKS.project_id, projectId),
        eq(FILE_LOCKS.deliverable_id, deliverableId),
        eq(FILE_LOCKS.task_id, taskId),
        eq(FILE_LOCKS.agent_name, normalizedAgentName),
      ];
      if (normalizedFileRelativePaths.length > 0) {
        conditions.push(inArray(FILE_LOCKS.file_relative_path, normalizedFileRelativePaths));
      }

      const releasedRows = await tx
        .delete(FILE_LOCKS)
        .where(and(...conditions))
        .returning();

      return {
        releasedCount: releasedRows.length,
        locks: releasedRows.map((/** @type {any} */ row) => this.mapFileLock(row)),
      };
    });
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      const result = await db.execute(sql`SELECT 1 as test`);
      return { status: 'connected', result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Database connection failed: ${message}`);
    }
  }

  /**
   * Get column positions for a specific project and status
   */
  async getColumnPositions(/** @type {any} */ projectId, /** @type {any} */ status) {
    const tasks = await db.select({
      id: TASKS.id,
      position: TASKS.position
    })
    .from(TASKS)
    .where(
      and(
        eq(TASKS.project_id, projectId),
        eq(TASKS.status, status)
      )
    )
    .orderBy(asc(TASKS.position));

    return tasks;
  }

  /**
   * Update multiple task positions in a column (optimized for sparse positioning)
   */
  async updateColumnPositions(/** @type {any} */ projectId, /** @type {any} */ status, /** @type {any} */ positionUpdates) {
    // Update only the tasks that need position changes
    const updatePromises = positionUpdates.map((/** @type {any} */ { taskId, newPosition }) => {
      return db.update(TASKS)
        .set({ 
          position: newPosition,
          updated_at: new Date()
        })
        .where(eq(TASKS.id, taskId));
    });

    await Promise.all(updatePromises);

    // Return updated column positions
    return await this.getColumnPositions(projectId, status);
  }

  /**
   * Calculate optimal positions for sparse positioning
   */
  calculateSparsePositions(/** @type {any} */ tasks, /** @type {any} */ insertIndex, /** @type {any} */ insertPosition) {
    const positions = [];
    let needsRedistribution = false;

    // Check if we need redistribution
    for (let i = 0; i < tasks.length - 1; i++) {
      const gap = tasks[i + 1].position - tasks[i].position;
      if (gap < 2) {
        needsRedistribution = true;
        break;
      }
    }

    if (needsRedistribution) {
      // Redistribute all positions with 10-unit gaps
      for (let i = 0; i <= tasks.length; i++) {
        if (i === insertIndex) {
          positions.push((i + 1) * 10); // Insert position
        }
        if (i < tasks.length) {
          positions.push((i + 2) * 10); // Existing tasks
        }
      }
    } else {
      // Use existing positions, only update the inserted task
      for (let i = 0; i < tasks.length; i++) {
        positions.push(tasks[i].position);
      }
      positions.splice(insertIndex, 0, insertPosition);
    }

    return { positions, needsRedistribution };
  }

  // ==================== TASK RELATION OPERATIONS ====================

  /**
   * Get all relations for a task (both directions)
   */
  async getTaskRelations(/** @type {any} */ taskId) {
    const relations = await db.select({
      taskId: TASK_RELATIONS.task_id,
      relatedTaskId: TASK_RELATIONS.related_task_id,
      relationType: TASK_RELATIONS.relation_type,
      updatedAt: TASK_RELATIONS.updated_at
    })
    .from(TASK_RELATIONS)
    .where(
      or(
        eq(TASK_RELATIONS.task_id, taskId),
        eq(TASK_RELATIONS.related_task_id, taskId)
      )
    );

    return relations;
  }

  /**
   * Create a task relation
   * For COORDINATES_WITH, automatically creates the mirror row
   * @param {number} taskId - Source task primary key.
   * @param {number} relatedTaskId - Related task primary key.
   * @param {TaskRelationType} relationType - Relation kind.
   * @param {number|null} [updatedBy] - User primary key for audit fields.
   * @returns {Promise<object>} Created relation row.
   */
  async createTaskRelation(/** @type {number} */ taskId, /** @type {number} */ relatedTaskId, /** @type {TaskRelationType} */ relationType, /** @type {number|null} */ updatedBy = null) {
    // Prevent self-referencing
    if (taskId === relatedTaskId) {
      throw new Error('A task cannot relate to itself');
    }

    // Verify both tasks exist and belong to the same project
    const [task] = await db.select({ id: TASKS.id, projectId: TASKS.project_id }).from(TASKS).where(eq(TASKS.id, taskId));
    const [relatedTask] = await db.select({ id: TASKS.id, projectId: TASKS.project_id }).from(TASKS).where(eq(TASKS.id, relatedTaskId));

    if (!task) throw new Error(`Task ${taskId} not found`);
    if (!relatedTask) throw new Error(`Task ${relatedTaskId} not found`);
    if (task.projectId !== relatedTask.projectId) {
      throw new Error('Tasks must belong to the same project');
    }

    if (relationType === 'DEPENDS_ON') {
      // Check for circular dependency before inserting
      const wouldCycle = await this.wouldCreateCycle(taskId, relatedTaskId);
      if (wouldCycle) {
        throw new Error('This dependency would create a circular reference');
      }
    }

    // Check for duplicate relation before inserting
    const [existing] = await db.select({ taskId: TASK_RELATIONS.task_id })
      .from(TASK_RELATIONS)
      .where(
        and(
          eq(TASK_RELATIONS.task_id, taskId),
          eq(TASK_RELATIONS.related_task_id, relatedTaskId),
          eq(TASK_RELATIONS.relation_type, relationType)
        )
      )
      .limit(1);
    if (existing) {
      /** @type {Error & { isDuplicate?: boolean }} */
      const err = new Error('This relation already exists');
      err.isDuplicate = true;
      throw err;
    }

    const results = [];

    // Insert the primary relation
    const [relation] = await db.insert(TASK_RELATIONS)
      .values({
        task_id: taskId,
        related_task_id: relatedTaskId,
        relation_type: relationType,
        updated_by: updatedBy
      })
      .returning();
    results.push(relation);

    // For COORDINATES_WITH, create the mirror relation
    if (relationType === 'COORDINATES_WITH') {
      const [mirror] = await db.insert(TASK_RELATIONS)
        .values({
          task_id: relatedTaskId,
          related_task_id: taskId,
          relation_type: relationType,
          updated_by: updatedBy
        })
        .returning();
      results.push(mirror);
    }

    return results;
  }

  /**
   * Delete a task relation
   * For COORDINATES_WITH, automatically deletes the mirror row
   */
  async deleteTaskRelation(/** @type {any} */ taskId, /** @type {any} */ relatedTaskId, /** @type {any} */ relationType) {
    // Delete the primary relation
    const [deleted] = await db.delete(TASK_RELATIONS)
      .where(
        and(
          eq(TASK_RELATIONS.task_id, taskId),
          eq(TASK_RELATIONS.related_task_id, relatedTaskId),
          eq(TASK_RELATIONS.relation_type, relationType)
        )
      )
      .returning();

    // For COORDINATES_WITH, also delete the mirror
    if (relationType === 'COORDINATES_WITH') {
      await db.delete(TASK_RELATIONS)
        .where(
          and(
            eq(TASK_RELATIONS.task_id, relatedTaskId),
            eq(TASK_RELATIONS.related_task_id, taskId),
            eq(TASK_RELATIONS.relation_type, relationType)
          )
        );
    }

    return deleted || null;
  }

  /**
   * Get the full task graph for a project: all tasks + all relations
   */
  async getProjectTaskGraph(/** @type {any} */ projectId) {
    const tasks = await db.select({
      id: TASKS.id,
      taskId: TASKS.id,
      phase: TASKS.phase,
      phaseStep: TASKS.phase_step,
      title: TASKS.title,
      status: TASKS.status,
      priority: TASKS.priority,
      deliverableId: TASKS.deliverable_id,
      agentName: TASKS.agent_name,
      prompt: TASKS.prompt,
      notes: TASKS.notes,
      isBlocked: TASKS.is_blocked,
      isCancelled: TASKS.is_cancelled,
      coordinationCode: TASKS.coordination_code
    })
    .from(TASKS)
    .where(eq(TASKS.project_id, projectId))
    .orderBy(asc(TASKS.phase), asc(TASKS.id));

    if (tasks.length === 0) return { tasks: [], relations: [] };

    const taskIds = tasks.map(t => t.id);

    // Get all relations where both sides are in this project
    const relations = await db.select({
      taskId: TASK_RELATIONS.task_id,
      relatedTaskId: TASK_RELATIONS.related_task_id,
      relationType: TASK_RELATIONS.relation_type
    })
    .from(TASK_RELATIONS)
    .where(inArray(TASK_RELATIONS.task_id, taskIds));

    return { tasks, relations };
  }

  /**
   * Get the task graph for a single deliverable: tasks + relations scoped to that deliverable.
   * Only returns relations where BOTH task endpoints belong to this deliverable.
   */
  async getDeliverableTaskGraph(/** @type {any} */ deliverableId) {
    const tasks = await db.select({
      id: TASKS.id,
      taskId: TASKS.id,
      phase: TASKS.phase,
      phaseStep: TASKS.phase_step,
      title: TASKS.title,
      status: TASKS.status,
      priority: TASKS.priority,
      deliverableId: TASKS.deliverable_id,
      projectId: TASKS.project_id,
      agentName: TASKS.agent_name,
      prompt: TASKS.prompt,
      notes: TASKS.notes,
      isBlocked: TASKS.is_blocked,
      isCancelled: TASKS.is_cancelled,
      coordinationCode: TASKS.coordination_code,
      createdAt: TASKS.created_at,
      updatedAt: TASKS.updated_at
    })
    .from(TASKS)
    .where(eq(TASKS.deliverable_id, deliverableId))
    .orderBy(asc(TASKS.phase), asc(TASKS.id));

    if (tasks.length === 0) return { tasks: [], relations: [] };

    const taskIds = tasks.map(t => t.id);

    // Only include relations where BOTH endpoints are within this deliverable
    const allRelations = await db.select({
      taskId: TASK_RELATIONS.task_id,
      relatedTaskId: TASK_RELATIONS.related_task_id,
      relationType: TASK_RELATIONS.relation_type
    })
    .from(TASK_RELATIONS)
    .where(inArray(TASK_RELATIONS.task_id, taskIds));

    const taskIdSet = new Set(taskIds);
    const relations = allRelations.filter(r => taskIdSet.has(r.relatedTaskId));

    return { tasks, relations };
  }

  /**
   * Check if adding a DEPENDS_ON edge would create a cycle
   * Uses iterative BFS from relatedTaskId following DEPENDS_ON edges
   * Returns true if taskId is reachable from relatedTaskId (i.e. cycle)
   */
  async wouldCreateCycle(/** @type {any} */ taskId, /** @type {any} */ relatedTaskId) {
    // If we add taskId -> relatedTaskId (taskId DEPENDS_ON relatedTaskId),
    // there's a cycle if relatedTaskId already (transitively) depends on taskId.
    // So: BFS from relatedTaskId following DEPENDS_ON, see if we reach taskId.
    // Wait — reversed: "task_id DEPENDS_ON related_task_id" means task_id needs related_task_id.
    // A cycle exists if relatedTaskId transitively DEPENDS_ON taskId.
    // Follow: where task_id = current, relation_type = DEPENDS_ON → traverse to related_task_id
    // Actually the dependency direction: task_id DEPENDS_ON related_task_id
    // So relatedTaskId depends on X means rows where task_id=relatedTaskId, type=DEPENDS_ON
    // We need to check: does relatedTaskId (or any task it depends on) eventually depend on taskId?
    // No — we need to check if taskId is an ancestor of relatedTaskId.
    // Ancestors of relatedTaskId = follow task_id=relatedTaskId → related_task_id, recursively.
    // If any of those reach taskId, we have a cycle.

    const visited = new Set();
    const queue = [relatedTaskId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === taskId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      // Get what `current` depends on
      const deps = await db.select({ relatedTaskId: TASK_RELATIONS.related_task_id })
        .from(TASK_RELATIONS)
        .where(
          and(
            eq(TASK_RELATIONS.task_id, current),
            eq(TASK_RELATIONS.relation_type, 'DEPENDS_ON')
          )
        );

      for (const dep of deps) {
        if (!visited.has(dep.relatedTaskId)) {
          queue.push(dep.relatedTaskId);
        }
      }
    }

    return false;
  }

  /**
   * Check if a task is "ready" — all its DEPENDS_ON prerequisites have reached
   * the project's completionCriteriaStatus (or DONE if not set)
   * Returns { ready: boolean, blockedBy: [{id, taskId, status}] }
   */
  async checkTaskReadiness(/** @type {any} */ taskId) {
    // Get the task and its project
    const [task] = await db.select({
      id: TASKS.id,
      projectId: TASKS.project_id,
      status: TASKS.status
    }).from(TASKS).where(eq(TASKS.id, taskId));

    if (!task) throw new Error(`Task ${taskId} not found`);

    // Get project to find completionCriteriaStatus and workflow
    const [project] = await db.select({
      completionCriteriaStatus: PROJECTS.completion_criteria_status,
      statusWorkflow: PROJECTS.status_workflow
    }).from(PROJECTS).where(eq(PROJECTS.id, task.projectId));

    const workflow = project.statusWorkflow || [];
    const criteriaStatus = project.completionCriteriaStatus || (workflow.includes('COMPLETED') ? 'COMPLETED' : 'DONE');
    const criteriaIndex = workflow.indexOf(criteriaStatus);

    // Get all tasks this task DEPENDS_ON
    const deps = await db.select({
      relatedTaskId: TASK_RELATIONS.related_task_id
    })
    .from(TASK_RELATIONS)
    .where(
      and(
        eq(TASK_RELATIONS.task_id, taskId),
        eq(TASK_RELATIONS.relation_type, 'DEPENDS_ON')
      )
    );

    if (deps.length === 0) {
      return { ready: true, blockedBy: [] };
    }

    const depTaskIds = deps.map(d => d.relatedTaskId);
    const depTasks = await db.select({
      id: TASKS.id,
      taskId: TASKS.id,
      status: TASKS.status
    })
    .from(TASKS)
    .where(inArray(TASKS.id, depTaskIds));

    const blockedBy = depTasks.filter(t => {
      const taskIndex = workflow.indexOf(t.status);
      if (criteriaIndex === -1) {
        return t.status !== criteriaStatus;
      }
      return taskIndex < criteriaIndex;
    });

    return {
      ready: blockedBy.length === 0,
      blockedBy: blockedBy.map(t => ({ id: t.id, taskId: t.taskId, status: t.status }))
    };
  }

  /**
   * After a task's status changes, check if any tasks that DEPEND on it
   * can now be auto-promoted from TO_DO to READY.
   * Returns array of promoted task IDs.
   */
  async checkAndPromoteDependents(/** @type {any} */ completedTaskId) {
    // Find tasks that depend on the completed task
    const dependents = await db.select({
      taskId: TASK_RELATIONS.task_id
    })
    .from(TASK_RELATIONS)
    .where(
      and(
        eq(TASK_RELATIONS.related_task_id, completedTaskId),
        eq(TASK_RELATIONS.relation_type, 'DEPENDS_ON')
      )
    );

    const promoted = [];

    for (const dep of dependents) {
      // Only promote tasks currently in TO_DO
      const [task] = await db.select({
        id: TASKS.id,
        status: TASKS.status,
        projectId: TASKS.project_id
      }).from(TASKS).where(eq(TASKS.id, dep.taskId));

      if (!task || task.status !== 'TO_DO') continue;

      // Check if project workflow includes READY
      const [project] = await db.select({
        statusWorkflow: PROJECTS.status_workflow
      }).from(PROJECTS).where(eq(PROJECTS.id, task.projectId));

      if (!project || !project.statusWorkflow.includes('READY')) continue;

      // Check full readiness (all deps met)
      const readiness = await this.checkTaskReadiness(task.id);
      if (readiness.ready) {
        await db.update(TASKS)
          .set({ status: 'READY', updated_at: new Date() })
          .where(eq(TASKS.id, task.id));
        promoted.push(task.id);
      }
    }

    return promoted;
  }

  // ==================== COORDINATION TYPES ====================

  /**
   * Get all coordination types
   */
  async getCoordinationTypes() {
    const defs = await db.select({
      code: COORDINATION_TYPES.code,
      description: COORDINATION_TYPES.description,
      createdAt: COORDINATION_TYPES.created_at,
      updatedAt: COORDINATION_TYPES.updated_at
    })
    .from(COORDINATION_TYPES)
    .orderBy(asc(COORDINATION_TYPES.code));

    return defs;
  }

  /**
   * Get coordination type by code
   */
  async getCoordinationTypeByCode(/** @type {any} */ code) {
    const [def] = await db.select({
      code: COORDINATION_TYPES.code,
      description: COORDINATION_TYPES.description,
      createdAt: COORDINATION_TYPES.created_at,
      updatedAt: COORDINATION_TYPES.updated_at
    })
    .from(COORDINATION_TYPES)
    .where(eq(COORDINATION_TYPES.code, code))
    .limit(1);

    return def || null;
  }

  // ==================== STATUS DEFINITIONS OPERATIONS ====================

  /**
   * Get all available status definitions
   */
  async getStatusDefinitions() {
    const statuses = await db.select({
      code: STATUS_DEFINITIONS.code,
      description: STATUS_DEFINITIONS.description,
      createdAt: STATUS_DEFINITIONS.created_at,
      updatedAt: STATUS_DEFINITIONS.updated_at
    })
    .from(STATUS_DEFINITIONS)
    .orderBy(asc(STATUS_DEFINITIONS.code));

    return statuses;
  }

  /**
   * Get status definition by code
   */
  async getStatusDefinitionByCode(/** @type {any} */ code) {
    const [status] = await db.select({
      code: STATUS_DEFINITIONS.code,
      description: STATUS_DEFINITIONS.description,
      createdAt: STATUS_DEFINITIONS.created_at,
      updatedAt: STATUS_DEFINITIONS.updated_at
    })
    .from(STATUS_DEFINITIONS)
    .where(eq(STATUS_DEFINITIONS.code, code))
    .limit(1);

    return status || null;
  }

  // ==================== TRANSLATIONS OPERATIONS ====================

  /**
   * Get translations by language code
   */
  async getTranslationsByLanguage(/** @type {any} */ languageCode) {
    const [translation] = await db.select({
      id: TRANSLATIONS.id,
      languageCode: TRANSLATIONS.language_code,
      translations: TRANSLATIONS.translations,
      updatedAt: TRANSLATIONS.updated_at
    })
    .from(TRANSLATIONS)
    .where(eq(TRANSLATIONS.language_code, languageCode))
    .limit(1);

    return translation || null;
  }

  /**
   * Get all available language codes
   */
  async getAvailableLanguages() {
    const languages = await db.select({
      languageCode: TRANSLATIONS.language_code
    })
    .from(TRANSLATIONS)
    .orderBy(asc(TRANSLATIONS.language_code));

    return languages.map(lang => lang.languageCode);
  }
}

export default DatabaseService;
