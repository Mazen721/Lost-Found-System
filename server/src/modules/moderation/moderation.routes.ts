import { Router } from 'express';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorizeRoles } from '../../shared/middleware/authorizeRoles';
import { validate } from '../../shared/middleware/validate';
import {
  approveItem,
  getSettings,
  listPending,
  rejectItem,
  updateSettings,
} from './moderation.controller';
import {
  listPendingQuerySchema,
  moderationItemIdSchema,
  updatePostingSettingsSchema,
} from './moderation.validation';

export const moderationRouter = Router();

moderationRouter.use(authenticate);
// Spec 012: moderation is a SUPER_ADMIN-only surface — the Lost & Found
// Manager deliberately has no access to the toggle or the queue.
moderationRouter.use(authorizeRoles('SUPER_ADMIN'));

moderationRouter.get('/settings', getSettings);
moderationRouter.patch(
  '/settings',
  validate(updatePostingSettingsSchema),
  updateSettings,
);
moderationRouter.get('/pending', validate(listPendingQuerySchema, 'query'), listPending);
moderationRouter.post(
  '/items/:id/approve',
  validate(moderationItemIdSchema, 'params'),
  approveItem,
);
moderationRouter.post(
  '/items/:id/reject',
  validate(moderationItemIdSchema, 'params'),
  rejectItem,
);
