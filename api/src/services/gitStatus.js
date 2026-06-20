/**
 * Apply derived git-workflow status hints to a task object.
 * @param {import('../types.js').Task} task - Task contract to mutate in place.
 * @returns {import('../types.js').Task} The same task object with derived status updates.
 */
export function applyGitStatus(/** @type {import('../types.js').Task} */ task) {
  // If current status is TO_DO and feature branch name is not null, change status to IN_PROGRESS
  if (/** @type {any} */ task.gitWorktree && task.status === 'TO_DO') {
    task.status = 'IN_PROGRESS';
  }
  // If PR URL is not null and status is IN_PROGRESS, set status to IN_REVIEW
  if (/** @type {any} */ task.gitPullRequestUrl && task.status === 'IN_PROGRESS') {
    task.status = 'IN_REVIEW';
  }
  return task;
}
