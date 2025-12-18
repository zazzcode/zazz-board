import { db } from '../../lib/db/index.js';
import { USERS } from '../../lib/db/schema.js';
import { randomUUID } from 'crypto';

export async function seedUsers() {
  console.log('  📝 Seeding users...');
  
  try {
    await db.insert(USERS).values([
      { 
        full_name: 'John Doe', 
        email: 'john.doe@example.com',
        access_token: randomUUID()
      },
      { 
        full_name: 'Jane Smith', 
        email: 'jane.smith@example.com',
        access_token: randomUUID()
      },
      { 
        full_name: 'Mike Johnson', 
        email: 'mike.johnson@example.com',
        access_token: randomUUID()
      },
      { 
        full_name: 'Sarah Wilson', 
        email: 'sarah.wilson@example.com',
        access_token: randomUUID()
      },
      { 
        full_name: 'Michael Woytowitz', 
        email: 'michael@witzware.com',
        access_token: '550e8400-e29b-41d4-a716-446655440000'
      }
    ]);
    
    console.log('  ✅ Users seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding users:', error.message);
    throw error;
  }
}
