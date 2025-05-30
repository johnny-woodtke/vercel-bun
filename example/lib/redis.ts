import { RedisClient } from "bun";

export const redis = new RedisClient(Bun.env.REDIS_URL);

export interface RedisEntry {
  id: string;
  text: string;
  createdAt: string;
  expiresAt: string;
  ttl: number;
}

export class SessionRedisService {
  private static readonly TTL_SECONDS = 120;

  constructor(private sessionId: string) {}

  private getSessionKey(id: string): string {
    return `session:${this.sessionId}:entry:${id}`;
  }

  private getSessionIndexKey(): string {
    return `session:${this.sessionId}:index`;
  }

  async addEntry(
    text: string,
    ttl: number = SessionRedisService.TTL_SECONDS
  ): Promise<RedisEntry> {
    const id = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl * 1000);

    const entry: RedisEntry = {
      id,
      text,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ttl,
    };

    const entryKey = this.getSessionKey(id);
    const indexKey = this.getSessionIndexKey();

    // Store the entry and then set TTL
    await redis.set(entryKey, JSON.stringify(entry));
    await redis.expire(entryKey, ttl);

    // Add to session index (also with TTL)
    await redis.sadd(indexKey, id);
    await redis.expire(indexKey, ttl + 10); // Index expires slightly later

    return entry;
  }

  async getAllEntries(): Promise<RedisEntry[]> {
    const indexKey = this.getSessionIndexKey();
    const entryIds = await redis.smembers(indexKey);

    if (!entryIds || entryIds.length === 0) {
      return [];
    }

    const entries: RedisEntry[] = [];
    const now = new Date();

    for (const id of entryIds) {
      const entryKey = this.getSessionKey(id);
      const entryData = await redis.get(entryKey);

      if (entryData) {
        try {
          const entry: RedisEntry = JSON.parse(entryData);
          // Check if entry is still valid
          if (new Date(entry.expiresAt) > now) {
            entries.push(entry);
          } else {
            // Clean up expired entry from index
            await redis.srem(indexKey, id);
          }
        } catch (error) {
          console.error(`Failed to parse entry ${id}:`, error);
          // Clean up corrupted entry
          await redis.srem(indexKey, id);
        }
      } else {
        // Entry expired, remove from index
        await redis.srem(indexKey, id);
      }
    }

    return entries.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async deleteEntry(id: string): Promise<boolean> {
    const entryKey = this.getSessionKey(id);
    const indexKey = this.getSessionIndexKey();

    const deleted = await redis.del(entryKey);
    await redis.srem(indexKey, id);

    return deleted > 0;
  }

  async getEntryCount(): Promise<number> {
    const entries = await this.getAllEntries();
    return entries.length;
  }
}
