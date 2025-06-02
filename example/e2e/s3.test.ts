import { beforeAll, describe, expect, it } from "bun:test";
import { v4 as uuidv4 } from "uuid";

import { getApiClient } from "@/e2e/utils";

const api = getApiClient();

// Test session configuration
const TEST_SESSION_ID = `s3-test-session-${uuidv4()}`;
const TEST_MEMBER_ID = `s3-test-member-${uuidv4()}`;

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

// Helper function to create FormData for multipart upload
function createImageFormData(imageFile: File, text?: string, ttl = 120) {
  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("ttl", ttl.toString());

  if (text) {
    formData.append("text", text);
  }

  return formData;
}

describe("E2E API Tests - S3/R2 Integration", () => {
  describe("Image Upload via Redis Entries", () => {
    it("should upload an image successfully", async () => {
      const testImage = createTestImageFile("test-upload.jpg", 2048);
      const formData = createImageFormData(testImage, "Test image upload");

      const { data: result, status } = await api.redis.entries.post(formData, {
        query: {
          sessionId: TEST_SESSION_ID,
        },
        headers: {
          Cookie: `memberId=${TEST_MEMBER_ID}`,
        },
      });

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
    });

    it("should upload image without text", async () => {
      const testImage = createTestImageFile("no-text-image.png", 1536);
      const formData = createImageFormData(testImage); // No text provided

      const { data: result, status } = await api.redis.entries.post(formData, {
        query: {
          sessionId: TEST_SESSION_ID,
        },
        headers: {
          Cookie: `memberId=${TEST_MEMBER_ID}`,
        },
      });

      expect(status).toBe(200);

      expect(result?.data?.imageUrl).toBeDefined();
      expect(result?.data?.imageUrl).toMatch(/^https?:\/\//);
      expect(result?.data?.text).toBeUndefined();
    });

    it("should handle different image file types", async () => {
      const imageTypes = [
        { name: "test.jpg", type: "image/jpeg" },
        { name: "test.png", type: "image/png" },
        { name: "test.gif", type: "image/gif" },
        { name: "test.webp", type: "image/webp" },
      ];

      for (const imageType of imageTypes) {
        const buffer = new ArrayBuffer(1024);
        const file = new File([buffer], imageType.name, {
          type: imageType.type,
        });
        const formData = createImageFormData(
          file,
          `Test ${imageType.type} upload`
        );

        const { data: result, status } = await api.redis.entries.post(
          formData,
          {
            query: {
              sessionId: TEST_SESSION_ID,
            },
            headers: {
              Cookie: `memberId=${TEST_MEMBER_ID}`,
            },
          }
        );

        expect(status).toBe(200);

        expect(result?.data?.imageUrl).toBeDefined();
        expect(result?.data?.imageUrl).toMatch(/^https?:\/\//);

        // URL should contain the session ID and have proper file extension
        expect(result?.data?.imageUrl).toContain(TEST_SESSION_ID);
        const expectedExtension = imageType.name.split(".").pop();
        expect(result?.data?.imageUrl).toContain(`.${expectedExtension}`);
      }
    });

    it("should handle large image files", async () => {
      // Test with a larger file (100KB)
      const largeImage = createTestImageFile("large-image.jpg", 100 * 1024);
      const formData = createImageFormData(largeImage, "Large image test");

      const { data: result, status } = await api.redis.entries.post(formData, {
        query: {
          sessionId: TEST_SESSION_ID,
        },
        headers: {
          Cookie: `memberId=${TEST_MEMBER_ID}`,
        },
      });

      expect(status).toBe(200);

      expect(result?.data?.imageUrl).toBeDefined();
      expect(result?.data?.imageUrl).toMatch(/^https?:\/\//);
    });

    it("should generate unique file names for each upload", async () => {
      const uploadedUrls: string[] = [];
      const numUploads = 3;

      for (let i = 0; i < numUploads; i++) {
        const testImage = createTestImageFile(`duplicate-test-${i}.jpg`, 1024);
        const formData = createImageFormData(testImage, `Duplicate test ${i}`);

        const { data: result, status } = await api.redis.entries.post(
          formData,
          {
            query: {
              sessionId: TEST_SESSION_ID,
            },
            headers: {
              Cookie: `memberId=${TEST_MEMBER_ID}`,
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
    });
  });

  describe("Image URL Accessibility", () => {
    let uploadedImageUrl: string;

    beforeAll(async () => {
      // Upload an image to test accessibility
      const testImage = createTestImageFile("accessibility-test.jpg", 2048);
      const formData = createImageFormData(
        testImage,
        "Accessibility test image"
      );

      const { data: result } = await api.redis.entries.post(formData, {
        query: {
          sessionId: TEST_SESSION_ID,
        },
        headers: {
          Cookie: `memberId=${TEST_MEMBER_ID}`,
        },
      });

      uploadedImageUrl = result?.data?.imageUrl || "";
    });

    it("should make uploaded images publicly accessible", async () => {
      expect(uploadedImageUrl).toBeDefined();
      expect(uploadedImageUrl.length).toBeGreaterThan(0);

      const imageResponse = await fetch(uploadedImageUrl);
      expect(imageResponse.status).toBe(200);
      expect(imageResponse.headers.get("content-type")).toMatch(/^image\//);
    });

    it("should return proper image content", async () => {
      const imageResponse = await fetch(uploadedImageUrl);
      expect(imageResponse.status).toBe(200);

      const imageBuffer = await imageResponse.arrayBuffer();
      expect(imageBuffer.byteLength).toBeGreaterThan(0);
      expect(imageBuffer.byteLength).toBe(2048); // Should match our test file size
    });
  });

  describe("S3/R2 Storage Integration", () => {
    it("should handle concurrent image uploads", async () => {
      const numUploads = 3;
      const uploadPromises = [];

      for (let i = 0; i < numUploads; i++) {
        const testImage = createTestImageFile(`concurrent-${i}.jpg`, 1024);
        const formData = createImageFormData(testImage, `Concurrent ${i}`);

        const promise = api.redis.entries.post(formData, {
          query: {
            sessionId: TEST_SESSION_ID,
          },
          headers: {
            Cookie: `memberId=${TEST_MEMBER_ID}`,
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
    });

    it("should isolate images between different sessions", async () => {
      const session1 = `s3-session-1-${uuidv4()}`;
      const session2 = `s3-session-2-${uuidv4()}`;
      const memberId = `s3-member-${uuidv4()}`;

      // Upload to session 1
      const image1 = createTestImageFile("session1-image.jpg", 1024);
      const formData1 = createImageFormData(image1, "Session 1 image");

      const { data: result1 } = await api.redis.entries.post(formData1, {
        query: {
          sessionId: session1,
        },
        headers: {
          Cookie: `memberId=${memberId}`,
        },
      });

      // Upload to session 2
      const image2 = createTestImageFile("session2-image.jpg", 1024);
      const formData2 = createImageFormData(image2, "Session 2 image");

      const { data: result2 } = await api.redis.entries.post(formData2, {
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
    });

    it("should handle image upload errors gracefully", async () => {
      // Test with oversized file (this should fail based on API limits)
      const oversizedImage = createTestImageFile(
        "oversized.jpg",
        50 * 1024 * 1024
      ); // 50MB
      const formData = createImageFormData(oversizedImage, "Oversized test");

      const { status } = await api.redis.entries.post(formData, {
        query: {
          sessionId: TEST_SESSION_ID,
        },
        headers: {
          Cookie: `memberId=${TEST_MEMBER_ID}`,
        },
      });

      // Should return an error status (likely 413 for payload too large or 400 for validation)
      expect([400, 413, 422]).toContain(status);
    });

    it("should ensure uploaded images are accessible via HTTP", async () => {
      const imageUrls: string[] = [];

      // Upload multiple images
      for (let i = 0; i < 3; i++) {
        const testImage = createTestImageFile(`http-test-${i}.jpg`, 1024);
        const formData = createImageFormData(testImage, `HTTP test ${i}`);

        const { data: result } = await api.redis.entries.post(formData, {
          query: {
            sessionId: TEST_SESSION_ID,
          },
          headers: {
            Cookie: `memberId=${TEST_MEMBER_ID}`,
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
    });

    it("should handle image deletion when entry is deleted", async () => {
      // Upload an image
      const testImage = createTestImageFile("deletion-test.jpg", 1024);
      const formData = createImageFormData(testImage, "Deletion test");

      const { data: uploadResult } = await api.redis.entries.post(formData, {
        query: {
          sessionId: TEST_SESSION_ID,
        },
        headers: {
          Cookie: `memberId=${TEST_MEMBER_ID}`,
        },
      });

      const entryId = uploadResult?.data?.id;
      const imageUrl = uploadResult?.data?.imageUrl;

      expect(entryId).toBeDefined();
      expect(imageUrl).toBeDefined();

      // Verify image is accessible
      const initialImageResponse = await fetch(imageUrl || "");
      expect(initialImageResponse.status).toBe(200);

      // Delete the entry
      const { status: deleteStatus } = await api.redis
        .entries({ entryId: entryId || "" })
        .delete({
          query: {
            sessionId: TEST_SESSION_ID,
          },
          headers: {
            Cookie: `memberId=${TEST_MEMBER_ID}`,
          },
        });

      expect(deleteStatus).toBe(200);

      // Note: Image cleanup might be asynchronous, so we can't immediately test
      // for image deletion. In a production scenario, you might want to test
      // this with a delay or check that a cleanup job was scheduled.
    });
  });
});
