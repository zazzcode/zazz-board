// This file is intentionally minimal.
// All task-related routes are now organized as follows:
// - Task graph routes (relations, readiness): /src/routes/taskGraph.js
// - Deliverable-scoped task CRUD: /src/routes/projects.js under /projects/:code/deliverables/:delivId/tasks/*

export default async function taskRoutes(_fastify, _options) {
  // No global task routes - all task operations are now project/deliverable-scoped
  // or task graph operations (handled in taskGraph.js)
}
