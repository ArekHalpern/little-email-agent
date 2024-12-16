import type { Email, EmailThread, Summary } from "../../app/dashboard/types";
import { SQLiteManager } from '../local-storage/sqliteManager';

export interface EmailCacheData {
  email?: Email;
  thread?: EmailThread;
  summary?: Summary;
  messages?: Email[];
  totalEmails?: number;
  nextPageToken?: string;
  historyId?: string;
}

export class EmailCache {
  private static instance: EmailCache;
  private storage: SQLiteManager;
  private memCache: Map<string, EmailCacheData>;
  private initialized: boolean = false;

  private constructor() {
    this.storage = new SQLiteManager();
    this.memCache = new Map();
  }

  static getInstance(): EmailCache {
    if (!EmailCache.instance) {
      EmailCache.instance = new EmailCache();
    }
    return EmailCache.instance;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const result = await this.storage.connect();
      if (!result.success) {
        throw new Error(`Failed to initialize cache: ${result.error}`);
      }

      this.initialized = true;
      return result;
    } catch (error) {
      console.error('Cache initialization failed:', error);
      // Fallback to memory-only cache if SQLite fails
      this.initialized = true;
      return { success: true, memoryOnly: true };
    }
  }

  async set(key: string, value: EmailCacheData) {
    this.memCache.set(key, value);
    await this.storage.set(key, value);
  }

  async get(key: string): Promise<EmailCacheData | null> {
    if (this.memCache.has(key)) {
      return this.memCache.get(key)!;
    }

    const value = await this.storage.get(key);
    if (value) {
      this.memCache.set(key, value);
    }
    return value;
  }

  async clear() {
    this.memCache.clear();
    await this.storage.clear();
  }
}

export const emailCache = EmailCache.getInstance(); 