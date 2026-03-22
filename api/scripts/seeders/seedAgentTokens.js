import { db, client } from '../../lib/db/index.js';
import { AGENT_TOKENS } from '../../lib/db/schema.js';
import { fileURLToPath } from 'node:url';

export async function seedAgentTokens() {
  console.log('  📝 Seeding agent tokens...');

  try {
    const values = [
      {
        user_id: 5,
        project_id: 1,
        token: '660e8400-e29b-41d4-a716-446655440101',
        label: 'For all agents access token',
      },
      {
        user_id: 5,
        project_id: 1,
        token: '660e8400-e29b-41d4-a716-446655440102',
        label: 'Spec builder agent ONLY access token',
      },
      {
        user_id: 2,
        project_id: 2,
        token: '660e8400-e29b-41d4-a716-446655440103',
        label: 'For all agents access token',
      },
      {
        user_id: 2,
        project_id: 2,
        token: '660e8400-e29b-41d4-a716-446655440104',
        label: 'Spec builder agent ONLY access token',
      },
      {
        user_id: 3,
        project_id: 2,
        token: '660e8400-e29b-41d4-a716-446655440105',
        label: 'For all agents access token',
      },
      {
        user_id: 3,
        project_id: 2,
        token: '660e8400-e29b-41d4-a716-446655440106',
        label: 'Spec builder agent ONLY access token',
      },
    ];

    await db.insert(AGENT_TOKENS).values(values).onConflictDoNothing();

    console.log('  ✅ Agent tokens seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding agent tokens:', error.message);
    throw error;
  }
}

async function runFromCli() {
  try {
    await seedAgentTokens();
  } catch {
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runFromCli();
}
