# Docker Setup for Task Blaster Monorepo

This document describes the Docker configuration for the Task Blaster monorepo, which includes both the API and client services.

## Architecture

The monorepo contains:
- **API**: Fastify Node.js server (port 3030)
- **Client**: React TypeScript application with Vite (port 3001 in dev, port 80 in production)
- **Database**: PostgreSQL 15 (port 5433 in dev, 5432 in production)

## Development Environment

### Quick Start
```bash
# Start all services (database, API, and client)
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down
```

### Individual Services
```bash
# Start only the database
npm run docker:up:db

# Then run API and client locally
npm run dev
```

### Services in Development Mode

1. **PostgreSQL Database**
   - Container: `task_blaster_postgres`
   - Port: `5433:5432` (external:internal)
   - Volume: `postgres_data`
   - Health checks enabled

2. **Fastify API**
   - Container: `task_blaster_api`
   - Port: `3030:3030`
   - Hot reload enabled with volume mounting
   - Depends on database health check

3. **React Client**
   - Container: `task_blaster_client`
   - Port: `3001:3001`
   - Hot reload enabled with volume mounting
   - Vite development server
   - Depends on API service

## Production Environment

### Quick Start
```bash
# Build and start production stack
npm run docker:prod:build
npm run docker:prod:up

# Stop production stack
npm run docker:prod:down
```

### Services in Production Mode

1. **PostgreSQL Database**
   - Container: `task_blaster_postgres_prod`
   - Port: `5432:5432`
   - Volume: `postgres_prod_data`
   - Environment variable for password

2. **Fastify API**
   - Container: `task_blaster_api_prod`
   - Port: `3030:3030`
   - Production build
   - Restart policy: unless-stopped

3. **React Client**
   - Container: `task_blaster_client_prod`
   - Port: `80:80`
   - Static build served by Nginx
   - Multi-stage Docker build
   - Restart policy: unless-stopped

## File Structure

```
├── docker-compose.yml          # Development environment
├── docker-compose.prod.yml     # Production environment
├── api/
│   └── Dockerfile             # API production build
├── client/
│   ├── Dockerfile             # Client production build (Nginx)
│   └── Dockerfile.dev         # Client development build
└── DOCKER.md                  # This file
```

## Environment Variables

### Development
- Database credentials are hardcoded for simplicity
- API URL is set via VITE_API_URL

### Production  
- `POSTGRES_PASSWORD`: Set this for production database security
- Other environment variables can be added as needed

## Network

All services communicate through the `task_blaster_network` bridge network.

## Volumes

- **Development**: `postgres_data` - persistent database storage
- **Production**: `postgres_prod_data` - persistent database storage for production

## Development Workflow

1. **Database Only**: Use `npm run docker:up:db` and run API/client locally
2. **Full Docker**: Use `npm run docker:up` for complete containerized development
3. **Hybrid**: Mix and match based on what you're developing

## Troubleshooting

### Port Conflicts
- Development database uses port 5433 to avoid conflicts
- Production uses standard port 5432

### Volume Issues
```bash
# Remove volumes if you need a fresh database
docker volume rm task-blaster_postgres_data
# or for production
docker volume rm task-blaster_postgres_prod_data
```

### Container Issues
```bash
# View container status
docker-compose ps

# View logs for specific service
docker-compose logs api
docker-compose logs client
docker-compose logs postgres
```
