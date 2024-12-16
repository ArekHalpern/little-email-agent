// lib/storage/sqliteManager.ts
import path from 'path';
import type { Database } from 'better-sqlite3';
import type { EmailCacheData } from '../cache';

interface SQLiteResult {
  success: boolean;
  error?: string;
  memoryOnly?: boolean;
}

export class SQLiteManager {
  private db: Database | null = null;
  private dbPath: string;
  private memoryFallback: Map<string, string> = new Map();
  private isMemoryOnly: boolean = false;

  constructor() {
    this.dbPath = path.join(process.cwd(), '.data', 'email_cache.db');
  }

  async connect(): Promise<SQLiteResult> {
    // Always use memory storage in browser
    if (typeof window !== 'undefined') {
      console.log('Running in browser, using memory storage');
      this.isMemoryOnly = true;
      return { success: true, memoryOnly: true };
    }

    try {
      // Try to load better-sqlite3 in Node.js environment
      const sqlite = await import('better-sqlite3').catch(() => null);
      
      if (!sqlite) {
        console.log('SQLite module not available, using memory storage');
        this.isMemoryOnly = true;
        return { success: true, memoryOnly: true };
      }

      try {
        this.db = new sqlite.default(this.dbPath);
        
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS cache (
            key TEXT PRIMARY KEY,
            value TEXT,
            timestamp INTEGER
          )
        `);

        console.log('SQLite storage initialized successfully');
        return { success: true };
      } catch (error) {
        console.warn('Failed to initialize SQLite database:', error);
        this.isMemoryOnly = true;
        return { success: true, memoryOnly: true };
      }
    } catch (error) {
      console.warn('Storage initialization error:', error);
      this.isMemoryOnly = true;
      return { 
        success: true, 
        memoryOnly: true,
        error: error instanceof Error ? error.message : 'Storage initialization failed'
      };
    }
  }

  async set(key: string, value: EmailCacheData): Promise<void> {
    if (this.isMemoryOnly) {
      this.memoryFallback.set(key, JSON.stringify(value));
      return;
    }

    if (!this.db) {
      console.warn('Database not initialized, falling back to memory storage');
      this.isMemoryOnly = true;
      this.memoryFallback.set(key, JSON.stringify(value));
      return;
    }
    
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO cache (key, value, timestamp) VALUES (?, ?, ?)'
    );
    
    stmt.run(key, JSON.stringify(value), Date.now());
  }

  async get(key: string): Promise<EmailCacheData | null> {
    if (this.isMemoryOnly) {
      const value = this.memoryFallback.get(key);
      return value ? JSON.parse(value) : null;
    }

    if (!this.db) {
      console.warn('Database not initialized, falling back to memory storage');
      this.isMemoryOnly = true;
      return null;
    }
    
    const stmt = this.db.prepare('SELECT value FROM cache WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    
    return result ? JSON.parse(result.value) : null;
  }

  async clear(): Promise<void> {
    if (this.isMemoryOnly) {
      this.memoryFallback.clear();
      return;
    }

    if (!this.db) {
      console.warn('Database not initialized, falling back to memory storage');
      this.isMemoryOnly = true;
      this.memoryFallback.clear();
      return;
    }

    this.db.prepare('DELETE FROM cache').run();
  }
}