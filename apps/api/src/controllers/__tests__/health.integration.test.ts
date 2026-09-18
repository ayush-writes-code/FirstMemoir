import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../../index.js';

describe('Health Check Integration API', () => {
  it('should return 200 for liveness probe', async () => {
    const res = await request(app).get('/api/health/live');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
  });

  it('should return 200 and healthy status for readiness probe when database is reachable', async () => {
    const res = await request(app).get('/api/health/ready');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.database, 'connected');
  });
});
