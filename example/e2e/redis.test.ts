import { beforeEach, describe, expect, it } from "bun:test";
import { v4 as uuidv4 } from "uuid";

import { getApiClient } from "@/e2e/utils";

const api = getApiClient();

// Test session configuration
const TEST_SESSION_ID = `test-session-${uuidv4()}`;
const TEST_MEMBER_ID = `test-member-${uuidv4()}`;

describe("E2E API Tests - Redis Integration", () => {
  describe("POST /api/redis/entries", () => {
    it("should create a text entry successfully", async () => {
      const entryData = {
        text: "Test entry from E2E tests",
        ttl: 120,
      };

      const { data, status } = await api.redis.entries.post(entryData, {
        query: {
          sessionId: TEST_SESSION_ID,
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
          sessionId: TEST_SESSION_ID,
        },
      });

      expect(status).toBe(400);
      expect(error?.value).toMatchObject({
        error: "TTL must be a number between 10 and 300",
      });
    });

    it("should handle TTL as string", async () => {
      const entryData = {
        text: "Test entry with string TTL",
        ttl: "60", // String instead of number
      };

      const { data, status } = await api.redis.entries.post(entryData, {
        query: {
          sessionId: TEST_SESSION_ID,
        },
      });

      expect(status).toBe(200);
      expect(data?.data?.ttl).toBe(60);
    });

    it("should validate that either text or image is provided", async () => {
      const entryData = {
        ttl: 120,
        // No text or image provided
      };

      const { data, error, status } = await api.redis.entries.post(entryData, {
        query: {
          sessionId: TEST_SESSION_ID,
        },
      });

      expect(status).toBe(400);
      expect(error?.value).toMatchObject({
        error: "Either text or image must be provided",
      });
    });

    it("should validate text length limits", async () => {
      const entryData = {
        text: "x".repeat(1001), // Exceeds MAX_TEXT_LENGTH of 1000
        ttl: 120,
      };

      const response = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${TEST_SESSION_ID}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `memberId=${TEST_MEMBER_ID}`,
          },
          body: JSON.stringify(entryData),
        }
      );

      expect(response.status).toBe(422); // Validation error
    });

    it("should require member ID cookie", async () => {
      const entryData = {
        text: "Test entry without member ID",
        ttl: 120,
      };

      const response = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${TEST_SESSION_ID}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // No memberId cookie
          },
          body: JSON.stringify(entryData),
        }
      );

      expect(response.status).toBe(422); // Missing required cookie
    });

    it("should require session ID query parameter", async () => {
      const entryData = {
        text: "Test entry without session ID",
        ttl: 120,
      };

      const response = await fetch(`${PRODUCTION_DOMAIN}/api/redis/entries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `memberId=${TEST_MEMBER_ID}`,
        },
        body: JSON.stringify(entryData),
      });

      expect(response.status).toBe(422); // Missing required query parameter
    });
  });

  describe("GET /api/redis/entries", () => {
    let createdEntryId: string;

    beforeEach(async () => {
      // Create a test entry for retrieval tests
      const entryData = {
        text: "Test entry for retrieval",
        ttl: 120,
      };

      const response = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${TEST_SESSION_ID}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `memberId=${TEST_MEMBER_ID}`,
          },
          body: JSON.stringify(entryData),
        }
      );

      const result = await response.json();
      createdEntryId = result.data.id;
    });

    it("should retrieve all entries for a session", async () => {
      const response = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${TEST_SESSION_ID}`,
        {
          method: "GET",
          headers: {
            Cookie: `memberId=${TEST_MEMBER_ID}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.onlineCount).toBeGreaterThanOrEqual(1);

      // Should contain our created entry
      const foundEntry = result.data.find(
        (entry: any) => entry.id === createdEntryId
      );
      expect(foundEntry).toBeDefined();
      expect(foundEntry.text).toBe("Test entry for retrieval");
    });

    it("should track online member count", async () => {
      const response = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${TEST_SESSION_ID}`,
        {
          method: "GET",
          headers: {
            Cookie: `memberId=${TEST_MEMBER_ID}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(typeof result.onlineCount).toBe("number");
      expect(result.onlineCount).toBeGreaterThan(0);
    });

    it("should require member ID cookie", async () => {
      const response = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${TEST_SESSION_ID}`,
        {
          method: "GET",
          // No memberId cookie
        }
      );

      expect(response.status).toBe(422);
    });

    it("should require session ID query parameter", async () => {
      const response = await fetch(`${PRODUCTION_DOMAIN}/api/redis/entries`, {
        method: "GET",
        headers: {
          Cookie: `memberId=${TEST_MEMBER_ID}`,
        },
      });

      expect(response.status).toBe(422);
    });
  });

  describe("DELETE /api/redis/entries/:entryId", () => {
    let createdEntryId: string;

    beforeEach(async () => {
      // Create a test entry for deletion tests
      const entryData = {
        text: "Test entry for deletion",
        ttl: 120,
      };

      const response = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${TEST_SESSION_ID}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `memberId=${TEST_MEMBER_ID}`,
          },
          body: JSON.stringify(entryData),
        }
      );

      const result = await response.json();
      createdEntryId = result.data.id;
    });

    it("should delete an entry successfully", async () => {
      const response = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries/${createdEntryId}?sessionId=${TEST_SESSION_ID}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `memberId=${TEST_MEMBER_ID}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.message).toBe("Entry deleted successfully");
    });

    it("should return 404 for non-existent entry", async () => {
      const fakeEntryId = "non-existent-entry-id";

      const response = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries/${fakeEntryId}?sessionId=${TEST_SESSION_ID}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `memberId=${TEST_MEMBER_ID}`,
          },
        }
      );

      expect(response.status).toBe(404);

      const result = await response.json();
      expect(result.error).toBe("Entry not found");
    });

    it("should return 403 when trying to delete another member's entry", async () => {
      const differentMemberId = `different-member-${uuidv4()}`;

      const response = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries/${createdEntryId}?sessionId=${TEST_SESSION_ID}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `memberId=${differentMemberId}`,
          },
        }
      );

      expect(response.status).toBe(403);

      const result = await response.json();
      expect(result.error).toBe("You are not the owner of this entry");
    });

    it("should require member ID cookie", async () => {
      const response = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries/${createdEntryId}?sessionId=${TEST_SESSION_ID}`,
        {
          method: "DELETE",
          // No memberId cookie
        }
      );

      expect(response.status).toBe(422);
    });

    it("should require session ID query parameter", async () => {
      const response = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries/${createdEntryId}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `memberId=${TEST_MEMBER_ID}`,
          },
        }
      );

      expect(response.status).toBe(422);
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

      await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${session1}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `memberId=${memberId}`,
          },
          body: JSON.stringify(entry1Data),
        }
      );

      // Create entry in session 2
      const entry2Data = {
        text: "Entry in session 2",
        ttl: 120,
      };

      await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${session2}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `memberId=${memberId}`,
          },
          body: JSON.stringify(entry2Data),
        }
      );

      // Retrieve entries from session 1
      const session1Response = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${session1}`,
        {
          method: "GET",
          headers: {
            Cookie: `memberId=${memberId}`,
          },
        }
      );

      const session1Result = await session1Response.json();
      const session1Entries = session1Result.data.filter(
        (entry: any) => entry.text === "Entry in session 1"
      );

      // Retrieve entries from session 2
      const session2Response = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${session2}`,
        {
          method: "GET",
          headers: {
            Cookie: `memberId=${memberId}`,
          },
        }
      );

      const session2Result = await session2Response.json();
      const session2Entries = session2Result.data.filter(
        (entry: any) => entry.text === "Entry in session 2"
      );

      // Verify session isolation
      expect(session1Entries.length).toBe(1);
      expect(session2Entries.length).toBe(1);
      expect(session1Entries[0].text).toBe("Entry in session 1");
      expect(session2Entries[0].text).toBe("Entry in session 2");
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

      await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${sessionId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `memberId=${member1Id}`,
          },
          body: JSON.stringify(member1Entry),
        }
      );

      // Member 2 creates an entry
      const member2Entry = {
        text: "Entry by member 2",
        ttl: 120,
      };

      await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${sessionId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `memberId=${member2Id}`,
          },
          body: JSON.stringify(member2Entry),
        }
      );

      // Both members should see both entries
      const member1Response = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${sessionId}`,
        {
          method: "GET",
          headers: {
            Cookie: `memberId=${member1Id}`,
          },
        }
      );

      const member1Result = await member1Response.json();
      expect(member1Result.data.length).toBeGreaterThanOrEqual(2);
      expect(member1Result.onlineCount).toBeGreaterThanOrEqual(1);

      const member2Response = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${sessionId}`,
        {
          method: "GET",
          headers: {
            Cookie: `memberId=${member2Id}`,
          },
        }
      );

      const member2Result = await member2Response.json();
      expect(member2Result.data.length).toBeGreaterThanOrEqual(2);
      expect(member2Result.onlineCount).toBeGreaterThanOrEqual(1);
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

        const promise = fetch(
          `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${sessionId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: `memberId=${memberId}`,
            },
            body: JSON.stringify(entryData),
          }
        );

        promises.push(promise);
      }

      const responses = await Promise.all(promises);

      // All requests should succeed
      for (const response of responses) {
        expect(response.status).toBe(200);
      }

      // Verify all entries were created
      const getResponse = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${sessionId}`,
        {
          method: "GET",
          headers: {
            Cookie: `memberId=${memberId}`,
          },
        }
      );

      const result = await getResponse.json();
      const concurrentEntries = result.data.filter((entry: any) =>
        entry.text.startsWith("Concurrent entry")
      );

      expect(concurrentEntries.length).toBe(numEntries);
    });
  });
});
