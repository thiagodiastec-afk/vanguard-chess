import { createHash } from 'node:crypto';

type RateLimitDocument = {
  exists: boolean;
  data(): { count?: unknown; resetAt?: unknown } | undefined;
};

type RateLimitReference = unknown;

export interface DistributedRateLimitStore {
  collection(name: string): { doc(id: string): RateLimitReference };
  runTransaction<T>(work: (transaction: {
    get(reference: RateLimitReference): Promise<RateLimitDocument>;
    set(reference: RateLimitReference, value: { count: number; resetAt: number }): void;
  }) => Promise<T>): Promise<T>;
}

/**
 * A Firestore-transaction-backed fixed-window limiter. The document ID is a
 * one-way hash so user IDs and route names are not exposed in document paths.
 */
export async function allowDistributedRateLimit(
  store: DistributedRateLimitStore,
  uid: string,
  route: string,
  maxRequests: number,
  windowMs: number,
  now = Date.now()
): Promise<boolean> {
  if (!uid || !route || !Number.isInteger(maxRequests) || maxRequests < 1 || !Number.isFinite(windowMs) || windowMs < 1) {
    throw new Error('Invalid distributed rate limit parameters');
  }

  const id = createHash('sha256').update(`${route}\0${uid}`).digest('hex');
  const ref = store.collection('serverRateLimits').doc(id);

  return store.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.exists ? snapshot.data() : undefined;
    const resetAt = typeof data?.resetAt === 'number' ? data.resetAt : 0;
    const count = typeof data?.count === 'number' ? data.count : 0;

    if (resetAt > now && count >= maxRequests) return false;

    const activeResetAt = resetAt > now ? resetAt : now + windowMs;
    transaction.set(ref, {
      count: resetAt > now ? count + 1 : 1,
      resetAt: activeResetAt
    });
    return true;
  });
}
