import { RedisClient } from "bun";
import Elysia, { Static, t } from "elysia";
import { v4 as uuidv4 } from "uuid";

import { MEMBER_ID_COOKIE_NAME } from "@/lib/constants";

export const redis = new RedisClient(Bun.env.REDIS_URL);

export const redisEntrySchema = t.Object({
  id: t.String(),
  text: t.String(),
  createdAt: t.String(),
  expiresAt: t.String(),
  ttl: t.Number(),
  imageUrl: t.Optional(t.String()),
});

export type RedisEntry = Static<typeof redisEntrySchema>;

export const memberId = new Elysia().derive({ as: "global" }, ({ cookie }) => {
  if (!cookie[MEMBER_ID_COOKIE_NAME].value) {
    cookie[MEMBER_ID_COOKIE_NAME].value = uuidv4(); // Generate a new member ID
    cookie[MEMBER_ID_COOKIE_NAME].httpOnly = true; // Prevent JavaScript access
    cookie[MEMBER_ID_COOKIE_NAME].maxAge = 24 * 60 * 60; // 24 hours in seconds
  }
  return {
    [MEMBER_ID_COOKIE_NAME]: cookie[MEMBER_ID_COOKIE_NAME].value,
  };
});

export class SessionRedisService {
  private static readonly TTL_SECONDS = 120;
  private static readonly MEMBER_TTL_SECONDS = 15;

  constructor(private sessionId: string) {}

  private getSessionEntryKey(id: string): string {
    return `session:${this.sessionId}:entry:${id}`;
  }

  private getSessionIndexKey(): string {
    return `session:${this.sessionId}:index`;
  }

  private getSessionMembersKey(): string {
    return `session:${this.sessionId}:members`;
  }

  private getSessionMemberKey(memberId: string): string {
    return `session:${this.sessionId}:member:${memberId}`;
  }

  async trackMember(memberId: string): Promise<void> {
    // Add member to the session with TTL
    const membersKey = this.getSessionMembersKey();
    async function setMembersSet() {
      await redis.sadd(membersKey, memberId);
      await redis.expire(
        membersKey,
        SessionRedisService.MEMBER_TTL_SECONDS + 10 // Set longer TTL for the set itself
      );
    }

    // Set TTL for this specific member
    const memberKey = this.getSessionMemberKey(memberId);
    async function setMember() {
      await redis.set(
        memberKey,
        "online",
        "EX",
        SessionRedisService.MEMBER_TTL_SECONDS
      );
    }

    // Set the member and the members set
    await Promise.all([setMembersSet(), setMember()]);
  }

  async getOnlineMemberCount(): Promise<number> {
    // Get all members in the session
    const membersKey = this.getSessionMembersKey();
    const memberIds = await redis.smembers(membersKey);

    // If there are no members, return 0
    if (!memberIds || memberIds.length === 0) {
      return 0;
    }

    // Check which members are still online by checking their individual TTL keys
    let onlineCount = 0;
    await Promise.all(
      memberIds.map(async (memberId) => {
        const memberKey = this.getSessionMemberKey(memberId);
        const isOnline = await redis.get(memberKey);

        if (isOnline) {
          onlineCount++;
        } else {
          // Remove expired member from the set
          await redis.srem(membersKey, memberId);
        }
      })
    );

    // Return the number of online members
    return onlineCount;
  }

  async addEntry(
    text: string,
    ttl: number = SessionRedisService.TTL_SECONDS,
    imageUrl?: string
  ): Promise<RedisEntry> {
    // Generate a unique ID for the entry
    const id = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl * 1000);

    // Create the entry object
    const entry: RedisEntry = {
      id,
      text,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ttl,
      ...(imageUrl && { imageUrl }),
    };

    // Store the entry and then set TTL
    const entryKey = this.getSessionEntryKey(id);
    async function setEntry() {
      await redis.set(entryKey, JSON.stringify(entry));
      await redis.expire(entryKey, ttl);
    }

    // Add to session index (also with TTL)
    const indexKey = this.getSessionIndexKey();
    async function setIndex() {
      await redis.sadd(indexKey, id);
      await redis.expire(indexKey, ttl + 10); // Index expires slightly later
    }

    // Set the entry and the index
    await Promise.all([setEntry(), setIndex()]);

    // Return the entry
    return entry;
  }

  async getAllEntries(): Promise<RedisEntry[]> {
    // Get all entries in the session
    const indexKey = this.getSessionIndexKey();
    const entryIds = await redis.smembers(indexKey);

    // If there are no entries, return an empty array
    if (!entryIds || entryIds.length === 0) {
      return [];
    }

    // Get all entries in the session
    const entries: RedisEntry[] = [];
    const now = new Date();
    await Promise.all(
      entryIds.map(async (id) => {
        const entryKey = this.getSessionEntryKey(id);
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
      })
    );

    // Sort entries by creation date (newest first)
    return entries.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async deleteEntry(id: string): Promise<boolean> {
    // Delete the entry
    const entryKey = this.getSessionEntryKey(id);
    const indexKey = this.getSessionIndexKey();

    // Delete the entry and the index
    const deleted = await redis.del(entryKey);
    await redis.srem(indexKey, id);

    // Return true if the entry was deleted, false otherwise
    return deleted > 0;
  }

  async getEntryCount(): Promise<number> {
    // Get all entries in the session
    const entries = await this.getAllEntries();
    return entries.length;
  }
}
