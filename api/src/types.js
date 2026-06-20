/**
 * Shared backend JSDoc typedefs.
 *
 * These types describe the camelCase service/API contracts derived from the
 * Drizzle schema and property mapper boundary.
 *
 * @typedef {number} EntityId
 * @typedef {string} StatusCode
 * @typedef {'FEATURE'|'BUG_FIX'|'REFACTOR'|'ENHANCEMENT'|'CHORE'|'DOCUMENTATION'} DeliverableType
 * @typedef {'DEPENDS_ON'|'COORDINATES_WITH'} TaskRelationType
 * @typedef {'user'|'agent'} TokenType
 *
 * @typedef {Record<string, unknown>} PlainObject
 *
 * @typedef {object} User
 * @property {number} id
 * @property {string} fullName
 * @property {string} email
 * @property {Date|string} [createdAt]
 * @property {Date|string} [updatedAt]
 *
 * @typedef {object} Project
 * @property {number} id
 * @property {string} title
 * @property {string} code
 * @property {string|null} [description]
 * @property {number} leaderId
 * @property {string|null} [leaderName]
 * @property {string|null} [leaderEmail]
 * @property {string[]} statusWorkflow
 * @property {string[]} deliverableStatusWorkflow
 * @property {number} [nextDeliverableSequence]
 * @property {string|null} [completionCriteriaStatus]
 * @property {'LR'|'TB'|null} [taskGraphLayoutDirection]
 * @property {Date|string} [createdAt]
 * @property {Date|string} [updatedAt]
 *
 * @typedef {object} Deliverable
 * @property {number} id
 * @property {number} projectId
 * @property {string} projectCode
 * @property {string} [code]
 * @property {string} [deliverableCode]
 * @property {string} name
 * @property {string|null} [description]
 * @property {DeliverableType|string} type
 * @property {StatusCode} status
 * @property {Array<PlainObject>|PlainObject|unknown} [statusHistory]
 * @property {string|null} [specFilepath]
 * @property {string|null} [planFilepath]
 * @property {number|null} [approvedBy]
 * @property {Date|string|null} [approvedAt]
 * @property {string|null} [gitWorktree]
 * @property {string|null} [gitBranch]
 * @property {string|null} [pullRequestUrl]
 * @property {number} [position]
 * @property {Date|string} [createdAt]
 * @property {Date|string} [updatedAt]
 *
 * @typedef {object} Task
 * @property {number} id
 * @property {number} projectId
 * @property {number} deliverableId
 * @property {number|null} [phase]
 * @property {string|null} [phaseStep]
 * @property {string} title
 * @property {StatusCode} status
 * @property {string} priority
 * @property {string|null} [agentName]
 * @property {string|null} [prompt]
 * @property {string|null} [notes]
 * @property {number|null} [storyPoints]
 * @property {number} position
 * @property {boolean|null} [isBlocked]
 * @property {string|null} [blockedReason]
 * @property {boolean|null} [isCancelled]
 * @property {string|null} [gitWorktree]
 * @property {string|null} [gitPullRequestUrl]
 * @property {Date|string|null} [startedAt]
 * @property {Date|string|null} [completedAt]
 * @property {string|null} [coordinationCode]
 * @property {Array<Tag|string>} [tags]
 * @property {Date|string} [createdAt]
 * @property {Date|string} [updatedAt]
 *
 * @typedef {object} Tag
 * @property {string} tag
 * @property {string} color
 * @property {Date|string} [createdAt]
 *
 * @typedef {object} StatusDefinition
 * @property {string} code
 * @property {string|null} [description]
 * @property {number|null} [createdBy]
 * @property {Date|string|null} [createdAt]
 * @property {number|null} [updatedBy]
 * @property {Date|string|null} [updatedAt]
 *
 * @typedef {object} AgentTokenContext
 * @property {'agent'} type
 * @property {number} userId
 * @property {number} projectId
 * @property {string|null} projectCode
 * @property {string|null} [label]
 * @property {string|null} [email]
 * @property {string|null} [fullName]
 *
 * @typedef {object} UserTokenContext
 * @property {'user'} type
 * @property {number} userId
 * @property {string|null} [email]
 * @property {string|null} [fullName]
 *
 * @typedef {AgentTokenContext|UserTokenContext} TokenContext
 *
 * @typedef {object} AuthUser
 * @property {number} id
 * @property {string|null|undefined} email
 * @property {string|null|undefined} fullName
 *
 * @typedef {object} AuthContext
 * @property {AuthUser} user
 * @property {TokenType} tokenType
 * @property {number|null} [agentTokenProjectId]
 * @property {string|null} [agentTokenProjectCode]
 * @property {number|null} [agentTokenUserId]
 *
 * @typedef {object} FileLock
 * @property {number} id
 * @property {number} projectId
 * @property {number} deliverableId
 * @property {number} taskId
 * @property {string|null} phaseStep
 * @property {string} agentName
 * @property {string} fileRelativePath
 * @property {Date|string} acquiredAt
 * @property {Date|string} heartbeatAt
 * @property {Date|string} leaseExpiresAt
 *
 * @typedef {object} ImageMetadata
 * @property {number} id
 * @property {number|null} [taskId]
 * @property {number|null} [deliverableId]
 * @property {string} originalName
 * @property {string} contentType
 * @property {number} fileSize
 * @property {string} url
 * @property {string} storageType
 * @property {Date|string} [createdAt]
 *
 * @typedef {object} RealtimeEventPayload
 * @property {string} [type]
 * @property {string} [eventType]
 * @property {number} [taskId]
 * @property {number[]} [taskIds]
 * @property {number|null} [deliverableId]
 * @property {StatusCode} [status]
 * @property {StatusCode} [previousStatus]
 * @property {number} [position]
 * @property {boolean} [isCancelled]
 * @property {unknown} [key]
 * @property {unknown} [value]
 *
 * @typedef {object} SseSubscriber
 * @property {(message: string) => void} send
 */

export {};
