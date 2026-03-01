# Testing

## Frameworks

- **API**: Vitest + PactumJS integration tests
- **Tests**: `api/__tests__/`; run against `task_blaster_test` DB

## Patterns

- `beforeEach` calls `clearTaskData()` (deletes TASK_RELATIONS, TASK_TAGS, TASKS, DELIVERABLES)
- Create test deliverables via `createTestDeliverable()`; tasks require `deliverableId`
- Tests use port 3031; API base URL from env

## Commands

```bash
cd api && set -a && source .env && set +a && NODE_ENV=test npm run test
```
