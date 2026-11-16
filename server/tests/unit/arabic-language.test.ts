import { beforeAll, describe, expect, it } from 'vitest';
import type { Request, Response } from 'express';

// Set dummy env variables before importing modules that rely on env.ts
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-32chars';

describe('Arabic-only server language behavior', () => {
  let ApiError: typeof import('../../src/shared/utils/ApiError').ApiError;
  let getRequestLang: typeof import('../../src/shared/utils/requestContext').getRequestLang;
  let requestContext: typeof import('../../src/shared/utils/requestContext').requestContext;
  let languageMiddleware: typeof import('../../src/shared/middleware/language').languageMiddleware;
  let buildErrorBody: typeof import('../../src/shared/middleware/errorHandler').buildErrorBody;

  beforeAll(async () => {
    const apiErrorMod = await import('../../src/shared/utils/ApiError');
    const requestContextMod = await import('../../src/shared/utils/requestContext');
    const languageMiddlewareMod = await import('../../src/shared/middleware/language');
    const errorHandlerMod = await import('../../src/shared/middleware/errorHandler');

    ApiError = apiErrorMod.ApiError;
    getRequestLang = requestContextMod.getRequestLang;
    requestContext = requestContextMod.requestContext;
    languageMiddleware = languageMiddlewareMod.languageMiddleware;
    buildErrorBody = errorHandlerMod.buildErrorBody;
  });

  describe('requestContext and getRequestLang', () => {
    it('defaults to "ar" when not in a request context', () => {
      expect(getRequestLang()).toBe('ar');
    });

    it('returns "ar" inside a request context', () => {
      requestContext.run({ lang: 'ar' }, () => {
        expect(getRequestLang()).toBe('ar');
      });
    });
  });

  describe('languageMiddleware', () => {
    function createMockReqRes(acceptLanguageHeader?: string) {
      const headers: Record<string, string> = acceptLanguageHeader
        ? { 'accept-language': acceptLanguageHeader }
        : {};
      const req = {
        headers,
        header: (name: string) => headers[name.toLowerCase()],
      } as unknown as Request;
      const res = {} as Response;
      return { req, res };
    }

    it.each([
      ['en-US,en;q=0.9'],
      ['ar-EG,ar;q=0.9'],
      ['fr-FR,fr;q=0.9'],
      [undefined],
    ])('always serves Arabic for Accept-Language: %s', (header) => {
      const { req, res } = createMockReqRes(header);
      languageMiddleware(req, res, () => {
        expect(getRequestLang()).toBe('ar');
      });
    });
  });

  describe('ApiError with messageKey and params', () => {
    it('stores messageKey and params on instance', () => {
      const err = new ApiError(404, 'NOT_FOUND', 'Item not found', 'itemNotFound', { id: '123' });
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toBe('Item not found');
      expect(err.messageKey).toBe('itemNotFound');
      expect(err.params).toEqual({ id: '123' });
    });

    it('factory badRequest passes messageKey and params', () => {
      const err = ApiError.badRequest('Invalid status', 'invalidStatus', { status: 'UNKNOWN' });
      expect(err.statusCode).toBe(400);
      expect(err.messageKey).toBe('invalidStatus');
      expect(err.params).toEqual({ status: 'UNKNOWN' });
    });

    it('factory notFound defaults to notFound key if omitted', () => {
      const err = ApiError.notFound('Resource not found');
      expect(err.statusCode).toBe(404);
      expect(err.messageKey).toBe('notFound');
    });

    it('factory unauthorized defaults to unauthorized key', () => {
      const err = ApiError.unauthorized('Please log in');
      expect(err.statusCode).toBe(401);
      expect(err.messageKey).toBe('unauthorized');
    });

    it('factory forbidden defaults to forbidden key', () => {
      const err = ApiError.forbidden('Forbidden action');
      expect(err.statusCode).toBe(403);
      expect(err.messageKey).toBe('forbidden');
    });
  });

  describe('buildErrorBody in errorHandler', () => {
    it('includes messageKey and params in response body', () => {
      const body = buildErrorBody('ITEM_NOT_FOUND', 'Item not found', {
        messageKey: 'itemNotFound',
        params: { id: 'LF-42' },
      });

      expect(body.error.code).toBe('ITEM_NOT_FOUND');
      expect(body.error.message).toBe('Item not found');
      expect(body.error.messageKey).toBe('itemNotFound');
      expect(body.error.params).toEqual({ id: 'LF-42' });
    });

    it('omits messageKey and params when not provided', () => {
      const body = buildErrorBody('GENERIC_ERROR', 'Something went wrong');
      expect(body.error.messageKey).toBeUndefined();
      expect(body.error.params).toBeUndefined();
    });
  });
});
