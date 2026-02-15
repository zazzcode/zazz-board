import { db } from '../../lib/db/index.js';
import { TASKS } from '../../lib/db/schema.js';

export async function seedTasks() {
  console.log('  📝 Seeding tasks...');
  
  try {
    await db.insert(TASKS).values([
      { 
        project_id: 1, 
        task_id: 'WEBRED-1', 
        title: 'Design mockups for homepage', 
        prompt: 'Create wireframes and high-fidelity designs for the new homepage',
        status: 'READY',
        priority: 'HIGH',
        assignee_id: 2,
        position: 10
      },
      { 
        project_id: 1, 
        task_id: 'WEBRED-2', 
        title: 'Implement responsive navigation', 
        prompt: 'Build mobile-first navigation component',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        assignee_id: 1,
        position: 20
      },
      { 
        project_id: 2, 
        task_id: 'MOBDEV-1', 
        title: 'Setup React Native environment', 
        prompt: 'Configure development environment for React Native',
        status: 'DONE',
        priority: 'HIGH',
        assignee_id: 3,
        position: 10
      },
      { 
        project_id: 2, 
        task_id: 'MOBDEV-2', 
        title: 'Create authentication screens', 
        prompt: 'Build login and registration screens',
        status: 'READY',
        priority: 'MEDIUM',
        assignee_id: 2,
        position: 20
      },
      { 
        project_id: 3, 
        task_id: 'APIMOD-1', 
        title: 'Audit existing API endpoints', 
        prompt: 'Document and analyze current API structure',
        status: 'READY_FOR_DEPLOY',
        priority: 'HIGH',
        assignee_id: 4,
        position: 10
      },
      // Additional tasks for API Modernization project
      { 
        project_id: 3, 
        task_id: 'APIMOD-2', 
        title: 'Design new REST API architecture', 
        prompt: 'Create comprehensive API design with OpenAPI specification',
        status: 'IN_PROGRESS',
        priority: 'CRITICAL',
        assignee_id: 3,
        position: 20
      },
      { 
        project_id: 3, 
        task_id: 'APIMOD-3', 
        title: 'Implement authentication middleware', 
        prompt: 'Build JWT-based authentication system for API endpoints',
        status: 'TO_DO',
        priority: 'HIGH',
        assignee_id: 1,
        position: 30
      },
      { 
        project_id: 3, 
        task_id: 'APIMOD-4', 
        title: 'Create database migration scripts', 
        prompt: 'Develop scripts to migrate existing data to new schema',
        status: 'READY',
        priority: 'MEDIUM',
        assignee_id: 2,
        position: 40
      },
      { 
        project_id: 3, 
        task_id: 'APIMOD-5', 
        title: 'Write API documentation', 
        prompt: 'Create comprehensive documentation with examples',
        status: 'READY',
        priority: 'LOW',
        assignee_id: 4,
        position: 10
      },
      { 
        project_id: 3, 
        task_id: 'APIMOD-6', 
        title: 'Performance testing and optimization', 
        prompt: 'Conduct load testing and optimize API response times',
        status: 'TO_DO',
        priority: 'MEDIUM',
        assignee_id: 1,
        position: 50
      },
      { 
        project_id: 3, 
        task_id: 'APIMOD-7', 
        title: 'Implement API versioning strategy', 
        prompt: 'Add URL-based versioning (v1, v2) with backward compatibility layer',
        status: 'TO_DO',
        priority: 'HIGH',
        assignee_id: 3,
        position: 60
      },
      { 
        project_id: 3, 
        task_id: 'APIMOD-8', 
        title: 'Add rate limiting middleware', 
        prompt: 'Implement per-user and per-endpoint rate limiting with Redis backing',
        status: 'TO_DO',
        priority: 'MEDIUM',
        assignee_id: 4,
        position: 70
      },
      { 
        project_id: 3, 
        task_id: 'APIMOD-9', 
        title: 'Standardize error handling responses', 
        prompt: 'Create unified error response format with error codes and i18n messages',
        status: 'TO_DO',
        priority: 'MEDIUM',
        assignee_id: 2,
        position: 80
      },
      // APIMOD-10 and APIMOD-11: widen the fan-out from APIMOD-2 to 7 tasks total
      { 
        project_id: 3, 
        task_id: 'APIMOD-10', 
        title: 'Build response caching layer', 
        prompt: 'Implement Redis-backed caching for GET endpoints with TTL configuration',
        status: 'TO_DO',
        priority: 'HIGH',
        assignee_id: 3,
        position: 90
      },
      { 
        project_id: 3, 
        task_id: 'APIMOD-11', 
        title: 'Setup structured request logging', 
        prompt: 'Add JSON structured logging with correlation IDs and request tracing',
        status: 'TO_DO',
        priority: 'MEDIUM',
        assignee_id: 4,
        position: 100
      },
      // APIMOD-12, 13, 14: convergence tasks (fan-in)
      { 
        project_id: 3, 
        task_id: 'APIMOD-12', 
        title: 'End-to-end integration testing', 
        prompt: 'Full integration test suite covering all new API endpoints',
        status: 'TO_DO',
        priority: 'HIGH',
        assignee_id: 3,
        position: 110
      },
      { 
        project_id: 3, 
        task_id: 'APIMOD-13', 
        title: 'API gateway configuration', 
        prompt: 'Configure API gateway routing, throttling, and SSL termination',
        status: 'TO_DO',
        priority: 'MEDIUM',
        assignee_id: 1,
        position: 120
      },
      { 
        project_id: 3, 
        task_id: 'APIMOD-14', 
        title: 'Production deployment readiness', 
        prompt: 'Final checklist: monitoring, alerting, rollback plan, load test signoff',
        status: 'TO_DO',
        priority: 'CRITICAL',
        assignee_id: 5,
        position: 130
      },
      // WEBRED expanded graph (4-wide fan-out)
      { 
        project_id: 1, 
        task_id: 'WEBRED-3', 
        title: 'Setup component library', 
        prompt: 'Initialize shared UI component library with Storybook',
        status: 'TO_DO',
        priority: 'HIGH',
        assignee_id: 1,
        position: 30
      },
      { 
        project_id: 1, 
        task_id: 'WEBRED-4', 
        title: 'Build header component', 
        prompt: 'Responsive header with navigation, search, and user menu',
        status: 'TO_DO',
        priority: 'MEDIUM',
        assignee_id: 2,
        position: 40
      },
      { 
        project_id: 1, 
        task_id: 'WEBRED-5', 
        title: 'Build footer component', 
        prompt: 'Footer with sitemap links, social icons, and newsletter signup',
        status: 'TO_DO',
        priority: 'LOW',
        assignee_id: 4,
        position: 50
      },
      { 
        project_id: 1, 
        task_id: 'WEBRED-6', 
        title: 'Build sidebar navigation', 
        prompt: 'Collapsible sidebar with nested navigation and active state',
        status: 'TO_DO',
        priority: 'MEDIUM',
        assignee_id: 3,
        position: 60
      },
      { 
        project_id: 1, 
        task_id: 'WEBRED-7', 
        title: 'Build hero section', 
        prompt: 'Animated hero section with carousel and CTA buttons',
        status: 'TO_DO',
        priority: 'HIGH',
        assignee_id: 1,
        position: 70
      },
      { 
        project_id: 1, 
        task_id: 'WEBRED-8', 
        title: 'Page integration testing', 
        prompt: 'Integration tests for all page layouts with components',
        status: 'TO_DO',
        priority: 'HIGH',
        assignee_id: 2,
        position: 80
      },
      { 
        project_id: 1, 
        task_id: 'WEBRED-9', 
        title: 'Cross-browser QA testing', 
        prompt: 'Test across Chrome, Firefox, Safari, Edge and mobile browsers',
        status: 'TO_DO',
        priority: 'MEDIUM',
        assignee_id: 4,
        position: 90
      }
    ]);
    
    console.log('  ✅ Tasks seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding tasks:', error.message);
    throw error;
  }
}
