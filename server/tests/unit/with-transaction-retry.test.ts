import type { ClientSession } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withTransaction } from '../../src/shared/utils/withTransaction';
import {
  isTransientTransactionError,
  withTransactionRetry,
} from '../../src/shared/utils/withTransactionRetry';

vi.mock('../../src/shared/utils/withTransaction', () => ({
  withTransaction: vi.fn(),
}));

const mockedWithTransaction = vi.mocked(withTransaction);

/** Stand-in session — the mocked runner just hands it to the operation. */
const fakeSession = {} as ClientSession;

function transientError(): Error & { code: number; hasErrorLabel: (label: string) => boolean } {
  const error = new Error('WriteConflict') as Error & {
    code: number;
    hasErrorLabel: (label: string) => boolean;
  };
  error.code = 112;
  error.hasErrorLabel = (label: string) => label === 'TransientTransactionError';
  return error;
}

function duplicateKeyError(): Error & { code: number } {
  const error = new Error('E11000 duplicate key error') as Error & { code: number };
  error.code = 11_000;
  return error;
}

beforeEach(() => {
  vi.clearAllMocks();
  // The mocked runner behaves like the real one: it invokes the operation
  // with a session and returns / throws whatever the operation does.
  mockedWithTransaction.mockImplementation(async (operation) =>
    operation(fakeSession),
  );
});

describe('isTransientTransactionError', () => {
  it('recognises the TransientTransactionError label', () => {
    expect(isTransientTransactionError(transientError())).toBe(true);
  });

  it('recognises a bare WriteConflict code', () => {
    const error = new Error('write conflict') as Error & { code: number };
    error.code = 112;
    expect(isTransientTransactionError(error)).toBe(true);
  });

  it('does not treat a duplicate-key error as transient', () => {
    expect(isTransientTransactionError(duplicateKeyError())).toBe(false);
  });

  it('does not treat ordinary errors as transient', () => {
    expect(isTransientTransactionError(new Error('boom'))).toBe(false);
    expect(isTransientTransactionError(null)).toBe(false);
    expect(isTransientTransactionError('TransientTransactionError')).toBe(false);
  });
});

describe('withTransactionRetry', () => {
  it('retries once after a transient error and applies the work exactly once', async () => {
    let attempts = 0;
    let applied = 0;

    const result = await withTransactionRetry(async () => {
      attempts += 1;
      if (attempts === 1) {
        // Aborted before applying anything, like a real write conflict.
        throw transientError();
      }
      applied += 1;
      return 'created';
    });

    expect(result).toBe('created');
    expect(attempts).toBe(2);
    expect(applied).toBe(1);
    expect(mockedWithTransaction).toHaveBeenCalledTimes(2);
  });

  it('does not retry a non-transient error', async () => {
    const failure = new Error('state machine rejected the transition');
    let attempts = 0;

    await expect(
      withTransactionRetry(async () => {
        attempts += 1;
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(attempts).toBe(1);
    expect(mockedWithTransaction).toHaveBeenCalledTimes(1);
  });

  it('does not retry a duplicate-key error (the claim 409 contract)', async () => {
    const failure = duplicateKeyError();
    let attempts = 0;

    await expect(
      withTransactionRetry(async () => {
        attempts += 1;
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(attempts).toBe(1);
  });

  it('surfaces a persistent transient error after the max attempts', async () => {
    const failure = transientError();
    let attempts = 0;

    await expect(
      withTransactionRetry(async () => {
        attempts += 1;
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(attempts).toBe(2);
    expect(mockedWithTransaction).toHaveBeenCalledTimes(2);
  });
});
