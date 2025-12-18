import { db } from '../../lib/db/index.js';
import { TAGS } from '../../lib/db/schema.js';
import { getAllTagColors } from '../../src/utils/tagColors.js';

export async function seedTags() {
  console.log('  📝 Seeding tags...');
  
  try {
    const colors = getAllTagColors();
    
    await db.insert(TAGS).values([
      { 
        tag: 'frontend',
        color: colors[0] // Blue
      },
      { 
        tag: 'backend',
        color: colors[1] // Emerald
      },
      { 
        tag: 'urgent',
        color: colors[3] // Red
      },
      { 
        tag: 'bug-fix',
        color: colors[7] // Orange
      },
      { 
        tag: 'feature',
        color: colors[4] // Violet
      },
      { 
        tag: 'testing',
        color: colors[5] // Cyan
      },
      { 
        tag: 'database',
        color: colors[9] // Indigo
      },
      { 
        tag: 'ui-ux',
        color: colors[8] // Pink
      },
      { 
        tag: 'performance',
        color: colors[6] // Lime
      },
      { 
        tag: 'security',
        color: colors[2] // Amber
      }
    ]);
    
    console.log('  ✅ Tags seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding tags:', error.message);
    throw error;
  }
}
