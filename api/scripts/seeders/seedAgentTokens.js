import { db } from '../../lib/db/index.js';
import { AGENT_TOKENS } from '../../lib/db/schema.js';

export async function seedAgentTokens() {
  console.log('  📝 Seeding agent tokens...');

  try {
    await db.insert(AGENT_TOKENS).values([
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
    ]);

    console.log('  ✅ Agent tokens seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding agent tokens:', error.message);
    throw error;
  }
}
