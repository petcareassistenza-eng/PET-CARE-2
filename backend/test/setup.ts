/**
 * Test Setup - Mock Firebase and Environment
 * Configure test environment before running tests
 */

import { beforeAll } from 'vitest';

// Mock Firebase Admin SDK for testing
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.FIREBASE_PROJECT_ID = 'test-project';
  process.env.FIREBASE_STORAGE_BUCKET = 'test-bucket.appspot.com';
  process.env.FRONTEND_URL = 'http://localhost:3000';
  process.env.MAINTENANCE_MODE = 'false';

  // Mock Firebase credentials to prevent actual initialization
  process.env.GOOGLE_APPLICATION_CREDENTIALS = JSON.stringify({
    type: 'service_account',
    project_id: 'test-project',
    private_key_id: 'test-key-id',
    private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7nSBzVpDrGnrp\n-----END PRIVATE KEY-----\n',
    client_email: 'test@test-project.iam.gserviceaccount.com',
    client_id: '123456789',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  });

  console.log('✅ Test setup completed - Firebase mocked');
});
