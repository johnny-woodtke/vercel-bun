import { RedisClient } from "bun";
import { Static, t } from "elysia";
import { v4 as uuidv4 } from "uuid";

import { ENTRIES_REFETCH_INTERVAL_MS, MAX_TTL } from "@/lib/constants";

export const redis = new RedisClient(Bun.env.REDIS_URL);

export const redisEntrySchema = t.Object({
  id: t.String(),
  text: t.String(),
  createdAt: t.String(),
  expiresAt: t.String(),
  ttl: t.Number(),
  imageUrl: t.Optional(t.String()),
  memberId: t.String(),
});

export type RedisEntry = Static<typeof redisEntrySchema>;

export class SessionRedisService {
  private getEntryKey({
    sessionId,
    entryId,
  }: {
    sessionId: string;
    entryId: string;
  }): string {
    return `session:${sessionId}:entry:${entryId}`;
  }

  private getEntryIndexKey({ sessionId }: { sessionId: string }): string {
    return `session:${sessionId}:entries`;
  }

  private getMemberIndexKey({ sessionId }: { sessionId: string }): string {
    return `session:${sessionId}:members`;
  }

  private getMemberKey({
    sessionId,
    memberId,
  }: {
    sessionId: string;
    memberId: string;
  }): string {
    return `session:${sessionId}:member:${memberId}`;
  }

  private getMemberTTL(): number {
    return Math.floor(ENTRIES_REFETCH_INTERVAL_MS / 1000) + 10;
  }

  async trackMember({
    sessionId,
    memberId,
  }: {
    sessionId: string;
    memberId: string;
  }): Promise<void> {
    // Get TTL
    const memberTTL = this.getMemberTTL();

    // Add member to the session with TTL
    const setMembersSet = async () => {
      const membersKey = this.getMemberIndexKey({ sessionId });
      await redis.sadd(membersKey, memberId);
      await redis.expire(
        membersKey,
        memberTTL + 5 // Set longer TTL for the set itself
      );
    };

    // Set TTL for this specific member
    const setMemberPromise = redis.set(
      this.getMemberKey({ sessionId, memberId }),
      "online",
      "EX",
      memberTTL
    );

    // Set the member and the members set
    await Promise.all([setMembersSet(), setMemberPromise]);
  }

  async getOnlineMemberCount({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<number> {
    // Get all members in the session
    const memberIds = await redis.smembers(
      this.getMemberIndexKey({ sessionId })
    );

    // If there are no members, return 0
    if (!memberIds || memberIds.length === 0) {
      return 0;
    }

    // Check which members are still online by checking their individual TTL keys
    // Also record offline member IDs to remove them from the set
    const { onlineMemberCount, offlineMemberIds } = await redis
      .mget(
        ...memberIds.map((memberId) =>
          this.getMemberKey({ sessionId, memberId })
        )
      )
      .then((members) => {
        return members.reduce<{
          onlineMemberCount: number;
          offlineMemberIds: string[];
        }>(
          (acc, member, index) => {
            // If the member is online, increment the online member count
            if (member) {
              acc.onlineMemberCount++;
              return acc;
            }

            // If the member is offline, record it to remove it from the set
            acc.offlineMemberIds.push(memberIds[index]);
            return acc;
          },
          { onlineMemberCount: 0, offlineMemberIds: [] }
        );
      });

    // Remove offline members from the set
    Promise.allSettled(
      offlineMemberIds.map((memberId) =>
        redis.srem(this.getMemberIndexKey({ sessionId }), memberId)
      )
    );

    // Return the number of online members
    return onlineMemberCount;
  }

  async addEntry({
    text,
    ttl,
    imageUrl,
    sessionId,
    memberId,
  }: {
    text: string;
    ttl: number;
    imageUrl?: string;
    sessionId: string;
    memberId: string;
  }): Promise<RedisEntry> {
    // Generate a unique ID for the entry
    const entryId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl * 1000);

    // Create the entry object
    const entry: RedisEntry = {
      id: entryId,
      text,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ttl,
      ...(imageUrl && { imageUrl }),
      memberId,
    };

    // Add to entry index
    const setEntryIndex = async () => {
      const indexKey = this.getEntryIndexKey({ sessionId });
      await redis.sadd(indexKey, entryId);
      await redis.expire(indexKey, MAX_TTL + 10); // Index expires slightly later than max TTL of an entry
    };

    // Store the entry with TTL
    const setEntryPromise = redis.set(
      this.getEntryKey({ sessionId, entryId }),
      JSON.stringify(entry),
      "EX",
      ttl
    );

    // Set the entry and the index
    await Promise.all([setEntryIndex(), setEntryPromise]);

    // Return the entry
    return entry;
  }

  async getAllEntries({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<RedisEntry[]> {
    // Get all entries in the session
    const indexKey = this.getEntryIndexKey({ sessionId });
    const entryIds = await redis.smembers(indexKey);

    // If there are no entries, return an empty array
    if (!entryIds || entryIds.length === 0) {
      return [];
    }

    // Get all entries in the session
    // Also record expired entry IDs to remove them from the index
    const now = new Date();
    const { entries, expiredEntryIds } = await redis
      .mget(
        ...entryIds.map((entryId) => this.getEntryKey({ sessionId, entryId }))
      )
      .then((entries) =>
        entries.reduce<{
          entries: RedisEntry[];
          expiredEntryIds: string[];
        }>(
          (acc, entry, index) => {
            // If the entry is expired, record it to remove it from the index
            if (!entry) {
              acc.expiredEntryIds.push(entryIds[index]);
              return acc;
            }

            // Parse the entry
            try {
              const parsedEntry: RedisEntry = JSON.parse(entry);

              // If the entry is not expired, add it to the entries array
              if (new Date(parsedEntry.expiresAt) > now) {
                acc.entries.push(parsedEntry);
                return acc;
              }

              // If the entry is expired, record it to remove it from the index
              acc.expiredEntryIds.push(entryIds[index]);
              return acc;
            } catch (error) {
              acc.expiredEntryIds.push(entryIds[index]);
            }

            // Return the accumulator
            return acc;
          },
          { entries: [], expiredEntryIds: [] }
        )
      );

    // Remove expired entries from the index
    Promise.allSettled(
      expiredEntryIds.map((entryId) => redis.srem(indexKey, entryId))
    );

    // Sort entries by creation date (newest first)
    return entries.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getEntry({
    sessionId,
    entryId,
  }: {
    sessionId: string;
    entryId: string;
  }): Promise<RedisEntry | null> {
    // Get the entry
    const entry = await redis.get(this.getEntryKey({ sessionId, entryId }));

    // Return the entry if it exists, null otherwise
    return entry ? JSON.parse(entry) : null;
  }

  async deleteEntry({
    sessionId,
    entryId,
  }: {
    sessionId: string;
    entryId: string;
  }): Promise<boolean> {
    // Delete the entry
    const deleted = await redis.del(this.getEntryKey({ sessionId, entryId }));

    // Remove the entry from the index
    redis.srem(this.getEntryIndexKey({ sessionId }), entryId).catch(() => {});

    // Return true if the entry was deleted, false otherwise
    return deleted > 0;
  }
}
