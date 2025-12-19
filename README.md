# Task Blaster

A Kanban-style orchestration management application for coordinating AI agents and human users in software projects.

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose

### Initial Setup

1. **Install dependencies**
   ```bash
   npm install
   cd api && npm install
   cd ../client && npm install
   cd ..
   ```

2. **Configure environment**
   ```bash
   cp api/.env.example api/.env
   # Edit api/.env with your database credentials if needed
   ```

3. **Start PostgreSQL**
   ```bash
   npm run docker:up:db
   ```

4. **Run migrations and seed data**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

### Running the Application

**Option 1: Run both API and client together (recommended)**
```bash
npm run dev
```

**Option 2: Run API and client in separate terminals**

Terminal 1 - API Server (port 3030):
```bash
npm run dev:api
```

Terminal 2 - Client (port 3001):
```bash
npm run dev:client
```

**Access the application:**
- Client: http://localhost:3001
- API: http://localhost:3030

### Database Operations

```bash
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database with test data
npm run db:reset     # Reset and re-seed database
```

### Running Tests

```bash
# From project root
cd api
set -a && source .env && set +a && NODE_ENV=test npm run test
```

## Common Issues

**Port already in use:**
```bash
# Kill process on port 3030 (API)
lsof -ti:3030 | xargs kill -9

# Kill process on port 3001 (client)
lsof -ti:3001 | xargs kill -9
```

**Missing dependencies:**
```bash
npm install                    # Root dependencies
cd api && npm install          # API dependencies
cd ../client && npm install    # Client dependencies
```

## Documentation

See [WARP.md](./WARP.md) for detailed project documentation including:
- Architecture overview
- Development guidelines
- Database schema
- API routes
- Testing strategies
