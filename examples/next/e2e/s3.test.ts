import { describe, expect, it } from "bun:test";

import {
  createTestImageFile,
  getApiClient,
  getTestSessionId,
} from "@/e2e/utils";

const api = getApiClient();

describe("E2E API Tests - S3/R2 Integration", () => {
  it("should upload an accessible image", async () => {
    const testImage = createTestImageFile({
      name: "test-upload.jpg",
      size: 2 * 1024, // 2 kB
    });

    const { data, status } = await api.redis.entries.post(
      { image: testImage, ttl: 120 },
      { query: { sessionId: getTestSessionId() } }
    );

    expect(status).toBe(200);
    expect(data).toBeDefined();

    const imageResponse = await fetch(data!.data!.imageUrl!);

    expect(imageResponse.status).toBe(200);
    expect(imageResponse.body).toBeDefined();
    expect(imageResponse.headers.get("content-type")).toBe("image/jpeg");
    expect(imageResponse.headers.get("content-length")).toBe(
      testImage.size.toString()
    );
  });

  it("should validate file size", async () => {
    const testImage = createTestImageFile({
      name: "test-upload.jpg",
      size: 6 * 1024 * 1024, // 6 MB
    });

    const { data, status, error } = await api.redis.entries.post(
      { image: testImage, ttl: 120 },
      { query: { sessionId: getTestSessionId() } }
    );

    expect([422, 413]).toContain(status);
    expect(data).toBeNull();
    expect(error?.value).toBeDefined();
  });

  it("should validate the file type", async () => {
    const testImage = createTestImageFile({
      name: "test-upload.txt",
      size: 2 * 1024, // 2 kB
    });

    const { data, status, error } = await api.redis.entries.post(
      { image: testImage, ttl: 120 },
      { query: { sessionId: getTestSessionId() } }
    );

    expect(status).toBe(422);
    expect(data).toBeNull();
    expect(error?.value).toBeDefined();
  });
});
