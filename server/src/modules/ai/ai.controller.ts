import type { Request, Response } from 'express';
import { ApiError } from '../../shared/utils/ApiError';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import {
  generateAdminInsights as generateAdminInsightsService,
  generateLostFoundInsights as generateLostFoundInsightsService,
  type InsightsActor,
} from './lostFoundInsights.service';
import type { InsightsBody } from './ai.validation';

function requireActor(req: Request): InsightsActor {
  if (!req.user) {
    throw ApiError.unauthorized();
  }

  return { id: req.user._id.toString(), role: req.user.role };
}

export const generateLostFoundInsights = asyncHandler(
  async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const result = await generateLostFoundInsightsService(actor, req.body as InsightsBody);
    res.status(200).json(result);
  },
);

export const generateAdminInsights = asyncHandler(
  async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const result = await generateAdminInsightsService(actor, req.body as InsightsBody);
    res.status(200).json(result);
  },
);
