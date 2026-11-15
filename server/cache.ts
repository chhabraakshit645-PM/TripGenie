interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryTtlCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private maxEntries = 300;

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }
}

export const apiCache = new MemoryTtlCache();

let lastNominatimCallMs = 0;

export async function waitForNominatimSlot(): Promise<void> {
  const minIntervalMs = 1100;
  const elapsed = Date.now() - lastNominatimCallMs;
  if (elapsed < minIntervalMs) {
    await new Promise((resolve) => setTimeout(resolve, minIntervalMs - elapsed));
  }
  lastNominatimCallMs = Date.now();
}
