# Implementation Plan - Task Blaster

This document provides a detailed implementation plan for transitioning the functionality of Task Blaster from the existing Next.js/TypeScript/Drizzle setup to a JavaScript/Fastify/Drizzle stack with JavaScript React client in a monorepo architecture.

## Phase 1: Documentation & Foundation

### 1.1 Documentation Setup ✅

- Create `GroundRules.md` in project root with technology stack and best practices
- Create `FunctionalSpecs.md` with detailed requirements
- Update `ImplementationPlan.md` with comprehensive approach
- Document database naming conventions (snake_case ↔ camelCase)
- Document Fastify best practices for routes, middleware, and logging

### 1.2 Project Initialization ✅

- Project initialized with Git (pre-configured)
- Basic project structure established

### 1.3 .gitignore and Environment Setup ✅

- **Gitignore Configuration**:
  - Root, API, and Client `.gitignore` files configured to exclude:
    - `node_modules/`
    - `dist/` and `dist-ssr/`
    - `*.log` and other debug files
    - Editor-specific directories (`.vscode/`, `.idea/`)
- **Environment Variables**:
  - `.env` files are untracked and used for local development secrets.
  - `.env.example` is tracked as a template for other developers.

### 1.4 Monorepo Architecture ✅

- **Workspace Structure**:

  - Root package.json with npm workspaces configuration
  - `api/` - Fastify server (JavaScript ES modules)
  - `client/` - React JavaScript application (Vite build tool)

- **Build Tools**:

  - **API**: No build step required (native ES modules)
  - **Client**: Vite for development server and production builds
  - **Concurrent Development**: Both services run simultaneously

- **Development Commands**:

  - `npm run dev` - Start both API and client concurrently
  - `npm run dev:api` - API only on port 3030
  - `npm run dev:client` - Client only on port 3001
  - `npm run build` - Build client for production

- **Database Commands**:
  - `npm run db:migrate` - Run database migrations
  - `npm run db:seed` - Seed database with test data
  - `npm run db:reset` - Reset and seed database
  - `npm run docker:up` - Start PostgreSQL container
  - `npm run docker:down` - Stop containers

## Phase 2: Core Infrastructure

### 2.1 Utility Layer

- **Property Mapper**: Implement snake_case ↔ camelCase conversion utility

  - Support single objects and arrays
  - Handle nested objects and complex data structures
  - Provide mapping functions for API layer

- **Database Service Layer**: Port comprehensive DatabaseService from Next.js
  - User management (get, search, create, update)
  - Project management with leader relationships
  - Task management with assignees, tags, and positioning
  - Tag management and search functionality
  - Image handling for projects and tasks

### 2.2 Fastify Server Setup

- **Core Server Configuration**:

  - Install Fastify with Pino logging
  - Configure server on port 3030
  - Set up CORS for cross-origin requests
  - Implement global error handling

- **Plugin Architecture**:
  - Create plugin system for modular route organization
  - Set up response transformation hooks (snake_case → camelCase)

## Phase 3: API Implementation

### 3.1 Core API Routes

- **Health & System Routes**:
  - `GET /health` - Health check endpoint
  - `GET /` - API information and version

### 3.2 User Management API

- **User Routes** (`/users`):
  - `GET /users` - List all users with search capability
  - `GET /users/:id` - Get specific user by ID
  - `POST /users` - Create new user
  - `PUT /users/:id` - Update user
  - `DELETE /users/:id` - Delete user
  - `GET /users/search?q=term` - Search users by name/email

### 3.3 Project Management API

- **Project Routes** (`/projects`):
  - `GET /projects` - List projects with leader info and task counts
  - `GET /projects/:id` - Get specific project with full details
  - `POST /projects` - Create new project
  - `PUT /projects/:id` - Update project
  - `DELETE /projects/:id` - Delete project
  - `GET /projects/:id/tasks` - Get tasks for specific project
  - `POST /projects/:id/image` - Upload project image
  - `DELETE /projects/:id/image` - Remove project image

### 3.4 Task Management API

- **Task Routes** (`/tasks`):
  - `GET /tasks` - List all tasks with filters
  - `GET /tasks/:id` - Get specific task with assignees and tags
  - `POST /tasks` - Create new task with proper positioning
  - `PUT /tasks/:id` - Update task
  - `DELETE /tasks/:id` - Delete task
  - `PATCH /tasks/:id/reorder` - Reorder task position
  - `GET /tasks/search?q=term` - Search tasks

### 3.5 Tag Management API

- **Tag Routes** (`/tags`):
  - `GET /tags` - List all tags with usage counts
  - `GET /tags/:id` - Get specific tag
  - `POST /tags` - Create new tag
  - `PUT /tags/:id` - Update tag
  - `DELETE /tags/:id` - Delete tag (with cascade handling)
  - `GET /tags/search?q=term` - Search tags

### 3.6 Image Management API ✅

- **Task Image Routes**:

  - `GET /tasks/:taskId/images` - List all images for a task
  - `POST /tasks/:taskId/images/upload` - Upload multiple images to a task
  - `DELETE /tasks/:taskId/images/:imageId` - Delete specific image from task (secure)

- **Image Serving Routes**:

  - `GET /images/:id` - Serve individual image with proper caching headers
  - `GET /images/:id/metadata` - Get image metadata without binary data

- **Security Features**:

  - Task ownership validation prevents cross-task image deletion
  - Returns 403 Forbidden for unauthorized access attempts
  - Correlation ID logging for security auditing

- **Storage Strategy**:

  - **Development**: Images stored as base64 in PostgreSQL `IMAGE_DATA` table
  - **Production**: Designed for migration to cloud storage (S3, GCS, etc.)
  - `storage_type` field supports seamless environment transitions

- **Client-Side Strategy**:

  - Client fetches image list (`GET /tasks/:taskId/images`) for metadata
  - Async thumbnail loading: Client requests each image individually
  - Lazy loading pattern: `GET /images/:id` called per image as needed
  - Caching headers ensure efficient browser/CDN caching

- **Performance Optimizations**:
  - 1-year cache headers for image serving
  - Base64 to binary conversion on-demand
  - Thumbnail data support for future implementation

## Phase 4: React Client Implementation

### 4.1 Client Architecture Setup ✅

- **Vite Configuration**:

  - JavaScript React template with Vite build tool (modern, fast)
  - Port 3001 configuration (per ground rules)
  - Mantine UI component library (desktop-optimized)
  - No TypeScript complexity - pure JavaScript + JSX

- **Project Structure**:

  - `client/src/components/` - React components (JSX)
  - `client/src/services/` - API service layer with Axios
  - `client/src/hooks/` - Custom React hooks
  - `client/src/utils/` - Utility functions
  - `client/src/i18n/` - Internationalization configuration and locale files

- **Technology Stack**:
  - **React 18** - Core framework
  - **Mantine** - Complete UI component library (desktop-optimized)
  - **@dnd-kit** - Modern drag & drop
  - **React Router** - Client-side routing
  - **Axios** - HTTP client for API calls
  - **@tabler/icons-react** - Icon library
  - **react-i18next** - Internationalization library
  - **i18next** - Core i18n framework
  - **i18next-browser-languagedetector** - Browser language detection

### 4.2 UI Component Migration

- **Copy from Next.js Project**:

  - Kanban board components (KanbanBoard, KanbanColumn, TaskCard)
  - Form components (NewTaskDialog, EditTaskDialog, EditProjectDialog)
  - shadcn/ui components (Button, Dialog, Input, Select, etc.)
  - Drag-and-drop functionality (@dnd-kit)

- **Adapt for Fastify API**:
  - Update type definitions to match API responses
  - Replace Next.js API routes with direct fetch calls
  - Implement API service layer for client-server communication
  - Handle camelCase API responses

### 4.3 Internationalization (i18n) Implementation ✅

- **i18n Architecture**:

  - **react-i18next** for React integration
  - **i18next** as core framework
  - **i18next-browser-languagedetector** for automatic language detection
  - Browser locale detection with fallback to English
  - LocalStorage persistence for user language preference

- **Translation Structure**:

  - **camelCase keys** for translation identifiers (industry standard)
  - **Nested organization** by feature (`common`, `projects`, `tasks`, `users`, `tags`)
  - **Enum translations** for database values (`tasks.statuses.TO_DO`, `tasks.priorities.HIGH`)
  - **Helper functions** for common translations (`translateStatus`, `translatePriority`)

- **Supported Languages**:

  - **English (en)** - Default language
  - **Spanish (es)** - Español
  - **French (fr)** - Français
  - **German (de)** - Deutsch

- **Implementation Pattern**:

  - Database stores ENUM_CASE values (`TO_DO`, `IN_PROGRESS`, `HIGH`)
  - UI displays translated text (`"To Do"`, `"En Progreso"`, `"Alta"`)
  - Translation keys follow camelCase convention (`setAccessToken`, `createProject`)
  - Components use `useTranslation()` hook for all text

- **File Structure**:
  - `client/src/i18n/index.js` - i18n configuration
  - `client/src/i18n/locales/` - Translation files (en.json, es.json, fr.json, de.json)
  - `client/src/hooks/useTranslation.js` - Custom translation hook
  - `client/src/components/LanguageSwitcher.jsx` - Language selection component

### 4.4 State Management & API Integration

- **API Service Layer**:

  - Create service functions for all API endpoints
  - Handle HTTP client configuration and error handling
  - Implement request/response transformation

- **State Management**:
  - React hooks for local state management
  - Custom hooks for API data fetching
  - Optimistic UI updates for better user experience

### 4.5 Routing & Navigation

- **React Router Setup**:
  - Project list page
  - Kanban board page for individual projects
  - Navigation between projects
  - URL-based project selection

## Phase 5: Advanced Features

### 5.1 Schema Validation

- **Request/Response Schemas**:
  - Use Fastify's built-in AJV (JSON Schema) validation for maximum performance
  - Define JSON schemas for all endpoints with proper validation rules
  - Implement dual-layer validation: API-level (AJV) + Database-level (custom functions)
  - Create consistent error response formats with detailed validation messages
  - Add input sanitization and validation for all user inputs
  - Special focus on tag name validation (lowercase, hyphen rules) at API level
  - Leverage Fastify's automatic schema compilation for optimal request processing

### 5.2 Authentication & Authorization

- **Security Layer**:
  - Implement `preHandler` hooks for auth
  - Add request correlation IDs
  - Set up structured logging with user context

### 5.3 Performance & Optimization

- **Caching & Performance**:
  - Implement response caching where appropriate
  - Add query optimization for complex operations
  - Set up request/response compression

## Phase 6: Database Integration

### 6.1 Database Configuration

- **PostgreSQL Setup**:
  - Reuse existing schema and Drizzle ORM configuration
  - Configure Docker Compose on alternative port
  - Ensure proper connection pooling

### 6.2 Migration Strategy

- **Data Layer**:
  - Port existing database models
  - Maintain existing relationships and constraints
  - Ensure data integrity during transition

## Phase 7: Testing & Validation

### 7.1 API Testing

- **Comprehensive Test Suite**:
  - Port existing API tests to new Fastify endpoints
  - Test all CRUD operations
  - Validate snake_case ↔ camelCase conversion
  - Test error handling and edge cases

### 7.2 Integration Testing

- **End-to-End Validation**:
  - Test complete workflows (user → project → task)
  - Validate file upload functionality
  - Test search and filtering capabilities

## Phase 8: Documentation & Deployment

### 8.1 API Documentation

- **Documentation Updates**:
  - Update API test commands documentation
  - Document all new endpoints with examples
  - Create migration guide from Next.js to Fastify

### 8.2 Deployment Preparation

- **Production Readiness**:
  - Configure environment-specific settings
  - Set up health monitoring
  - Prepare Docker configurations

## Review Process

- **Project Lead Review**: Verify plan alignment with project goals
- **Stakeholder Review**: Validate that user expectations are met
