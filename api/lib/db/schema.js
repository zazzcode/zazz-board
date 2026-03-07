import { pgTable, serial, varchar, text, timestamp, integer, boolean, jsonb, primaryKey, index, unique, check } from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

// ==================== PostgreSQL ENUMs ====================
// System-controlled keywords → ENUM; user-definable values → varchar

// Enum for task relation types
export const taskRelationTypeEnum = pgEnum('task_relation_type', ['DEPENDS_ON', 'COORDINATES_WITH']);

// Enum for graph layout direction
export const graphLayoutDirectionEnum = pgEnum('graph_layout_direction', ['LR', 'TB']);

// Enum for deliverable types
export const deliverableTypeEnum = pgEnum('deliverable_type', ['FEATURE', 'BUG_FIX', 'REFACTOR', 'ENHANCEMENT', 'CHORE', 'DOCUMENTATION']);

// Users table - using integer sequence as primary key (best practice for scalability)
export const USERS = pgTable('USERS', {
  id: serial('id').primaryKey(),
  full_name: varchar('full_name', { length: 200 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  access_token: varchar('access_token', { length: 255 }).notNull().unique(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Tags table - using tag string as primary key since it's unique and natural
export const TAGS = pgTable('TAGS', {
  tag: varchar('tag', { length: 100 }).primaryKey(), // Lowercase tag string as primary key
  color: varchar('color', { length: 7 }).notNull(), // Hex color code like #FF5733
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Status Definitions table - instance-level status codes
export const STATUS_DEFINITIONS = pgTable('STATUS_DEFINITIONS', {
  code: varchar('code', { length: 25 }).primaryKey(),
  description: varchar('description', { length: 200 }),
  created_by: integer('created_by').references(() => USERS.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_by: integer('updated_by').references(() => USERS.id, { onDelete: 'set null' }),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Coordination Types table - reference table for task coordination types
export const COORDINATION_TYPES = pgTable('COORDINATION_TYPES', {
  code: varchar('code', { length: 25 }).primaryKey().notNull(),
  description: varchar('description', { length: 200 }),
  created_by: integer('created_by').references(() => USERS.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_by: integer('updated_by').references(() => USERS.id, { onDelete: 'set null' }),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Translations table - stores all UI translations as JSONB
export const TRANSLATIONS = pgTable('TRANSLATIONS', {
  id: serial('id').primaryKey(),
  language_code: varchar('language_code', { length: 5 }).notNull().unique(),
  translations: text('translations').notNull(), // JSONB stored as text
  created_by: integer('created_by').references(() => USERS.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_by: integer('updated_by').references(() => USERS.id, { onDelete: 'set null' }),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Projects table
export const PROJECTS = pgTable('PROJECTS', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  code: varchar('code', { length: 10 }).notNull().unique(),
  description: text('description'),
  leader_id: integer('leader_id').notNull().references(() => USERS.id, { onDelete: 'restrict' }),
  next_deliverable_sequence: integer('next_deliverable_sequence').notNull().default(1),
  status_workflow: varchar('status_workflow', { length: 25 }).array().notNull().default(sql`ARRAY['READY', 'IN_PROGRESS', 'QA', 'COMPLETED']::varchar[]`),
  deliverable_status_workflow: varchar('deliverable_status_workflow', { length: 25 }).array().notNull().default(sql`ARRAY['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'STAGED', 'DONE']::varchar[]`),
  completion_criteria_status: varchar('completion_criteria_status', { length: 25 })
    .references(() => STATUS_DEFINITIONS.code, { onDelete: 'set null' }),
  task_graph_layout_direction: graphLayoutDirectionEnum('task_graph_layout_direction').default('LR'),
  created_by: integer('created_by').references(() => USERS.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_by: integer('updated_by').references(() => USERS.id, { onDelete: 'set null' }),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Deliverables table
export const DELIVERABLES = pgTable('DELIVERABLES', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => PROJECTS.id, { onDelete: 'cascade' }),
  project_code: varchar('project_code', { length: 10 }).notNull(),
  deliverable_code: varchar('deliverable_code', { length: 25 }).notNull().unique(),
  name: varchar('name', { length: 30 }).notNull(),
  description: text('description'),
  type: deliverableTypeEnum('type').notNull(),
  status: varchar('status', { length: 25 }).notNull().default('PLANNING'),
  status_history: jsonb('status_history').notNull().default(sql`'[]'::jsonb`),
  spec_filepath: varchar('spec_filepath', { length: 500 }),
  plan_filepath: varchar('plan_filepath', { length: 500 }),
  approved_by: integer('approved_by').references(() => USERS.id, { onDelete: 'set null' }),
  approved_at: timestamp('approved_at', { withTimezone: true }),
  git_worktree: varchar('git_worktree', { length: 255 }),
  git_branch: varchar('git_branch', { length: 255 }),
  pull_request_url: varchar('pull_request_url', { length: 500 }),
  position: integer('position').notNull().default(10),
  created_by: integer('created_by').references(() => USERS.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_by: integer('updated_by').references(() => USERS.id, { onDelete: 'set null' }),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Tasks table
export const TASKS = pgTable('TASKS', {
  // --- Identity & relationships ---
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => PROJECTS.id, { onDelete: 'cascade' }),
  deliverable_id: integer('deliverable_id').notNull().references(() => DELIVERABLES.id, { onDelete: 'cascade' }),

  // --- Dynamic graph execution fields ---
  // Phase number (e.g. 1, 2, 3) — null for legacy/unphased tasks
  phase: integer('phase'),
  // Human-readable display ID within a deliverable: "1.1", "1.2", "1.2.1" (rework)
  // Unique per deliverable — enforced by constraint below
  phase_step: varchar('phase_step', { length: 20 }),

  // --- Core task fields ---
  title: varchar('title', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('READY'),
  priority: varchar('priority', { length: 20 }).notNull().default('MEDIUM'), // LOW, MEDIUM, HIGH, CRITICAL
  // Agent that claimed/worked this task (e.g. "worker-1", "qa-agent-2")
  agent_name: varchar('agent_name', { length: 50 }),
  // Leader writes the task goal, acceptance criteria, and context
  prompt: text('prompt'),
  // Append-only agent log: "[ISO timestamp] [agent name]: message"
  notes: text('notes'),

  // --- Estimation & ordering ---
  story_points: integer('story_points'),
  position: integer('position').notNull().default(0), // Kanban column ordering

  // --- State flags ---
  is_blocked: boolean('is_blocked').default(false),
  blocked_reason: text('blocked_reason'),
  // Cancelled is a flag, NOT a workflow status — the status field stays a clean
  // workflow state; dependents of a cancelled task can still be promoted normally
  is_cancelled: boolean('is_cancelled').default(false),

  // --- Tracking ---
  git_worktree: varchar('git_worktree'),
  started_at: timestamp('started_at', { withTimezone: true }),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  coordination_code: varchar('coordination_code', { length: 25 })
    .references(() => COORDINATION_TYPES.code, { onDelete: 'set null' }),

  // --- Audit (always last) ---
  created_by: integer('created_by').references(() => USERS.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_by: integer('updated_by').references(() => USERS.id, { onDelete: 'set null' }),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // phase_step must be unique within a deliverable (e.g. "1.1" unique per deliverable)
  unique('uq_tasks_deliverable_phase_step').on(table.deliverable_id, table.phase_step),
]);

// Task-Tags junction table
export const TASK_TAGS = pgTable('TASK_TAGS', {
  task_id: integer('task_id').notNull().references(() => TASKS.id, { onDelete: 'cascade' }),
  tag: varchar('tag', { length: 100 }).notNull().references(() => TAGS.tag, { onDelete: 'cascade' }),
});

// Task Relations junction table - composite PK (no surrogate integer PK, same pattern as TASK_TAGS)
export const TASK_RELATIONS = pgTable('TASK_RELATIONS', {
  task_id: integer('task_id').notNull().references(() => TASKS.id, { onDelete: 'cascade' }),
  related_task_id: integer('related_task_id').notNull().references(() => TASKS.id, { onDelete: 'cascade' }),
  relation_type: taskRelationTypeEnum('relation_type').notNull(),
  updated_by: integer('updated_by').references(() => USERS.id, { onDelete: 'set null' }),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.task_id, table.related_task_id, table.relation_type] }),
  index('idx_task_relations_task_id').on(table.task_id),
  index('idx_task_relations_related_task_id').on(table.related_task_id),
]);

// Image metadata table
export const IMAGE_METADATA = pgTable('IMAGE_METADATA', {
  id: serial('id').primaryKey(),
  task_id: integer('task_id').references(() => TASKS.id, { onDelete: 'cascade' }),
  deliverable_id: integer('deliverable_id').references(() => DELIVERABLES.id, { onDelete: 'cascade' }),
  original_name: varchar('original_name', { length: 255 }).notNull(),
  content_type: varchar('content_type', { length: 100 }).notNull(),
  file_size: integer('file_size').notNull(),
  url: varchar('url', { length: 500 }).notNull(), // Local DB URL or S3 URL
  storage_type: varchar('storage_type', { length: 20 }).notNull().default('local'), // 'local' or 's3'
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check(
    'image_metadata_single_owner_chk',
    sql`((${table.task_id} IS NOT NULL AND ${table.deliverable_id} IS NULL) OR (${table.task_id} IS NULL AND ${table.deliverable_id} IS NOT NULL))`
  ),
]);

// Image binary data table (for local storage)
export const IMAGE_DATA = pgTable('IMAGE_DATA', {
  id: integer('id').primaryKey().references(() => IMAGE_METADATA.id, { onDelete: 'cascade' }),
  data: text('data').notNull(), // Binary image data as base64 string
  thumbnail_data: text('thumbnail_data'), // Optional thumbnail data as base64 string
});

// Relations
export const usersRelations = relations(USERS, ({ many }) => ({
}));

export const projectsRelations = relations(PROJECTS, ({ one, many }) => ({
  leader: one(USERS, {
    fields: [PROJECTS.leader_id],
    references: [USERS.id],
  }),
  deliverables: many(DELIVERABLES),
  tasks: many(TASKS),
}));

export const deliverablesRelations = relations(DELIVERABLES, ({ one, many }) => ({
  project: one(PROJECTS, {
    fields: [DELIVERABLES.project_id],
    references: [PROJECTS.id],
  }),
  approvedByUser: one(USERS, {
    fields: [DELIVERABLES.approved_by],
    references: [USERS.id],
  }),
  createdByUser: one(USERS, {
    fields: [DELIVERABLES.created_by],
    references: [USERS.id],
  }),
  tasks: many(TASKS),
  images: many(IMAGE_METADATA),
}));

export const tasksRelations = relations(TASKS, ({ one, many }) => ({
  project: one(PROJECTS, {
    fields: [TASKS.project_id],
    references: [PROJECTS.id],
  }),
  deliverable: one(DELIVERABLES, {
    fields: [TASKS.deliverable_id],
    references: [DELIVERABLES.id],
  }),
  taskTags: many(TASK_TAGS),
  images: many(IMAGE_METADATA),
  relations: many(TASK_RELATIONS, { relationName: 'taskRelations' }),
  relatedRelations: many(TASK_RELATIONS, { relationName: 'relatedTaskRelations' }),
}));

export const taskRelationsRelations = relations(TASK_RELATIONS, ({ one }) => ({
  task: one(TASKS, {
    fields: [TASK_RELATIONS.task_id],
    references: [TASKS.id],
    relationName: 'taskRelations',
  }),
  relatedTask: one(TASKS, {
    fields: [TASK_RELATIONS.related_task_id],
    references: [TASKS.id],
    relationName: 'relatedTaskRelations',
  }),
}));

export const tagsRelations = relations(TAGS, ({ many }) => ({
  taskTags: many(TASK_TAGS),
}));

export const taskTagsRelations = relations(TASK_TAGS, ({ one }) => ({
  task: one(TASKS, {
    fields: [TASK_TAGS.task_id],
    references: [TASKS.id],
  }),
  tag: one(TAGS, {
    fields: [TASK_TAGS.tag],
    references: [TAGS.tag],
  }),
}));

export const imageMetadataRelations = relations(IMAGE_METADATA, ({ one }) => ({
  task: one(TASKS, {
    fields: [IMAGE_METADATA.task_id],
    references: [TASKS.id],
  }),
  deliverable: one(DELIVERABLES, {
    fields: [IMAGE_METADATA.deliverable_id],
    references: [DELIVERABLES.id],
  }),
  imageData: one(IMAGE_DATA, {
    fields: [IMAGE_METADATA.id],
    references: [IMAGE_DATA.id],
  }),
}));

export const imageDataRelations = relations(IMAGE_DATA, ({ one }) => ({
  metadata: one(IMAGE_METADATA, {
    fields: [IMAGE_DATA.id],
    references: [IMAGE_METADATA.id],
  }),
}));
