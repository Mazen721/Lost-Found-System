import type { Request, Response } from 'express';
import { ApiError } from '../../shared/utils/ApiError';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import {
  approveItem as approveItemService,
  getPostingSettings,
  listPendingItems,
  rejectItem as rejectItemService,
  serializeSettings,
  updatePostingSettings,
  type ModerationActor,
} from './moderation.service';
import type {
  ListPendingQuery,
  UpdatePostingSettingsInput,
} from './moderation.validation';

function requireActor(req: Request): ModerationActor {
  if (!req.user) {
    throw ApiError.unauthorized();
  }
  return { id: req.user._id.toString(), role: req.user.role };
}

export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getPostingSettings();
  res.status(200).json({ settings: serializeSettings(settings) });
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const settings = await updatePostingSettings(
    actor,
    req.body as UpdatePostingSettingsInput,
  );
  res.status(200).json({ settings });
});

export const listPending = asyncHandler(async (req: Request, res: Response) => {
  const result = await listPendingItems(req.query as unknown as ListPendingQuery);
  res.status(200).json(result);
});

export const approveItem = asyncHandler(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const { id } = req.params as { id: string };
  const item = await approveItemService(actor, id);
  res.status(200).json({ item });
});

export const rejectItem = asyncHandler(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const { id } = req.params as { id: string };
  const item = await rejectItemService(actor, id);
  res.status(200).json({ item });
});
