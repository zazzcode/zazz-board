import * as pactum from 'pactum';
import { eq } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import { PROJECTS } from '../../lib/db/schema.js';
import { clearTaskData, resetProjectDefaults } from '../helpers/testDatabase.js';

const { spec } = pactum;
const USER_TOKEN = '550e8400-e29b-41d4-a716-446655440000';
const ZAZZ_AGENT_TOKEN = '660e8400-e29b-41d4-a716-446655440101';
const ZED_MER_AGENT_TOKEN = '660e8400-e29b-41d4-a716-446655440103';

describe('Agent token routes', () => {
  beforeEach(async () => {
    await clearTaskData();
    await resetProjectDefaults();
  });

  it('lists current user agent tokens for a project', async () => {
    const response = await spec()
      .get('/projects/ZAZZ/users/me/agent-tokens')
      .withHeaders('TB_TOKEN', USER_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(response.userId).toBe(5);
    expect(response.tokens).toHaveLength(2);
    expect(response.tokens[0].token).toMatch(/^660e8400-e29b-41d4-a716-44665544010\d$/);
  });

  it('rejects non-leader access to another users tokens', async () => {
    await spec()
      .get('/projects/ZED_MER/users/2/agent-tokens')
      .withHeaders('TB_TOKEN', USER_TOKEN)
      .expectStatus(403);
  });

  it('allows the project leader to view the project token tree', async () => {
    await db
      .update(PROJECTS)
      .set({ leader_id: 5 })
      .where(eq(PROJECTS.code, 'ZED_MER'));

    const response = await spec()
      .get('/projects/ZED_MER/agent-tokens')
      .withHeaders('TB_TOKEN', USER_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(Array.isArray(response.users)).toBe(true);
    const jane = response.users.find((user) => user.userId === 2);
    expect(jane.tokens).toHaveLength(2);
  });

  it('creates an agent token and it works immediately on the same project', async () => {
    const created = await spec()
      .post('/projects/ZAZZ/users/me/agent-tokens')
      .withHeaders('TB_TOKEN', USER_TOKEN)
      .withJson({ label: 'QA agent token' })
      .expectStatus(201)
      .returns('res.body');

    expect(created.label).toBe('QA agent token');
    expect(created.token).toMatch(/^[0-9a-f-]{36}$/);

    await spec()
      .get('/projects/ZAZZ/deliverables')
      .withHeaders('TB_TOKEN', created.token)
      .expectStatus(200);

    await spec()
      .get('/projects/ZED_MER/deliverables')
      .withHeaders('TB_TOKEN', created.token)
      .expectStatus(403);
  });

  it('deletes an agent token and invalidates it immediately', async () => {
    const created = await spec()
      .post('/projects/ZAZZ/users/me/agent-tokens')
      .withHeaders('TB_TOKEN', USER_TOKEN)
      .withJson({ label: 'Temporary token' })
      .expectStatus(201)
      .returns('res.body');

    await spec()
      .delete(`/projects/ZAZZ/users/me/agent-tokens/${created.id}`)
      .withHeaders('TB_TOKEN', USER_TOKEN)
      .expectStatus(200)
      .expectJsonLike({ message: 'Token revoked' });

    await spec()
      .get('/projects/ZAZZ/deliverables')
      .withHeaders('TB_TOKEN', created.token)
      .expectStatus(401);
  });

  it('rejects agent tokens on agent-token management endpoints and cache refresh', async () => {
    await spec()
      .get('/projects/ZAZZ/users/me/agent-tokens')
      .withHeaders('TB_TOKEN', ZAZZ_AGENT_TOKEN)
      .expectStatus(403);

    await spec()
      .post('/token-cache/refresh')
      .withHeaders('TB_TOKEN', ZAZZ_AGENT_TOKEN)
      .expectStatus(403);
  });

  it('refreshes the token cache for user tokens only', async () => {
    const response = await spec()
      .post('/token-cache/refresh')
      .withHeaders('TB_TOKEN', USER_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(response.success).toBe(true);
    expect(response.auth.userCount).toBeGreaterThan(0);
    expect(response.auth.agentTokenCount).toBeGreaterThan(0);

    await spec().post('/token-cache/refresh').expectStatus(401);
  });

  it('does not expose token update routes', async () => {
    await spec()
      .patch('/projects/ZAZZ/users/me/agent-tokens/1')
      .withHeaders('TB_TOKEN', USER_TOKEN)
      .withJson({ label: 'Updated label' })
      .expectStatus(404);

    await spec()
      .put('/projects/ZAZZ/users/me/agent-tokens/1')
      .withHeaders('TB_TOKEN', USER_TOKEN)
      .withJson({ label: 'Updated label' })
      .expectStatus(404);
  });

  it('rejects wrong-project seeded agent tokens on project routes', async () => {
    await spec()
      .get('/projects/ZAZZ/deliverables')
      .withHeaders('TB_TOKEN', ZED_MER_AGENT_TOKEN)
      .expectStatus(403);
  });
});
