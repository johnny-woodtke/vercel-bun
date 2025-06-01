import { RedisClient } from "bun";
import Elysia, { Static, t } from "elysia";
import { v4 as uuidv4 } from "uuid";

import {
  ENTRIES_REFETCH_INTERVAL_MS,
  MAX_TTL,
  MEMBER_ID_COOKIE_NAME,
} from "@/lib/constants";
import { getVercelEnv } from "@/lib/utils";

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
    // Get the environment
    const env = getVercelEnv();

    // Generate a new member ID
    cookie[MEMBER_ID_COOKIE_NAME].value = uuidv4(); // Generate a new member ID

    // Set cookie options
    cookie[MEMBER_ID_COOKIE_NAME].httpOnly = true; // Prevent JavaScript access
    cookie[MEMBER_ID_COOKIE_NAME].maxAge = 24 * 60 * 60; // 24 hours in seconds

    // Set same site and secure non-local environments
    if (env) {
      cookie[MEMBER_ID_COOKIE_NAME].sameSite = "none"; // Allow cross-site requests
      cookie[MEMBER_ID_COOKIE_NAME].secure = true; // Required for sameSite=none, needs HTTPS
    }
  }
  return {
    [MEMBER_ID_COOKIE_NAME]: cookie[MEMBER_ID_COOKIE_NAME].value,
  };
});

export class SessionRedisService {
  private getSessionEntryKey({
    sessionId,
    entryId,
  }: {
    sessionId: string;
    entryId: string;
  }): string {
    return `session:${sessionId}:entry:${entryId}`;
  }

  private getSessionEntriesIndexKey({
    sessionId,
  }: {
    sessionId: string;
  }): string {
    return `session:${sessionId}:entries`;
  }

  private getSessionMemberIndexKey({
    sessionId,
  }: {
    sessionId: string;
  }): string {
    return `session:${sessionId}:members`;
  }

  private getSessionMemberKey({
    sessionId,
    memberId,
  }: {
    sessionId: string;
    memberId: string;
  }): string {
    return `session:${sessionId}:member:${memberId}`;
  }

  async trackMember({
    sessionId,
    memberId,
  }: {
    sessionId: string;
    memberId: string;
  }): Promise<void> {
    // Refetch TTL
    const refetchTTL = Math.floor(ENTRIES_REFETCH_INTERVAL_MS / 1000);

    // Add member to the session with TTL
    const setMembersSet = async () => {
      const membersKey = this.getSessionMemberIndexKey({
        sessionId,
      });
      await redis.sadd(membersKey, memberId);
      await redis.expire(
        membersKey,
        refetchTTL + 15 // Set longer TTL for the set itself
      );
    };

    // Set TTL for this specific member
    const setMember = async () => {
      const memberKey = this.getSessionMemberKey({
        sessionId,
        memberId,
      });
      await redis.set(memberKey, "online", "EX", refetchTTL + 10);
    };

    // Set the member and the members set
    await Promise.all([setMembersSet(), setMember()]);
  }

  async getOnlineMemberCount({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<number> {
    // Get all members in the session
    const membersKey = this.getSessionMemberIndexKey({
      sessionId,
    });
    const memberIds = await redis.smembers(membersKey);

    // If there are no members, return 0
    if (!memberIds || memberIds.length === 0) {
      return 0;
    }

    // Check which members are still online by checking their individual TTL keys
    const memberKeys = memberIds.map((memberId) =>
      this.getSessionMemberKey({
        sessionId,
        memberId,
      })
    );
    const { onlineMemberKeys, offlineMemberIds } = await redis
      .mget(...memberKeys)
      .then((members) => {
        return members.reduce<{
          onlineMemberKeys: string[];
          offlineMemberIds: string[];
        }>(
          (acc, member, index) => {
            if (member) {
              acc.onlineMemberKeys.push(memberKeys[index]);
            } else {
              acc.offlineMemberIds.push(memberIds[index]);
            }
            return acc;
          },
          { onlineMemberKeys: [], offlineMemberIds: [] }
        );
      });

    // Remove offline members from the set
    Promise.allSettled(
      offlineMemberIds.map((memberId) => redis.srem(membersKey, memberId))
    );

    // Return the number of online members
    return onlineMemberKeys.length;
  }

  async addEntry({
    text,
    ttl,
    imageUrl,
    sessionId,
  }: {
    text: string;
    ttl: number;
    imageUrl?: string;
    sessionId: string;
  }): Promise<RedisEntry> {
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

    // Add to session index
    const setIndex = async () => {
      const indexKey = this.getSessionEntriesIndexKey({
        sessionId,
      });
      await redis.sadd(indexKey, id);
      await redis.expire(indexKey, MAX_TTL + 10); // Index expires slightly later than max TTL of an entry
    };

    // Store the entry with TTL
    const setEntry = async () => {
      const entryKey = this.getSessionEntryKey({
        sessionId,
        entryId: id,
      });
      await redis.set(entryKey, JSON.stringify(entry), "EX", ttl);
    };

    // Set the entry and the index
    await Promise.all([setEntry(), setIndex()]);

    // Return the entry
    return entry;
  }

  async getAllEntries({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<RedisEntry[]> {
    // Get all entries in the session
    const indexKey = this.getSessionEntriesIndexKey({
      sessionId,
    });
    const entryIds = await redis.smembers(indexKey);

    // If there are no entries, return an empty array
    if (!entryIds || entryIds.length === 0) {
      return [];
    }

    // Get all entries in the session
    const now = new Date();
    const entryKeys = entryIds.map((entryId) =>
      this.getSessionEntryKey({
        sessionId,
        entryId,
      })
    );
    const { entries, expiredEntryIds } = await redis
      .mget(...entryKeys)
      .then((entries) =>
        entries.reduce<{
          entries: RedisEntry[];
          expiredEntryIds: string[];
        }>(
          (acc, entry, index) => {
            if (!entry) {
              acc.expiredEntryIds.push(entryIds[index]);
              return acc;
            }

            try {
              const parsedEntry: RedisEntry = JSON.parse(entry);
              if (new Date(parsedEntry.expiresAt) > now) {
                acc.entries.push(parsedEntry);
              } else {
                acc.expiredEntryIds.push(entryIds[index]);
              }
            } catch (error) {
              acc.expiredEntryIds.push(entryIds[index]);
            }

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

  async deleteEntry({
    sessionId,
    entryId,
  }: {
    sessionId: string;
    entryId: string;
  }): Promise<boolean> {
    // Delete the entry
    const entryKey = this.getSessionEntryKey({
      sessionId,
      entryId,
    });
    const indexKey = this.getSessionEntriesIndexKey({
      sessionId,
    });

    // Delete the entry
    const deleted = await redis.del(entryKey);

    // Remove the entry from the index
    redis.srem(indexKey, entryId).catch(() => {});

    // Return true if the entry was deleted, false otherwise
    return deleted > 0;
  }

  async getEntryCount({ sessionId }: { sessionId: string }): Promise<number> {
    // Get all entries in the session
    const entries = await this.getAllEntries({ sessionId });
    return entries.length;
  }
}
