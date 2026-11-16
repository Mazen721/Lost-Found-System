import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestLanguage = 'ar';

export interface RequestContextStore {
  lang: RequestLanguage;
}

export const requestContext = new AsyncLocalStorage<RequestContextStore>();

export function getRequestLang(): RequestLanguage {
  return 'ar';
}
