import type { Request, Response } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { env } from '../../config/env';
import { buildErrorBody } from './errorHandler';

// The integration suite logs in constantly from one test IP; throttling is
// a deployment behaviour, verified separately against a running server.
const skipInTests = (): boolean => env.NODE_ENV === 'test';

/**
 * Rate limiting (production-readiness pass, 2026-11-22 — previously there
 * was NO limiter anywhere, so login could be brute-forced / bcrypt-CPU
 * exhausted without bound).
 *
 * Design constraint: a university campus sits behind NAT and this app sits
 * behind one reverse-proxy hop (`trust proxy` = 1 in app.ts), so a naive
 * low per-IP cap would lock out the whole university at once — the exact
 * failure fixed in the sister Volunteering project. Login is therefore
 * limited primarily per (IP + email account): an attacker hammering one
 * account is stopped at 20 attempts / 15 min, while hundreds of distinct
 * students sharing one NAT address are unaffected. A generous per-IP
 * ceiling (300 / 15 min) still bounds credential-stuffing across many
 * accounts from a single source, while staying far above any plausible
 * legitimate NAT-shared login volume at a launch rush.
 */
function rateLimitedHandler(_req: Request, res: Response): void {
  res
    .status(429)
    .json(
      buildErrorBody(
        'RATE_LIMITED',
        'Too many attempts. Please wait a few minutes and try again.',
        { messageKey: 'rateLimited' },
      ),
    );
}

const WINDOW_MS = 15 * 60 * 1000;

export const loginAccountLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 20,
  skip: skipInTests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitedHandler,
  keyGenerator: (req) => {
    const email =
      typeof (req.body as { email?: unknown } | undefined)?.email === 'string'
        ? (req.body as { email: string }).email.trim().toLowerCase()
        : '';
    return `${ipKeyGenerator(req.ip ?? '')}:${email}`;
  },
});

export const loginIpLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 1000,
  skip: skipInTests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitedHandler,
});

/** Demo login is passwordless by design — keep its abuse ceiling low. */
export const demoLoginLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 30,
  skip: skipInTests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitedHandler,
});

/** AI insight generation can burn a paid Gemini call per request. */
export const aiInsightsLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 30,
  skip: skipInTests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitedHandler,
});
