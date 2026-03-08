import * as pactum from 'pactum';
import { clearTaskData, createTestDeliverable, resetProjectDefaults } from '../helpers/testDatabase.js';

const { spec } = pactum;
const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

describe('Deliverables Plan Approval', () => {
  beforeEach(async () => {
    await clearTaskData();
    await resetProjectDefaults();
  });

  it('should require plan_filepath to be set before approval', async () => {
    const created = await createTestDeliverable(1, {
      status: 'PLANNING',
      planFilepath: null
    });

    await spec()
      .patch(`/projects/ZAZZ/deliverables/${created.id}/approve`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(400);
  });

  it('should approve plan when plan_filepath is set', async () => {
    const created = await createTestDeliverable(1, {
      status: 'PLANNING',
      planFilepath: 'docs/test-plan.md',
      approvedAt: null,
      approvedBy: null
    });

    const response = await spec()
      .patch(`/projects/ZAZZ/deliverables/${created.id}/approve`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    expect(response.approvedAt).not.toBeNull();
    expect(response.approvedBy).not.toBeNull();
  });

  it('should set approvedBy to current user on approval', async () => {
    const created = await createTestDeliverable(1, {
      status: 'PLANNING',
      planFilepath: 'docs/test-plan.md'
    });

    const response = await spec()
      .patch(`/projects/ZAZZ/deliverables/${created.id}/approve`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    // User 5 (Michael Woytowitz) is the token holder (token 550e8400-...)
    expect(response.approvedBy).toBe(5);
  });

  it('should prevent approval if already approved', async () => {
    const created = await createTestDeliverable(1, {
      status: 'PLANNING',
      planFilepath: 'docs/test-plan.md',
      approvedAt: new Date(),
      approvedBy: 1
    });

    await spec()
      .patch(`/projects/ZAZZ/deliverables/${created.id}/approve`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(400);
  });

  it('should only allow approval in PLANNING status', async () => {
    const created = await createTestDeliverable(1, {
      status: 'IN_PROGRESS',
      planFilepath: 'docs/test-plan.md'
    });

    await spec()
      .patch(`/projects/ZAZZ/deliverables/${created.id}/approve`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(400);
  });

  it('should require authentication for approval', async () => {
    const created = await createTestDeliverable(1, {
      status: 'PLANNING',
      planFilepath: 'docs/test-plan.md'
    });

    await spec()
      .patch(`/projects/ZAZZ/deliverables/${created.id}/approve`)
      .expectStatus(401);
  });

  it('should return 404 for non-existent deliverable approval', async () => {
    await spec()
      .patch('/projects/ZAZZ/deliverables/99999/approve')
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(404);
  });

  it('should auto-approve when transitioning to IN_PROGRESS with a plan filepath', async () => {
    const created = await createTestDeliverable(1, {
      status: 'PLANNING',
      planFilepath: 'docs/test-plan.md',
      approvedAt: null,
      approvedBy: null
    });

    const response = await spec()
      .patch(`/projects/ZAZZ/deliverables/${created.id}/status`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ status: 'IN_PROGRESS' })
      .expectStatus(200)
      .returns('res.body');

    expect(response.approvedAt).not.toBeNull();
    expect(response.approvedBy).toBe(5);
    expect(response.status).toBe('IN_PROGRESS');
  });

  it('should approve multiple deliverables independently', async () => {
    const d1 = await createTestDeliverable(1, {
      status: 'PLANNING',
      planFilepath: 'docs/plan1.md'
    });
    const d2 = await createTestDeliverable(1, {
      status: 'PLANNING',
      planFilepath: 'docs/plan2.md'
    });

    // Approve only d1
    await spec()
      .patch(`/projects/ZAZZ/deliverables/${d1.id}/approve`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200);

    // Verify d1 is approved
    const d1Result = await spec()
      .get(`/projects/ZAZZ/deliverables/${d1.id}`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');
    expect(d1Result.approvedAt).not.toBeNull();

    // Verify d2 is not approved
    const d2Result = await spec()
      .get(`/projects/ZAZZ/deliverables/${d2.id}`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');
    expect(d2Result.approvedAt).toBeNull();
  });

  it('should record approval timestamp', async () => {
    const created = await createTestDeliverable(1, {
      status: 'PLANNING',
      planFilepath: 'docs/test-plan.md'
    });

    const beforeTime = new Date();
    
    await spec()
      .patch(`/projects/ZAZZ/deliverables/${created.id}/approve`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200);

    const afterTime = new Date();

    const result = await spec()
      .get(`/projects/ZAZZ/deliverables/${created.id}`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .returns('res.body');

    const approvalTime = new Date(result.approvedAt);
    expect(approvalTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    expect(approvalTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
  });
});
