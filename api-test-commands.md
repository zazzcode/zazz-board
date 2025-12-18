# Task Blaster API Test Commands

This file contains curl commands to test all API endpoints of the Task Blaster application.

## Basic API Tests

### 1. Health Check
```bash
curl -X GET http://localhost:3030/health
```
**Expected Response:** `{"status":"ok","timestamp":"..."}`

### 2. Root Endpoint (API Info)
```bash
curl -X GET http://localhost:3030/
```
**Expected Response:** API information with available endpoints

### 3. Database Connection Test
```bash
curl -X GET http://localhost:3030/db-test
```
**Expected Response:** `{"status":"Database connected","result":...}`

## Data Endpoints

### 4. Get All Users
```bash
curl -X GET http://localhost:3030/users
```
**Expected Response:** Array of user objects

### 5. Get All Projects
```bash
curl -X GET http://localhost:3030/projects
```
**Expected Response:** Array of project objects

### 6. Get All Tasks
```bash
curl -X GET http://localhost:3030/tasks
```
**Expected Response:** Array of task objects

### 7. Get All Tags
```bash
curl -X GET http://localhost:3030/tags
```
**Expected Response:** Array of tag objects

## Formatted Output (Pretty JSON)

Add `-s | jq` for pretty-printed JSON output:

```bash
# Pretty health check
curl -s http://localhost:3030/health | jq

# Pretty users list
curl -s http://localhost:3030/users | jq

# Pretty projects list
curl -s http://localhost:3030/projects | jq

# Pretty tasks list
curl -s http://localhost:3030/tasks | jq

# Pretty tags list
curl -s http://localhost:3030/tags | jq
```

## Error Testing

### Test Non-existent Endpoint
```bash
curl -X GET http://localhost:3030/nonexistent
```
**Expected Response:** 404 Not Found

## Performance Testing

### Simple Load Test (10 concurrent requests)
```bash
for i in {1..10}; do
  curl -s http://localhost:3030/health &
done
wait
```

## Quick Test Script

Run all basic tests at once:
```bash
#!/bin/bash
echo "=== Testing Task Blaster API ==="
echo
echo "1. Health Check:"
curl -s http://localhost:3030/health | jq
echo
echo "2. API Info:"
curl -s http://localhost:3030/ | jq
echo
echo "3. Database Test:"
curl -s http://localhost:3030/db-test | jq
echo
echo "4. Users:"
curl -s http://localhost:3030/users | jq
echo
echo "5. Projects:"
curl -s http://localhost:3030/projects | jq
echo
echo "6. Tasks:"
curl -s http://localhost:3030/tasks | jq
echo
echo "7. Tags:"
curl -s http://localhost:3030/tags | jq
echo
echo "=== All tests completed ==="
```

Save this as `test-api.sh`, make executable with `chmod +x test-api.sh`, then run with `./test-api.sh`.
