/**
 * OpenAPI / Swagger documentation tests.
 * Validates spec correctness via openapi-schema-validator.
 * Prevents regressions when splitting or updating schema files.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import OpenAPISchemaValidatorPkg from 'openapi-schema-validator';
import { createTestServerWithSwagger } from '../helpers/testServerWithSwagger.js';

const OpenAPISchemaValidator = OpenAPISchemaValidatorPkg.default || OpenAPISchemaValidatorPkg;

let app;

beforeAll(async () => {
  app = await createTestServerWithSwagger();
});

afterAll(async () => {
  if (app) await app.close();
});

describe('OpenAPI / Swagger documentation', () => {
  it('should produce a valid OpenAPI 3.x spec (schema validation)', async () => {
    const spec = await app.swagger();
    const validator = new OpenAPISchemaValidator({ version: 3 });
    const result = validator.validate(spec);
    expect(result.errors, `OpenAPI spec validation failed: ${JSON.stringify(result.errors)}`).toHaveLength(0);
  });

  it('should return spec with required structure', async () => {
    const spec = await app.swagger();
    expect(spec).toBeDefined();
    expect(spec.openapi).toMatch(/^3\.\d+\.\d+$/);
    expect(spec.info).toBeDefined();
    expect(spec.info.title).toBe('Zazz Board API');
    expect(spec.paths).toBeDefined();
    expect(typeof spec.paths).toBe('object');
  });

  it('should document core agent operations: create deliverable', async () => {
    const spec = await app.swagger();
    const path = spec.paths['/projects/{projectCode}/deliverables'];
    expect(path).toBeDefined();
    expect(path.post).toBeDefined();
    expect(path.post.summary).toBeDefined();
    expect(path.post.description).toContain('id');
    expect(path.post.description).toContain('deliverableId');
    expect(path.post.requestBody?.content?.['application/json']?.schema?.properties?.name).toBeDefined();
    expect(path.post.requestBody?.content?.['application/json']?.schema?.properties?.dedFilePath).toBeDefined();
    expect(path.post.requestBody?.content?.['application/json']?.schema?.properties?.planFilePath).toBeDefined();
  });

  it('should document core agent operations: create task', async () => {
    const spec = await app.swagger();
    const path = spec.paths['/projects/{code}/deliverables/{delivId}/tasks'];
    expect(path).toBeDefined();
    expect(path.post).toBeDefined();
    expect(path.post.description).toContain('delivId');
    expect(path.post.description).toContain('numeric');
    expect(path.post.requestBody?.content?.['application/json']?.schema?.required).toContain('title');
  });

  it('should document core agent operations: update deliverable', async () => {
    const spec = await app.swagger();
    const path = spec.paths['/projects/{projectCode}/deliverables/{id}'];
    expect(path).toBeDefined();
    expect(path.put).toBeDefined();
    const bodySchema = path.put.requestBody?.content?.['application/json']?.schema;
    expect(bodySchema?.properties?.dedFilePath).toBeDefined();
    expect(bodySchema?.properties?.planFilePath).toBeDefined();
    expect(bodySchema?.properties?.gitWorktree).toBeDefined();
  });

  it('should document core agent operations: change deliverable status', async () => {
    const spec = await app.swagger();
    const path = spec.paths['/projects/{projectCode}/deliverables/{id}/status'];
    expect(path).toBeDefined();
    expect(path.patch).toBeDefined();
    expect(path.patch.requestBody?.content?.['application/json']?.schema?.required).toContain('status');
  });

  it('should document core agent operations: change task status', async () => {
    const spec = await app.swagger();
    const path = spec.paths['/projects/{code}/deliverables/{delivId}/tasks/{taskId}/status'];
    expect(path).toBeDefined();
    expect(path.patch).toBeDefined();
    expect(path.patch.description).toContain('agentName');
    expect(path.patch.requestBody?.content?.['application/json']?.schema?.properties?.status).toBeDefined();
  });

  it('should document key paths with tags and summaries', async () => {
    const spec = await app.swagger();
    const keyPaths = [
      '/projects/{projectCode}/deliverables',
      '/projects/{projectCode}/deliverables/{id}',
      '/projects/{projectCode}/deliverables/{id}/approve',
      '/projects/{code}/deliverables/{delivId}/tasks',
      '/projects/{code}/deliverables/{delivId}/tasks/{taskId}',
      '/projects/{code}/deliverables/{delivId}/graph',
      '/projects/{code}/deliverables/{delivId}/tasks/{taskId}/images',
      '/projects/{code}/deliverables/{delivId}/tasks/{taskId}/images/upload',
      '/projects/{code}/deliverables/{delivId}/tasks/{taskId}/images/{imageId}',
      '/projects/{code}/deliverables/{delivId}/images',
      '/projects/{code}/deliverables/{delivId}/images/upload',
      '/projects/{code}/deliverables/{delivId}/images/{imageId}',
      '/projects/{code}/images/{id}',
      '/projects/{code}/images/{id}/metadata',
      '/projects/{code}/tasks/{taskId}/relations',
      '/projects/{code}/tasks/{taskId}/readiness',
      '/health'
    ];
    for (const p of keyPaths) {
      expect(spec.paths[p], `Missing path: ${p}`).toBeDefined();
      const methods = Object.keys(spec.paths[p]).filter((m) => !m.startsWith('/'));
      for (const m of methods) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(m)) {
          expect(spec.paths[p][m].summary, `Missing summary for ${m.toUpperCase()} ${p}`).toBeDefined();
        }
      }
    }
  });

  it('should include common operations in info description', async () => {
    const spec = await app.swagger();
    const desc = spec.info.description || '';
    expect(desc).toContain('Create deliverable');
    expect(desc).toContain('Create task');
    expect(desc).toContain('Update deliverable');
    expect(desc).toContain('Change deliverable status');
    expect(desc).toContain('Change task status');
  });

  it('should not document removed project-wide graph and legacy image routes', async () => {
    const spec = await app.swagger();

    expect(spec.paths['/projects/{code}/graph']).toBeUndefined();
    expect(spec.paths['/tasks/{taskId}/images']).toBeUndefined();
    expect(spec.paths['/tasks/{taskId}/images/upload']).toBeUndefined();
    expect(spec.paths['/tasks/{taskId}/images/{imageId}']).toBeUndefined();
    expect(spec.paths['/images/{id}']).toBeUndefined();
    expect(spec.paths['/images/{id}/metadata']).toBeUndefined();
  });
});
