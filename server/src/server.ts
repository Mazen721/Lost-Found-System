import mongoose from 'mongoose';
import { app } from './app';
import { env } from './config/env';
import { ensureAiInsightCacheIndexes } from './modules/ai/aiInsightCache.model';
import { User } from './modules/auth/user.model';
import { ClaimRequest } from './modules/lost-found/claims/claimRequest.model';
import { LostFoundItem } from './modules/lost-found/items/lostFoundItem.model';
import { ItemMatch } from './modules/lost-found/matches/itemMatch.model';
import { Location } from './modules/locations/location.model';
import { ActivityLog } from './shared/models/ActivityLog.model';
import { Notification } from './shared/models/Notification.model';

async function start(): Promise<void> {
  try {
    // Pool explicitly tuned (production-readiness pass, 2026-11-22):
    // previously the driver defaults applied silently. 20 is ample for a
    // single VPS instance behind PM2 cluster (multiply per worker when
    // sizing the Mongo side); timeouts bound failure detection.
    await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5_000,
      socketTimeoutMS: 45_000,
    });
    console.log('[campuscare] connected to MongoDB');

    try {
      await ensureAiInsightCacheIndexes();
      // Do not rely on implicit autoIndex alone: build every declared
      // index explicitly so a production connection string that disables
      // autoIndex can never silently drop them.
      await Promise.all([
        User.createIndexes(),
        LostFoundItem.createIndexes(),
        ClaimRequest.createIndexes(),
        ItemMatch.createIndexes(),
        Location.createIndexes(),
        ActivityLog.createIndexes(),
        Notification.createIndexes(),
      ]);
    } catch (error) {
      console.error('[campuscare] failed to ensure indexes', error);
    }

    const server = app.listen(env.PORT, () => {
      console.log(`[campuscare] API listening on http://localhost:${env.PORT}`);
    });

    const shutdown = (signal: string) => {
      console.log(`[campuscare] received ${signal}, shutting down`);
      server.close(() => {
        void mongoose.disconnect().finally(() => process.exit(0));
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('[campuscare] failed to start', error);
    process.exitCode = 1;
  }
}

void start();
