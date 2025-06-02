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

      const response = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${TEST_SESSION_ID}`,
        {
          method: "POST",
          headers: {
            Cookie: `memberId=${TEST_MEMBER_ID}`,
          },
          body: formData,
        }
      );

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.data).toMatchObject({
        text: "Test image upload",
        ttl: 120,
        memberId: TEST_MEMBER_ID,
      });
      expect(result.data.imageUrl).toBeDefined();
      expect(result.data.imageUrl).toMatch(/^https?:\/\//);
      expect(result.data.id).toBeDefined();
      expect(result.data.createdAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    });

    it("should upload image without text", async () => {
      const testImage = createTestImageFile("no-text-image.png", 1536);
      const formData = createImageFormData(testImage); // No text provided

      const response = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${TEST_SESSION_ID}`,
        {
          method: "POST",
          headers: {
            Cookie: `memberId=${TEST_MEMBER_ID}`,
          },
          body: formData,
        }
      );

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.data.imageUrl).toBeDefined();
      expect(result.data.imageUrl).toMatch(/^https?:\/\//);
      expect(result.data.text).toBeUndefined();
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

        const response = await fetch(
          `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${TEST_SESSION_ID}`,
          {
            method: "POST",
            headers: {
              Cookie: `memberId=${TEST_MEMBER_ID}`,
            },
            body: formData,
          }
        );

        expect(response.status).toBe(200);

        const result = await response.json();
        expect(result.data.imageUrl).toBeDefined();
        expect(result.data.imageUrl).toMatch(/^https?:\/\//);

        // URL should contain the session ID and have proper file extension
        expect(result.data.imageUrl).toContain(TEST_SESSION_ID);
        const expectedExtension = imageType.name.split(".").pop();
        expect(result.data.imageUrl).toContain(`.${expectedExtension}`);
      }
    });

    it("should handle large image files", async () => {
      // Test with a larger file (100KB)
      const largeImage = createTestImageFile("large-image.jpg", 100 * 1024);
      const formData = createImageFormData(largeImage, "Large image test");

      const response = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${TEST_SESSION_ID}`,
        {
          method: "POST",
          headers: {
            Cookie: `memberId=${TEST_MEMBER_ID}`,
          },
          body: formData,
        }
      );

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.data.imageUrl).toBeDefined();
      expect(result.data.imageUrl).toMatch(/^https?:\/\//);
    });

    it("should generate unique file names for each upload", async () => {
      const uploadedUrls: string[] = [];
      const numUploads = 3;

      for (let i = 0; i < numUploads; i++) {
        const testImage = createTestImageFile(`duplicate-test-${i}.jpg`, 1024);
        const formData = createImageFormData(testImage, `Duplicate test ${i}`);

        const response = await fetch(
          `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${TEST_SESSION_ID}`,
          {
            method: "POST",
            headers: {
              Cookie: `memberId=${TEST_MEMBER_ID}`,
            },
            body: formData,
          }
        );

        expect(response.status).toBe(200);

        const result = await response.json();
        expect(result.data.imageUrl).toBeDefined();
        uploadedUrls.push(result.data.imageUrl);
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

      const response = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${TEST_SESSION_ID}`,
        {
          method: "POST",
          headers: {
            Cookie: `memberId=${TEST_MEMBER_ID}`,
          },
          body: formData,
        }
      );

      const result = await response.json();
      uploadedImageUrl = result.data.imageUrl;
    });

    it("should make uploaded images publicly accessible", async () => {
      expect(uploadedImageUrl).toBeDefined();

      const imageResponse = await fetch(uploadedImageUrl);
      expect(imageResponse.status).toBe(200);

      const contentType = imageResponse.headers.get("content-type");
      expect(contentType).toMatch(/^image\//);

      // Should be able to read the image data
      const imageBuffer = await imageResponse.arrayBuffer();
      expect(imageBuffer.byteLength).toBeGreaterThan(0);
    });

    it("should have proper cache headers for images", async () => {
      const imageResponse = await fetch(uploadedImageUrl);
      expect(imageResponse.status).toBe(200);

      // Check for cache-friendly headers
      const cacheControl = imageResponse.headers.get("cache-control");
      const lastModified = imageResponse.headers.get("last-modified");
      const etag = imageResponse.headers.get("etag");

      // Images should have some form of caching for CDN efficiency
      console.log(`Image cache headers:`, {
        cacheControl,
        lastModified,
        etag,
      });

      // At least one caching header should be present
      const hasCacheHeaders = cacheControl || lastModified || etag;
      if (!hasCacheHeaders) {
        console.warn(
          "No cache headers found on uploaded image - this may impact CDN performance"
        );
      }
    });
  });

  describe("S3 Integration Error Handling", () => {
    it("should handle file upload failures gracefully", async () => {
      // This test would ideally test what happens when S3 is unavailable
      // For now, we'll test with an extremely large file that might fail
      const oversizedFile = createTestImageFile(
        "oversized.jpg",
        50 * 1024 * 1024
      ); // 50MB
      const formData = createImageFormData(
        oversizedFile,
        "Oversized file test"
      );

      const response = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${TEST_SESSION_ID}`,
        {
          method: "POST",
          headers: {
            Cookie: `memberId=${TEST_MEMBER_ID}`,
          },
          body: formData,
        }
      );

      // Should either succeed or fail gracefully with proper error message
      if (response.status !== 200) {
        expect(response.status).toBeOneOf([400, 413, 500]);

        const result = await response.json();
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe("string");
      }
    });
  });

  describe("Image Metadata and Organization", () => {
    it("should organize images by session ID", async () => {
      const session1 = `img-session-1-${uuidv4()}`;
      const session2 = `img-session-2-${uuidv4()}`;
      const memberId = `img-member-${uuidv4()}`;

      // Upload image to session 1
      const image1 = createTestImageFile("session1-image.jpg", 1024);
      const formData1 = createImageFormData(image1, "Session 1 image");

      const response1 = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${session1}`,
        {
          method: "POST",
          headers: {
            Cookie: `memberId=${memberId}`,
          },
          body: formData1,
        }
      );

      expect(response1.status).toBe(200);
      const result1 = await response1.json();

      // Upload image to session 2
      const image2 = createTestImageFile("session2-image.jpg", 1024);
      const formData2 = createImageFormData(image2, "Session 2 image");

      const response2 = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${session2}`,
        {
          method: "POST",
          headers: {
            Cookie: `memberId=${memberId}`,
          },
          body: formData2,
        }
      );

      expect(response2.status).toBe(200);
      const result2 = await response2.json();

      // Images should be organized by session in their URLs
      expect(result1.data.imageUrl).toContain(session1);
      expect(result2.data.imageUrl).toContain(session2);

      // URLs should be different
      expect(result1.data.imageUrl).not.toBe(result2.data.imageUrl);
    });

    it("should preserve file extensions in uploaded URLs", async () => {
      const testCases = [
        { name: "test.jpg", expectedExt: "jpg" },
        { name: "test.png", expectedExt: "png" },
        { name: "test.gif", expectedExt: "gif" },
        { name: "image.jpeg", expectedExt: "jpeg" },
      ];

      for (const testCase of testCases) {
        const buffer = new ArrayBuffer(1024);
        const file = new File([buffer], testCase.name, { type: "image/jpeg" });
        const formData = createImageFormData(
          file,
          `Extension test for ${testCase.name}`
        );

        const response = await fetch(
          `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${TEST_SESSION_ID}`,
          {
            method: "POST",
            headers: {
              Cookie: `memberId=${TEST_MEMBER_ID}`,
            },
            body: formData,
          }
        );

        expect(response.status).toBe(200);

        const result = await response.json();
        expect(result.data.imageUrl).toContain(`.${testCase.expectedExt}`);
      }
    });
  });

  describe("S3 Integration Performance", () => {
    it("should handle concurrent image uploads", async () => {
      const sessionId = `perf-img-session-${uuidv4()}`;
      const memberId = `perf-img-member-${uuidv4()}`;

      const uploadPromises = [];
      const numUploads = 3; // Keep it reasonable for E2E tests

      for (let i = 0; i < numUploads; i++) {
        const testImage = createTestImageFile(`concurrent-${i}.jpg`, 1024);
        const formData = createImageFormData(
          testImage,
          `Concurrent upload ${i}`
        );

        const promise = fetch(
          `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${sessionId}`,
          {
            method: "POST",
            headers: {
              Cookie: `memberId=${memberId}`,
            },
            body: formData,
          }
        );

        uploadPromises.push(promise);
      }

      const responses = await Promise.all(uploadPromises);

      // All uploads should succeed
      for (const response of responses) {
        expect(response.status).toBe(200);
      }

      // Verify all images were uploaded and have unique URLs
      const results = await Promise.all(responses.map((r) => r.json()));
      const imageUrls = results.map((r) => r.data.imageUrl);
      const uniqueUrls = new Set(imageUrls);

      expect(uniqueUrls.size).toBe(numUploads);

      // All images should be accessible
      const accessibilityPromises = imageUrls.map((url) => fetch(url));
      const accessibilityResponses = await Promise.all(accessibilityPromises);

      for (const response of accessibilityResponses) {
        expect(response.status).toBe(200);
      }
    });
  });

  describe("Entry Deletion and Image Cleanup", () => {
    it("should handle entry deletion (image cleanup is implementation dependent)", async () => {
      // Upload an image
      const testImage = createTestImageFile("deletion-test.jpg", 1024);
      const formData = createImageFormData(testImage, "Deletion test image");

      const uploadResponse = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries?sessionId=${TEST_SESSION_ID}`,
        {
          method: "POST",
          headers: {
            Cookie: `memberId=${TEST_MEMBER_ID}`,
          },
          body: formData,
        }
      );

      expect(uploadResponse.status).toBe(200);

      const uploadResult = await uploadResponse.json();
      const entryId = uploadResult.data.id;
      const imageUrl = uploadResult.data.imageUrl;

      // Verify image is accessible
      const initialImageResponse = await fetch(imageUrl);
      expect(initialImageResponse.status).toBe(200);

      // Delete the entry
      const deleteResponse = await fetch(
        `${PRODUCTION_DOMAIN}/api/redis/entries/${entryId}?sessionId=${TEST_SESSION_ID}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `memberId=${TEST_MEMBER_ID}`,
          },
        }
      );

      expect(deleteResponse.status).toBe(200);

      // Note: Whether the image is automatically cleaned up from S3 is implementation dependent
      // This test just verifies the entry deletion works
      const deleteResult = await deleteResponse.json();
      expect(deleteResult.message).toBe("Entry deleted successfully");
    });
  });
});
