export function applyGitStatus(task) {
  // If current status is TO_DO and feature branch name is not null, change status to IN_PROGRESS
  if (task.gitFeatureBranch && task.status === 'TO_DO') {
    task.status = 'IN_PROGRESS';
  }
  // If PR URL is not null and status is IN_PROGRESS, set status to IN_REVIEW
  if (task.gitPullRequestUrl && task.status === 'IN_PROGRESS') {
    task.status = 'IN_REVIEW';
  }
  return task;
}
