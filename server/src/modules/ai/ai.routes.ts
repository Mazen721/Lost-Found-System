import { Router } from 'express';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorizeRoles } from '../../shared/middleware/authorizeRoles';
import { validate } from '../../shared/middleware/validate';
import { generateAdminInsights, generateLostFoundInsights } from './ai.controller';
import { insightsBodySchema } from './ai.validation';

export const aiRouter = Router();

aiRouter.use(authenticate);

aiRouter.post(
  '/lost-found-insights',
  authorizeRoles('LOST_FOUND_MANAGER'),
  validate(insightsBodySchema),
  generateLostFoundInsights,
);

aiRouter.post(
  '/admin-insights',
  authorizeRoles('SUPER_ADMIN'),
  validate(insightsBodySchema),
  generateAdminInsights,
);
