import { beforeAll, describe, expect, it } from "bun:test";
import { v4 as uuidv4 } from "uuid";

import { getApiClient, getTestSessionId, TEST_MEMBER_ID } from "@/e2e/utils";

const api = getApiClient();

// Helper function to create a test image file
function createTestImageFile(name = "test-image.jpg", size = 1024) {
  // Create a simple image-like binary data
  const buffer = new ArrayBuffer(size);
  const view = new Uint8Array(buffer);

  // Fill with some pattern to simulate image data
  for (let i = 0; i < size; i++) {
    view[i] = i % 256;
  }

  const file = new File([buffer], name, { type: "image/jpeg" });
  return file;
}

// Helper function to create request body for image upload
function createImageRequestBody(imageFile: File, text?: string, ttl = 120) {
  const requestBody: {
    image: File;
    ttl: number;
    text?: string;
  } = {
    image: imageFile,
    ttl,
  };

  if (text) {
    requestBody.text = text;
  }

  return requestBody;
}

describe("E2E API Tests - S3/R2 Integration", () => {
  describe("Image Upload via Redis Entries", () => {
    it(
      "should upload an image successfully",
      async () => {
        const testImage = createTestImageFile("test-upload.jpg", 2048);
        const requestBody = createImageRequestBody(
          testImage,
          "Test image upload"
        );

        const { data: result, status } = await api.redis.entries.post(
          requestBody,
          {
            query: {
              sessionId: getTestSessionId(),
            },
          }
        );

        expect(status).toBe(200);

        expect(result?.data).toMatchObject({
          text: "Test image upload",
          ttl: 120,
          memberId: TEST_MEMBER_ID,
        });
        expect(result?.data?.imageUrl).toBeDefined();
        expect(result?.data?.imageUrl).toMatch(/^https?:\/\//);
        expect(result?.data?.id).toBeDefined();
        expect(result?.data?.createdAt).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
        );
      },
      { timeout: 10000 }
    );

    it(
      "should upload image without text",
      async () => {
        const testImage = createTestImageFile("no-text-image.png", 1536);
        const requestBody = createImageRequestBody(testImage); // No text provided

        const { data: result, status } = await api.redis.entries.post(
          requestBody,
          {
            query: {
              sessionId: getTestSessionId(),
            },
          }
        );

        expect(status).toBe(200);

        expect(result?.data?.imageUrl).toBeDefined();
        expect(result?.data?.imageUrl).toMatch(/^https?:\/\//);
        expect(result?.data?.text).toBe(""); // API returns empty string, not undefined
      },
      { timeout: 10000 }
    );

    it(
      "should handle different image file types",
      async () => {
        const imageTypes = [
          { name: "test.jpg", type: "image/jpeg" },
          { name: "test.png", type: "image/png" },
          { name: "test.gif", type: "image/gif" },
          { name: "test.webp", type: "image/webp" },
        ];

        const testSessionId = getTestSessionId();

        for (const imageType of imageTypes) {
          const buffer = new ArrayBuffer(1024);
          const file = new File([buffer], imageType.name, {
            type: imageType.type,
          });
          const requestBody = createImageRequestBody(
            file,
            `Test ${imageType.type} upload`
          );

          const { data: result, status } = await api.redis.entries.post(
            requestBody,
            {
              query: {
                sessionId: testSessionId,
              },
            }
          );

          expect(status).toBe(200);

          expect(result?.data?.imageUrl).toBeDefined();
          expect(result?.data?.imageUrl).toMatch(/^https?:\/\//);

          // URL should contain the session ID and have proper file extension
          expect(result?.data?.imageUrl).toContain(testSessionId);
          const expectedExtension = imageType.name.split(".").pop();
          expect(result?.data?.imageUrl).toContain(`.${expectedExtension}`);
        }
      },
      { timeout: 10000 }
    );

    it(
      "should handle large image files",
      async () => {
        // Test with a larger file (100KB)
        const largeImage = createTestImageFile("large-image.jpg", 100 * 1024);
        const requestBody = createImageRequestBody(
          largeImage,
          "Large image test"
        );

        const { data: result, status } = await api.redis.entries.post(
          requestBody,
          {
            query: {
              sessionId: getTestSessionId(),
            },
          }
        );

        expect(status).toBe(200);

        expect(result?.data?.imageUrl).toBeDefined();
        expect(result?.data?.imageUrl).toMatch(/^https?:\/\//);
      },
      { timeout: 10000 }
    );

    it(
      "should generate unique file names for each upload",
      async () => {
        const uploadedUrls: string[] = [];
        const numUploads = 3;

        for (let i = 0; i < numUploads; i++) {
          const testImage = createTestImageFile(
            `duplicate-test-${i}.jpg`,
            1024
          );
          const requestBody = createImageRequestBody(
            testImage,
            `Duplicate test ${i}`
          );

          const { data: result, status } = await api.redis.entries.post(
            requestBody,
            {
              query: {
                sessionId: getTestSessionId(),
              },
            }
          );

          expect(status).toBe(200);

          expect(result?.data?.imageUrl).toBeDefined();
          uploadedUrls.push(result?.data?.imageUrl || "");
        }

        // All URLs should be unique
        const uniqueUrls = new Set(uploadedUrls);
        expect(uniqueUrls.size).toBe(numUploads);
      },
      { timeout: 10000 }
    );
  });

  describe("Image URL Accessibility", () => {
    let uploadedImageUrl: string;

    beforeAll(async () => {
      // Upload an image to test accessibility
      const testImage = createTestImageFile("accessibility-test.jpg", 2048);
      const requestBody = createImageRequestBody(
        testImage,
        "Accessibility test image"
      );

      const { data: result } = await api.redis.entries.post(requestBody, {
        query: {
          sessionId: getTestSessionId(),
        },
      });

      uploadedImageUrl = result?.data?.imageUrl || "";
    });

    it(
      "should make uploaded images publicly accessible",
      async () => {
        expect(uploadedImageUrl).toBeDefined();
        expect(uploadedImageUrl.length).toBeGreaterThan(0);

        const imageResponse = await fetch(uploadedImageUrl);
        expect(imageResponse.status).toBe(200);
        expect(imageResponse.headers.get("content-type")).toMatch(/^image\//);
      },
      { timeout: 10000 }
    );

    it(
      "should return proper image content",
      async () => {
        const imageResponse = await fetch(uploadedImageUrl);
        expect(imageResponse.status).toBe(200);

        const imageBuffer = await imageResponse.arrayBuffer();
        expect(imageBuffer.byteLength).toBeGreaterThan(0);
        expect(imageBuffer.byteLength).toBe(2048); // Should match our test file size
      },
      { timeout: 10000 }
    );
  });

  describe("S3/R2 Storage Integration", () => {
    it(
      "should handle concurrent image uploads",
      async () => {
        const numUploads = 3;
        const uploadPromises = [];

        for (let i = 0; i < numUploads; i++) {
          const testImage = createTestImageFile(`concurrent-${i}.jpg`, 1024);
          const requestBody = createImageRequestBody(
            testImage,
            `Concurrent ${i}`
          );

          const promise = api.redis.entries.post(requestBody, {
            query: {
              sessionId: getTestSessionId(),
            },
          });

          uploadPromises.push(promise);
        }

        const results = await Promise.all(uploadPromises);

        // All uploads should succeed
        for (const result of results) {
          expect(result.status).toBe(200);
          expect(result.data?.data?.imageUrl).toBeDefined();
        }

        // All URLs should be different
        const imageUrls = results
          .map((r) => r.data?.data?.imageUrl)
          .filter(Boolean);
        const uniqueUrls = new Set(imageUrls);
        expect(uniqueUrls.size).toBe(numUploads);
      },
      { timeout: 10000 }
    );

    it(
      "should isolate images between different sessions",
      async () => {
        const session1 = `s3-session-1-${uuidv4()}`;
        const session2 = `s3-session-2-${uuidv4()}`;
        const memberId = `s3-member-${uuidv4()}`;

        // Upload to session 1
        const image1 = createTestImageFile("session1-image.jpg", 1024);
        const requestBody1 = createImageRequestBody(image1, "Session 1 image");

        const { data: result1 } = await api.redis.entries.post(requestBody1, {
          query: {
            sessionId: session1,
          },
          headers: {
            Cookie: `memberId=${memberId}`,
          },
        });

        // Upload to session 2
        const image2 = createTestImageFile("session2-image.jpg", 1024);
        const requestBody2 = createImageRequestBody(image2, "Session 2 image");

        const { data: result2 } = await api.redis.entries.post(requestBody2, {
          query: {
            sessionId: session2,
          },
          headers: {
            Cookie: `memberId=${memberId}`,
          },
        });

        // Both uploads should succeed and have different URLs
        expect(result1?.data?.imageUrl).toBeDefined();
        expect(result2?.data?.imageUrl).toBeDefined();
        expect(result1?.data?.imageUrl).not.toBe(result2?.data?.imageUrl);

        // URLs should contain their respective session IDs
        expect(result1?.data?.imageUrl).toContain(session1);
        expect(result2?.data?.imageUrl).toContain(session2);
      },
      { timeout: 10000 }
    );

    it(
      "should handle image upload errors gracefully",
      async () => {
        // Test with oversized file (this should fail based on API limits)
        const oversizedImage = createTestImageFile(
          "oversized.jpg",
          6 * 1024 * 1024
        ); // 6MB
        const requestBody = createImageRequestBody(
          oversizedImage,
          "Oversized test"
        );

        const { status } = await api.redis.entries.post(requestBody, {
          query: {
            sessionId: getTestSessionId(),
          },
        });

        // Should return 422 for validation error (file too large per app limits)
        // Note: If this returns 413, it means the server rejected before validation
        expect([422, 413]).toContain(status);
      },
      { timeout: 10000 }
    );

    it(
      "should ensure uploaded images are accessible via HTTP",
      async () => {
        const imageUrls: string[] = [];

        // Upload multiple images
        for (let i = 0; i < 3; i++) {
          const testImage = createTestImageFile(`http-test-${i}.jpg`, 1024);
          const requestBody = createImageRequestBody(
            testImage,
            `HTTP test ${i}`
          );

          const { data: result } = await api.redis.entries.post(requestBody, {
            query: {
              sessionId: getTestSessionId(),
            },
          });

          if (result?.data?.imageUrl) {
            imageUrls.push(result.data.imageUrl);
          }
        }

        // Test HTTP accessibility of all uploaded images
        const accessibilityPromises = imageUrls.map((url) => fetch(url));
        const responses = await Promise.all(accessibilityPromises);

        for (const response of responses) {
          expect(response.status).toBe(200);
          expect(response.headers.get("content-type")).toMatch(/^image\//);
        }
      },
      { timeout: 10000 }
    );
  });
});
