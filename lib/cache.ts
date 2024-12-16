import type { gmail_v1 } from 'googleapis';

export interface EmailCacheData {
  messages: gmail_v1.Schema$Message[];
  totalEmails: number;
  nextPageToken?: string | null;
}

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

type CacheData = EmailCacheData | string;

class EmailCache {
  private cache: Map<string, CacheEntry<CacheData>> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes cache TTL

  set(key: string, data: CacheData) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key: string): CacheData | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear() {
    this.cache.clear();
  }
}

export const emailCache = new EmailCache(); 