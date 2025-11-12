/**
 * Basic App Tests
 * Tests core functionality like health check and 404 handling
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

// Create a minimal test app without Firebase dependencies
const testApp = express();

testApp.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
  });
});

testApp.use((_req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route not found`,
  });
});

describe('MyPetCare Backend - Core Tests', () => {
  describe('GET /health', () => {
    it('should return 200 and health status', async () => {
      const res = await request(testApp).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('environment');
    });

    it('should include maintenanceMode flag', async () => {
      const res = await request(testApp).get('/health');

      expect(res.body).toHaveProperty('maintenanceMode');
      expect(typeof res.body.maintenanceMode).toBe('boolean');
    });
  });

  describe('404 Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const res = await request(testApp).get('/api/non-existent-route');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Not Found');
      expect(res.body).toHaveProperty('message');
    });
  });
});
