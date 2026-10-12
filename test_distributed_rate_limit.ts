import { allowDistributedRateLimit, type DistributedRateLimitStore } from './src/lib/distributedRateLimit';

class MemoryRateLimitStore implements DistributedRateLimitStore {
  private records = new Map<string, { count: number; resetAt: number }>();
  private serial: Promise<void> = Promise.resolve();

  collection(name: string) {
    if (name !== 'serverRateLimits') throw new Error(`Unexpected collection: ${name}`);
    return { doc: (id: string) => ({ id }) };
  }

  runTransaction<T>(work: (transaction: {
    get(reference: unknown): Promise<{ exists: boolean; data(): { count?: unknown; resetAt?: unknown } | undefined }>;
    set(reference: unknown, value: { count: number; resetAt: number }): void;
  }) => Promise<T>): Promise<T> {
    const operation = this.serial.then(() => work({
      get: async (reference) => {
        const record = this.records.get((reference as { id: string }).id);
        return { exists: Boolean(record), data: () => record };
      },
      set: (reference, value) => this.records.set((reference as { id: string }).id, value)
    }));
    this.serial = operation.then(() => undefined, () => undefined);
    return operation;
  }
}

const store = new MemoryRateLimitStore();
const check = (condition: boolean, message: string) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
};

const parallel = await Promise.all(Array.from({ length: 20 }, () =>
  allowDistributedRateLimit(store, 'player-a', 'academy-coach', 10, 600_000, 1_000)
));
check(parallel.filter(Boolean).length === 10, 'concurrent requests cannot exceed the shared account limit');
check(!await allowDistributedRateLimit(store, 'player-a', 'academy-coach', 10, 600_000, 1_001), 'limit stays active before reset');
check(await allowDistributedRateLimit(store, 'player-b', 'academy-coach', 10, 600_000, 1_001), 'another account has an independent limit');
check(await allowDistributedRateLimit(store, 'player-a', 'analyze', 8, 60_000, 1_001), 'another AI route has an independent limit');
check(await allowDistributedRateLimit(store, 'player-a', 'chat', 12, 60_000, 1_001), 'chat translation has its own persistent limit');
check(await allowDistributedRateLimit(store, 'player-a', 'academy-coach', 10, 600_000, 601_000), 'limit resets after its window');

console.log('Distributed AI rate-limit checks passed (6 checks).');
