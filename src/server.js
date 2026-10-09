import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { connectDb } from './services/databaseService.js';
import { migrateServicesToCategories } from './services/serviceCategoryMigration.js';
import { setupSocket } from './socket/index.js';
import { seedAdmin } from './seeds/adminSeed.js';
import { seedSettings } from './seeds/settingsSeed.js';
import { logSmtpHealth } from './utils/emailService.js';
import { logIpstackHealth } from './services/ipstackService.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
  const dbConnected = await connectDB();
  await connectDb();

  if (dbConnected) {
    await seedAdmin();
    await seedSettings();
    await migrateServicesToCategories();
  }

  const httpServer = http.createServer(app);
  setupSocket(httpServer);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Backend] Eveng Catering API Server running on port ${PORT}`);
    logSmtpHealth();
    logIpstackHealth();
    import('./controllers/geminiController.js').then((m) => m.logGeminiHealth?.()).catch(() => {});
  });

  const shutdown = (signal) => {
    console.log(`[Backend] ${signal} received, shutting down gracefully...`);
    httpServer.close(async () => {
      try {
        const mongoose = (await import('mongoose')).default;
        await mongoose.disconnect();
      } catch {}
      try {
        const { closeDb } = await import('./services/databaseService.js');
        if (typeof closeDb === 'function') await closeDb();
      } catch {}
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return httpServer;
}

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
});

startServer().catch((err) => {
  console.error('[FATAL] Server failed to start:', err);
  process.exit(1);
});
