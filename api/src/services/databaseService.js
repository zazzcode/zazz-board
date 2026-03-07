import { eq, and, sql, desc, asc, like, or, inArray, ne } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import { USERS, PROJECTS, DELIVERABLES, TASKS, TAGS, TASK_TAGS, IMAGE_METADATA, IMAGE_DATA, STATUS_DEFINITIONS, TRANSLATIONS, TASK_RELATIONS, COORDINATION_TYPES } from '../../lib/db/schema.js';
import { getRandomTagColor } from '../utils/tagColors.js';
import { keysToCamelCase } from '../utils/propertyMapper.js';
import { randomUUID } from 'crypto';

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
  async getUsers(searchTerm = null) {
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
   */
  async getUserById(id) {
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
  async createUser(userData) {
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
  async updateUser(id, userData) {
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
  async deleteUser(id) {
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
  async getProjectById(id) {
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
   */
  async getProjectByCode(code) {
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
  async createProject(projectData) {
    const [project] = await db.insert(PROJECTS)
      .values({
        title: projectData.title,
        code: projectData.code,
        description: projectData.description,
        leader_id: projectData.leaderId,
        status_workflow: projectData.statusWorkflow || ['READY', 'IN_PROGRESS', 'QA', 'COMPLETED'],
        deliverable_status_workflow: projectData.deliverableStatusWorkflow || ['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'STAGED', 'DONE']
      })
      .returning();
    
    return project;
  }

  /**
   * Update project - Project codes are immutable after creation
   */
  async updateProject(id, projectData) {
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
  async deleteProject(id) {
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
  async getProjectStatusWorkflow(projectId) {
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
  async updateProjectStatusWorkflow(projectId, statusWorkflow, updatedBy) {
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
  async hasTasksWithStatus(projectId, status) {
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

  async hasDeliverablesWithStatus(projectId, status) {
    const [result] = await db.select({
      count: sql`COUNT(*)`.as('count')
    })
    .from(DELIVERABLES)
    .where(and(eq(DELIVERABLES.project_id, projectId), eq(DELIVERABLES.status, status)));

    return parseInt(result.count) > 0;
  }

  async getProjectDeliverableStatusWorkflow(projectId) {
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

  async updateProjectDeliverableStatusWorkflow(projectId, deliverableStatusWorkflow, updatedBy) {
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

  async getDeliverablesForProject(projectId, filters = {}) {
    const conditions = [eq(DELIVERABLES.project_id, projectId)];
    if (filters.status) conditions.push(eq(DELIVERABLES.status, filters.status));
    if (filters.type) conditions.push(eq(DELIVERABLES.type, filters.type));

    const rows = await db.select({
      id: DELIVERABLES.id,
      projectId: DELIVERABLES.project_id,
      projectCode: DELIVERABLES.project_code,
      deliverableCode: DELIVERABLES.deliverable_code,
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
      DELIVERABLES.project_code,
      DELIVERABLES.deliverable_code,
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
      DELIVERABLES.created_by,
      DELIVERABLES.created_at,
      DELIVERABLES.updated_by,
      DELIVERABLES.updated_at
    )
    .orderBy(asc(DELIVERABLES.position), asc(DELIVERABLES.id));

    return rows;
  }

  async getDeliverableById(id) {
    const [deliverable] = await db.select({
      id: DELIVERABLES.id,
      projectId: DELIVERABLES.project_id,
      projectCode: DELIVERABLES.project_code,
      deliverableCode: DELIVERABLES.deliverable_code,
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

  async createDeliverable(projectId, data, userId) {
    const created = await db.transaction(async (tx) => {
      const [project] = await tx.select().from(PROJECTS).where(eq(PROJECTS.id, projectId)).limit(1);
      if (!project) throw new Error('Project not found');

      const deliverableCode = `${project.code}-${project.next_deliverable_sequence}`;
      await tx.update(PROJECTS)
        .set({ next_deliverable_sequence: project.next_deliverable_sequence + 1, updated_by: userId, updated_at: new Date() })
        .where(eq(PROJECTS.id, projectId));

      const [maxPosition] = await tx.select({ max: sql`COALESCE(MAX(${DELIVERABLES.position}),0)`.as('max') })
        .from(DELIVERABLES).where(eq(DELIVERABLES.project_id, projectId));
      const nextPosition = Math.floor(maxPosition.max / 10) * 10 + 10;

      const [row] = await tx.insert(DELIVERABLES).values({
        project_id: projectId,
        project_code: project.code,
        deliverable_code: deliverableCode,
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
        created_by: userId,
        updated_by: userId
      }).returning();

      return row;
    });

    return await this.getDeliverableById(created.id);
  }

  async updateDeliverable(id, data, userId) {
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
    updateData.updated_by = userId;
    updateData.updated_at = new Date();

    const [updated] = await db.update(DELIVERABLES).set(updateData).where(eq(DELIVERABLES.id, id)).returning();
    if (!updated) return null;
    return await this.getDeliverableById(id);
  }

  async deleteDeliverable(id) {
    const [deleted] = await db.delete(DELIVERABLES).where(eq(DELIVERABLES.id, id)).returning();
    return deleted || null;
  }

  async approveDeliverablePlan(id, userId) {
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

  async updateDeliverableStatus(id, status, userId) {
    const deliverable = await this.getDeliverableById(id);
    if (!deliverable) throw new Error('Deliverable not found');

    const [project] = await db.select({ workflow: PROJECTS.deliverable_status_workflow })
      .from(PROJECTS).where(eq(PROJECTS.id, deliverable.projectId)).limit(1);
    if (!project?.workflow?.includes(status)) throw new Error(`Status ${status} not allowed for this project`);

    if (status === 'IN_PROGRESS') {
      if (!deliverable.planFilepath) throw new Error('plan_filepath must be set before moving to IN_PROGRESS');
      if (!deliverable.approvedAt) throw new Error('Deliverable must be approved before moving to IN_PROGRESS');
    }

    const nextHistory = Array.isArray(deliverable.statusHistory) ? [...deliverable.statusHistory] : [];
    nextHistory.push({ status, changedAt: new Date().toISOString(), changedBy: userId });

    const [updated] = await db.update(DELIVERABLES)
      .set({ status, status_history: nextHistory, updated_by: userId, updated_at: new Date() })
      .where(eq(DELIVERABLES.id, id))
      .returning();
    if (!updated) return null;
    return await this.getDeliverableById(id);
  }

  async getTasksForDeliverable(deliverableId) {
    return await this.getTasks({ deliverableId });
  }

  // ==================== TASK OPERATIONS ====================

  /**
   * Get tasks for a specific project with assignees and tags
   */
  async getTasksForProject(projectId) {
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
      tasks.map(async (task) => {
        const tags = await this.getTagsForTask(task.id);
        return { ...task, tags };
      })
    );

    return tasksWithTags;
  }

  /**
   * Get all tasks with filters
   */
  async getTasks(filters = {}) {
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
      tasks.map(async (task) => {
        const tags = await this.getTagsForTask(task.id);
        return { ...task, tags };
      })
    );

    return tasksWithTags;
  }

  /**
   * Get task by ID with full details
   */
  async getTaskById(id) {
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
  async getTaskByTaskId(taskId) {
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
  async createTask(taskData) {
    if (!taskData.deliverableId) {
      throw new Error('deliverableId is required');
    }

    const task = await db.transaction(async (tx) => {
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
        const depValues = taskData.dependencies.map(depId => ({
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
  async updateTask(id, taskData) {
    // Read current state including cancellation flag
    const [current] = await db.select({
      status: TASKS.status,
      isCancelled: TASKS.is_cancelled
    }).from(TASKS).where(eq(TASKS.id, id)).limit(1);
    const beforeStatus = current?.status;

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
    
    const [task] = await db.update(TASKS)
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
  async updateTaskPosition(taskId, newPosition, status) {
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
  async redistributeColumnPositions(projectId, status) {
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
    const updatePromises = tasks.map((task, index) => {
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
  async deleteTask(id) {
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
  validateTagName(tagName) {
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
   */
  async getTags(searchTerm = null) {
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
  async getTagByName(tagName) {
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
  async createTag(tagData) {
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
  async updateTag(tagName, tagData) {
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
  async deleteTag(tagName) {
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
  async getTagsForTask(taskId) {
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
  async setTaskTags(taskId, tagNames) {
    // Remove existing tags
    await db.delete(TASK_TAGS).where(eq(TASK_TAGS.task_id, taskId));
    
    // Add new tags
    if (tagNames && tagNames.length > 0) {
      const taskTagData = tagNames.map(tagName => ({
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
  async getTaskImages(taskId) {
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
  async getDeliverableImages(deliverableId) {
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
   */
  async storeTaskImage(taskId, imageData, imageUrlBase = '/images') {
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
  async storeDeliverableImage(deliverableId, imageData, imageUrlBase = '/images') {
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
  async getImageWithData(imageId) {
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
  async getImageMetadata(imageId) {
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
  async deleteImage(imageId) {
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

  // ==================== UTILITY METHODS ====================

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      const result = await db.execute(sql`SELECT 1 as test`);
      return { status: 'connected', result };
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  /**
   * Get column positions for a specific project and status
   */
  async getColumnPositions(projectId, status) {
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
  async updateColumnPositions(projectId, status, positionUpdates) {
    // Update only the tasks that need position changes
    const updatePromises = positionUpdates.map(({ taskId, newPosition }) => {
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
  calculateSparsePositions(tasks, insertIndex, insertPosition) {
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
  async getTaskRelations(taskId) {
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
   */
  async createTaskRelation(taskId, relatedTaskId, relationType, updatedBy = null) {
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
  async deleteTaskRelation(taskId, relatedTaskId, relationType) {
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
  async getProjectTaskGraph(projectId) {
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
  async getDeliverableTaskGraph(deliverableId) {
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
  async wouldCreateCycle(taskId, relatedTaskId) {
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
  async checkTaskReadiness(taskId) {
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
  async checkAndPromoteDependents(completedTaskId) {
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
  async getCoordinationTypeByCode(code) {
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
  async getStatusDefinitionByCode(code) {
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
  async getTranslationsByLanguage(languageCode) {
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
