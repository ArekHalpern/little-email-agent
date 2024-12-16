import type { Email, Summary } from '@/app/dashboard/types';

export interface EmailCacheData {
  email?: Email;
  summary?: Summary;
  messages?: Email[];
  totalEmails?: number;
  nextPageToken?: string;
}

export interface EmailCache {
  get: (key: string) => EmailCacheData | undefined;
  set: (key: string, value: EmailCacheData) => void;
  clear: () => void;
}

class Cache implements EmailCache {
  private cache: Map<string, EmailCacheData>;

  constructor() {
    this.cache = new Map();
  }

  get(key: string) {
    return this.cache.get(key);
  }

  set(key: string, value: EmailCacheData) {
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }
}

export const emailCache = new Cache(); 