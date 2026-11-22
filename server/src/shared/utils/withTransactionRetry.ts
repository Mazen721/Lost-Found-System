import type { ClientSession } from 'mongoose';
import { withTransaction } from './withTransaction';

/**
 * Retry wrapper for claim transactions.
 *
 * Under heavy contention MongoDB can abort a transaction with a transient
 * write conflict (error label `TransientTransactionError`, code 112
 * WriteConflict). The aborted transaction applied nothing, so the safe
 * recovery is to re-run the WHOLE transactional unit once from scratch —
 * `withTransaction` starts a fresh session/transaction on every call, so a
 * retry never resumes a half-applied transaction.
 *
 * Bounded: at most 2 attempts total, with a short jittered backoff.
 * Non-transient errors (validation, state-machine, duplicate key, …)
 * propagate immediately, unchanged.
 */

const MAX_ATTEMPTS = 2;
const BACKOFF_MIN_MS = 50;
const BACKOFF_JITTER_MS = 100;

/** MongoDB duplicate-key codes — a genuine duplicate is never transient. */
const DUPLICATE_KEY_CODES = new Set([11_000, 11_001]);

/** WriteConflict — the code a transient transaction write conflict carries. */
const WRITE_CONFLICT_CODE = 112;

export function isTransientTransactionError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    codeName?: unknown;
    message?: unknown;
    errorLabels?: unknown;
    hasErrorLabel?: unknown;
  };

  if (
    typeof candidate.code === 'number' &&
    DUPLICATE_KEY_CODES.has(candidate.code)
  ) {
    return false;
  }

  if (
    typeof candidate.hasErrorLabel === 'function' &&
    (candidate.hasErrorLabel as (label: string) => boolean)(
      'TransientTransactionError',
    )
  ) {
    return true;
  }

  if (
    Array.isArray(candidate.errorLabels) &&
    candidate.errorLabels.includes('TransientTransactionError')
  ) {
    return true;
  }

  if (candidate.code === WRITE_CONFLICT_CODE) {
    return true;
  }

  if (candidate.codeName === 'WriteConflict') {
    return true;
  }

  if (
    typeof candidate.message === 'string' &&
    /TransientTransactionError|WriteConflict/.test(candidate.message)
  ) {
    return true;
  }

  return false;
}

function backoff(): Promise<void> {
  const delay = BACKOFF_MIN_MS + Math.random() * BACKOFF_JITTER_MS;
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

export async function withTransactionRetry<T>(
  operation: (session: ClientSession) => Promise<T>,
): Promise<T> {
  let attempt = 0;

  for (;;) {
    attempt += 1;

    try {
      return await withTransaction(operation);
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS || !isTransientTransactionError(error)) {
        throw error;
      }

      await backoff();
    }
  }
}
