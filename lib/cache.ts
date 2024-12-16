import { Email, EmailThread } from "@/app/dashboard/types";
import { Summary } from "@/app/dashboard/types";
import { LRUCache } from "lru-cache";

export interface EmailCacheData {
  email?: Email;
  thread?: EmailThread;
  summary?: Summary;
  messages?: Email[];
  totalEmails?: number;
  nextPageToken?: string;
}

export const emailCache = new LRUCache<string, EmailCacheData>({
  max: 500, // Maximum number of items
  ttl: 1000 * 60 * 60, // 1 hour
}); 