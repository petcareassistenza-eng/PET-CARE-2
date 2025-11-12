/**
 * MyPetCare Backend API Server Entry Point
 * Imports configured Express app and starts HTTP server
 */

import 'dotenv/config';
import { app } from './app';

const PORT = process.env.PORT || 8080;

// ==========================================
// Server Startup
// ==========================================

app.listen(PORT, () => {
  console.log('==========================================');
  console.log('🐾 MyPetCare Backend Server');
  console.log('==========================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔥 Firebase Project: ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`⚙️  Maintenance Mode: ${process.env.MAINTENANCE_MODE}`);
  console.log('==========================================');
});
