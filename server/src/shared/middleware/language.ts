import type { RequestHandler } from 'express';
import { requestContext } from '../utils/requestContext';

/**
 * Arabic-only product: every request is served in Arabic (RTL), regardless
 * of the client's Accept-Language header.
 */
export const languageMiddleware: RequestHandler = (_req, _res, next) => {
  requestContext.run({ lang: 'ar' }, () => next());
};
