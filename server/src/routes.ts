import { Router } from 'express';
import { activityLogRouter } from './modules/activity-logs/activityLog.routes';
import { aiRouter } from './modules/ai/ai.routes';
import { authRouter } from './modules/auth/auth.routes';
import { locationRouter } from './modules/locations/location.routes';
import { metaRouter } from './modules/meta/meta.routes';
import { notificationRouter } from './modules/notifications/notification.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { lostFoundItemRouter } from './modules/lost-found/items/item.routes';
import { matchRouter } from './modules/lost-found/matches/match.routes';
import { claimRouter } from './modules/lost-found/claims/claim.routes';
import { userRouter } from './modules/users/user.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/meta', metaRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/locations', locationRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/lost-found/items', lostFoundItemRouter);
apiRouter.use('/lost-found/matches', matchRouter);
apiRouter.use('/lost-found/claims', claimRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/activity-logs', activityLogRouter);
apiRouter.use('/ai', aiRouter);
