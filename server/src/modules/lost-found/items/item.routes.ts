import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/authenticate';
import { authorizeRoles } from '../../../shared/middleware/authorizeRoles';
import { uploadRequestImages } from '../../../shared/middleware/upload';
import { validate } from '../../../shared/middleware/validate';
import {
  adjustItemValue,
  createItem,
  getItem,
  listItems,
  recalculateMatches,
  updateItem,
} from './item.controller';
import {
  adjustItemValueSchema,
  createItemSchema,
  itemIdSchema,
  listItemsQuerySchema,
  updateItemSchema,
} from './item.validation';

export const lostFoundItemRouter = Router();

lostFoundItemRouter.use(authenticate);

lostFoundItemRouter.post(
  '/',
  authorizeRoles('STUDENT', 'EMPLOYEE', 'LOST_FOUND_MANAGER', 'SUPER_ADMIN'),
  uploadRequestImages,
  validate(createItemSchema),
  createItem,
);

lostFoundItemRouter.get(
  '/',
  validate(listItemsQuerySchema, 'query'),
  listItems,
);

lostFoundItemRouter.get('/:id', validate(itemIdSchema, 'params'), getItem);

lostFoundItemRouter.post(
  '/:id/recalculate',
  authorizeRoles('LOST_FOUND_MANAGER', 'SUPER_ADMIN'),
  validate(itemIdSchema, 'params'),
  recalculateMatches,
);

lostFoundItemRouter.patch(
  '/:id/value',
  authorizeRoles('LOST_FOUND_MANAGER', 'SUPER_ADMIN'),
  validate(itemIdSchema, 'params'),
  validate(adjustItemValueSchema),
  adjustItemValue,
);

lostFoundItemRouter.patch(
  '/:id',
  authorizeRoles('STUDENT', 'EMPLOYEE', 'LOST_FOUND_MANAGER', 'SUPER_ADMIN'),
  validate(itemIdSchema, 'params'),
  validate(updateItemSchema),
  updateItem,
);
