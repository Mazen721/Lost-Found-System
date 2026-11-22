import compression from 'compression';
import cors, { type CorsOptions } from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './shared/middleware/errorHandler';
import { languageMiddleware } from './shared/middleware/language';
import { LOCAL_UPLOADS_DIR } from './shared/services/upload.service';
import { apiRouter } from './routes';

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Same-origin requests, curl and server health checks have no Origin header.
    if (!origin || env.ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
  // Spec 011: the monthly-report download reads its Arabic filename
  // from Content-Disposition; without this, cross-origin fetch hides
  // the header and the client falls back to a generic name.
  exposedHeaders: ['Content-Disposition'],
  credentials: false,
  maxAge: 86_400,
};

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(languageMiddleware);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness (production-readiness pass, 2026-11-22): unlike the liveness
// check above, this reports Mongo connectivity so a load balancer /
// uptime monitor does not treat a process with a dead DB as ready.
app.get('/health/ready', (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res
    .status(dbConnected ? 200 : 503)
    .json({ status: dbConnected ? 'ready' : 'degraded', db: dbConnected ? 'connected' : 'disconnected' });
});

// Local development fallback for image uploads when Cloudinary is not configured.
if (!env.IS_PRODUCTION && !env.CLOUDINARY_CONFIGURED) {
  app.use(
    '/uploads',
    (_req, res, next) => {
      // Images are rendered by the SPA on a different origin in development and
      // production deployments (Vercel + Render), so helmet's same-origin default
      // would make every uploaded preview fail to load.
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      next();
    },
    express.static(LOCAL_UPLOADS_DIR, {
      fallthrough: true,
      maxAge: '7d',
      immutable: true,
    }),
  );
}

app.use('/api/v1', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
