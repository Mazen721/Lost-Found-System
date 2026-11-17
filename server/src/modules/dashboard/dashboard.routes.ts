import { Router } from 'express';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorizeRoles } from '../../shared/middleware/authorizeRoles';
import { validate } from '../../shared/middleware/validate';
import {
  downloadMonthlyReport,
  getActivitySeries,
  getDashboard,
} from './dashboard.controller';
import {
  activitySeriesQuerySchema,
  dashboardQuerySchema,
} from './dashboard.validation';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get('/', validate(dashboardQuerySchema, 'query'), getDashboard);

dashboardRouter.get(
  '/activity-series',
  authorizeRoles('SUPER_ADMIN', 'LOST_FOUND_MANAGER'),
  validate(activitySeriesQuerySchema, 'query'),
  getActivitySeries,
);

dashboardRouter.get(
  '/report.xlsx',
  authorizeRoles('SUPER_ADMIN', 'LOST_FOUND_MANAGER'),
  downloadMonthlyReport,
);
