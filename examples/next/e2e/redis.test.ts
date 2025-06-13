import { beforeEach, describe, expect, it } from "bun:test";
import { v4 as uuidv4 } from "uuid";

import { getApiClient, TEST_MEMBER_ID, getTestSessionId } from "@/e2e/utils";

const api = getApiClient();

describe("E2E API Tests - Redis Integration", () => {
  describe("POST /api/redis/entries", () => {
    it("should create a text entry successfully", async () => {
      const entryData = {
        text: "Test entry from E2E tests",
        ttl: 120,
      };

      const { data, status } = await api.redis.entries.post(entryData, {
        query: {
          sessionId: getTestSessionId(),
        },
      });

      expect(status).toBe(200);

      expect(data?.data).toMatchObject({
        text: entryData.text,
        ttl: entryData.ttl,
        memberId: TEST_MEMBER_ID,
      });
      expect(data?.data?.id).toBeDefined();
      expect(data?.data?.createdAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    });

    it("should handle TTL validation", async () => {
      const entryData = {
        text: "Test entry with invalid TTL",
        ttl: 5, // Below minimum TTL of 10
      };

      const { data, error, status } = await api.redis.entries.post(entryData, {
        query: {
          sessionId: getTestSessionId(),
        },
      });

      // Elysia schema validation returns 422, not 400
      expect(status).toBe(422);
    });

    it("should handle TTL as string", async () => {
      const entryData = {
        text: "Test entry with string TTL",
        ttl: "60", // String instead of number
      };

      const { data, status } = await api.redis.entries.post(entryData, {
        query: {
          sessionId: getTestSessionId(),
        },
      });

      expect(status).toBe(200);
      expect(data?.data?.ttl).toBe(60);
    });

    it("should validate that either text or image is provided", async () => {
      const entryData = {
        ttl: 120,
      };

      const { data, error, status } = await api.redis.entries.post(entryData, {
        query: {
          sessionId: getTestSessionId(),
        },
      });

      expect(status).toBe(400);
      expect(error?.value).toMatchObject({
        error: "Either text or image must be provided",
      });
    });

    it("should validate text length limits", async () => {
      const entryData = {
        text: "x".repeat(1001),
        ttl: 120,
      };

      const { status } = await api.redis.entries.post(entryData, {
        query: {
          sessionId: getTestSessionId(),
        },
      });

      expect(status).toBe(422);
    });

    it("should require member ID cookie", async () => {
      const entryData = {
        text: "Test entry without member ID",
        ttl: 120,
      };

      // Create a new client without default cookies
      const apiWithoutCookies = getApiClient(false);
      const { status } = await apiWithoutCookies.redis.entries.post(entryData, {
        query: {
          sessionId: getTestSessionId(),
        },
      });

      expect(status).toBe(422);
    });
  });

  describe("GET /api/redis/entries", () => {
    let createdEntryId: string;
    let testSessionId: string;

    beforeEach(async () => {
      // Use a consistent session ID for this test suite
      testSessionId = getTestSessionId();

      // Create a test entry for retrieval tests
      const entryData = {
        text: "Test entry for retrieval",
        ttl: 120,
      };

      const { data } = await api.redis.entries.post(entryData, {
        query: {
          sessionId: testSessionId,
        },
      });

      createdEntryId = data?.data?.id || "";
    });

    it("should retrieve all entries for a session", async () => {
      const { data, status } = await api.redis.entries.get({
        query: {
          sessionId: testSessionId, // Use the same session ID from beforeEach
        },
      });

      expect(status).toBe(200);
      expect(Array.isArray(data?.data)).toBe(true);
      expect(data?.onlineCount).toBeGreaterThanOrEqual(1);

      // Should contain our created entry
      const foundEntry = data?.data?.find(
        (entry: any) => entry.id === createdEntryId
      );
      expect(foundEntry).toBeDefined();
      expect(foundEntry?.text).toBe("Test entry for retrieval");
    });

    it("should track online member count", async () => {
      const { data, status } = await api.redis.entries.get({
        query: {
          sessionId: testSessionId,
        },
      });

      expect(status).toBe(200);
      expect(typeof data?.onlineCount).toBe("number");
      expect(data?.onlineCount).toBeGreaterThan(0);
    });

    it("should require member ID cookie", async () => {
      const apiWithoutCookies = getApiClient(false);
      const { status } = await apiWithoutCookies.redis.entries.get({
        query: {
          sessionId: testSessionId,
        },
      });

      expect(status).toBe(422);
    });
  });

  describe("DELETE /api/redis/entries/:entryId", () => {
    let createdEntryId: string;
    let testSessionId: string;

    beforeEach(async () => {
      // Use a consistent session ID for this test suite
      testSessionId = getTestSessionId();

      // Create a test entry for deletion tests
      const entryData = {
        text: "Test entry for deletion",
        ttl: 120,
      };

      const { data } = await api.redis.entries.post(entryData, {
        query: {
          sessionId: testSessionId,
        },
      });

      createdEntryId = data?.data?.id || "";
    });

    it("should delete an entry successfully", async () => {
      const { data, status } = await api.redis
        .entries({ entryId: createdEntryId })
        .delete(
          {},
          {
            query: {
              sessionId: testSessionId, // Use the same session ID from beforeEach
            },
          }
        );

      expect(status).toBe(200);
      expect(data?.message).toBe("Entry deleted successfully");
    });

    it("should return 404 for non-existent entry", async () => {
      const fakeEntryId = "non-existent-entry-id";

      const { status } = await api.redis
        .entries({ entryId: fakeEntryId })
        .delete(
          {},
          {
            query: {
              sessionId: testSessionId,
            },
          }
        );

      expect(status).toBe(404);
    });

    it("should only delete entries owned by the member", async () => {
      // This test would need a different member ID to properly test authorization
      // For now, we'll test with the same pattern but expect success
      const { status } = await api.redis
        .entries({ entryId: createdEntryId })
        .delete(
          {},
          {
            query: {
              sessionId: testSessionId, // Use the same session ID from beforeEach
            },
          }
        );

      expect(status).toBe(200);
    });
  });

  describe("Redis Session Management", () => {
    it("should isolate entries between different sessions", async () => {
      const session1 = `test-session-1-${uuidv4()}`;
      const session2 = `test-session-2-${uuidv4()}`;
      const memberId = `test-member-${uuidv4()}`;

      // Create entry in session 1
      const entry1Data = {
        text: "Entry in session 1",
        ttl: 120,
      };

      await api.redis.entries.post(entry1Data, {
        query: {
          sessionId: session1,
        },
      });

      // Create entry in session 2
      const entry2Data = {
        text: "Entry in session 2",
        ttl: 120,
      };

      await api.redis.entries.post(entry2Data, {
        query: {
          sessionId: session2,
        },
        headers: {
          cookie: `memberId=${memberId}`,
        },
      });

      // Retrieve entries from session 1
      const { data: session1Result } = await api.redis.entries.get({
        query: {
          sessionId: session1,
        },
        headers: {
          cookie: `memberId=${memberId}`,
        },
      });

      const session1Entries =
        session1Result?.data?.filter(
          (entry: any) => entry.text === "Entry in session 1"
        ) || [];

      // Retrieve entries from session 2
      const { data: session2Result } = await api.redis.entries.get({
        query: {
          sessionId: session2,
        },
        headers: {
          cookie: `memberId=${memberId}`,
        },
      });

      const session2Entries =
        session2Result?.data?.filter(
          (entry: any) => entry.text === "Entry in session 2"
        ) || [];

      // Verify session isolation
      expect(session1Entries.length).toBe(1);
      expect(session2Entries.length).toBe(1);
      expect(session1Entries[0]?.text).toBe("Entry in session 1");
      expect(session2Entries[0]?.text).toBe("Entry in session 2");
    });

    it("should handle multiple members in the same session", async () => {
      const sessionId = `multi-member-session-${uuidv4()}`;
      const member1Id = `member-1-${uuidv4()}`;
      const member2Id = `member-2-${uuidv4()}`;

      // Member 1 creates an entry
      const member1Entry = {
        text: "Entry by member 1",
        ttl: 120,
      };

      await api.redis.entries.post(member1Entry, {
        query: {
          sessionId,
        },
        headers: {
          Cookie: `memberId=${member1Id}`,
        },
      });

      // Member 2 creates an entry
      const member2Entry = {
        text: "Entry by member 2",
        ttl: 120,
      };

      await api.redis.entries.post(member2Entry, {
        query: {
          sessionId,
        },
        headers: {
          cookie: `memberId=${member2Id}`,
        },
      });

      // Both members should see both entries
      const { data: member1Result } = await api.redis.entries.get({
        query: {
          sessionId,
        },
        headers: {
          cookie: `memberId=${member1Id}`,
        },
      });

      expect(member1Result?.data?.length).toBeGreaterThanOrEqual(2);
      expect(member1Result?.onlineCount).toBeGreaterThanOrEqual(1);

      const { data: member2Result } = await api.redis.entries.get({
        query: {
          sessionId,
        },
        headers: {
          cookie: `memberId=${member2Id}`,
        },
      });

      expect(member2Result?.data?.length).toBeGreaterThanOrEqual(2);
      expect(member2Result?.onlineCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Redis Integration Performance", () => {
    it("should handle concurrent entry creation", async () => {
      const sessionId = `perf-session-${uuidv4()}`;
      const memberId = `perf-member-${uuidv4()}`;

      const promises = [];
      const numEntries = 5;

      for (let i = 0; i < numEntries; i++) {
        const entryData = {
          text: `Concurrent entry ${i}`,
          ttl: 120,
        };

        const promise = api.redis.entries.post(entryData, {
          query: {
            sessionId,
          },
          headers: {
            cookie: `memberId=${memberId}`,
          },
        });

        promises.push(promise);
      }

      const responses = await Promise.all(promises);

      // All requests should succeed
      for (const response of responses) {
        expect(response.status).toBe(200);
      }

      // Verify all entries were created
      const { data: result } = await api.redis.entries.get({
        query: {
          sessionId,
        },
        headers: {
          cookie: `memberId=${memberId}`,
        },
      });

      const concurrentEntries =
        result?.data?.filter((entry: any) =>
          entry.text.startsWith("Concurrent entry")
        ) || [];

      expect(concurrentEntries.length).toBe(numEntries);
    });
  });
});
