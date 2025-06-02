import { describe, expect, it } from "bun:test";

import { getApiClient } from "@/e2e/utils";

const api = getApiClient();

describe("E2E API Tests - Core Endpoints", () => {
  describe("GET /api", () => {
    it("should return hello message with Bun version", async () => {
      const { data, error, status } = await api.get();

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(data).toContain("Hello from bun@");
    });
  });

  describe("GET /api/hello", () => {
    it("should handle query parameters correctly", async () => {
      const { data, error, status } = await api.hello.get({
        query: {
          firstName: "John",
          lastName: "Doe",
        },
      });

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(data).toBe("Hello John Doe");
    });

    it("should validate required query parameters", async () => {
      const { data, error, status } = await api.hello.get({
        query: {} as any,
      });

      expect(error).toBeDefined();
      expect(data).toBeNull();
      expect(status).toBe(422);
    });
  });

  describe("GET /api/status/:code", () => {
    it("should return correct status code and headers for 200", async () => {
      const { data, error, status, response } = await api
        .status({ code: "200" })
        .get();

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(data).toEqual({ message: "OK" });
      expect(response.headers.get("x-custom-header")).toBe("test-value");
    });

    it("should return correct status code for 201", async () => {
      const { data, status } = await api.status({ code: "201" }).get();

      expect(status).toBe(201);
      expect(data).toEqual({ message: "Created" } as any);
    });

    it("should return correct error for 400", async () => {
      const { data, error, status } = await api.status({ code: "400" }).get();

      expect(status).toBe(400);
      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.value).toEqual({ error: "Bad Request" });
    });

    it("should return correct error for 404", async () => {
      const { data, error, status } = await api.status({ code: "404" }).get();

      expect(status).toBe(404);
      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.value).toEqual({ error: "Not Found" });
    });

    it("should return correct error for 500", async () => {
      const { data, error, status } = await api.status({ code: "500" }).get();

      expect(status).toBe(500);
      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.value).toEqual({ error: "Internal Server Error" });
    });

    it("should handle invalid status codes", async () => {
      const { data, error, status } = await api.status({ code: "999" }).get();

      expect(status).toBe(400);
      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.value).toEqual({
        error: "Invalid status code. Must be between 100-599",
      });
    });
  });

  describe("POST /api/files", () => {
    it("should handle file upload with correct response format", async () => {
      const { data, error, status, response } = await api.files.post({
        filename: "test.txt",
        content: "Hello World Test Content",
      });

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(response.headers.get("location")).toBe("/api/files/123");
      expect(data).toMatchObject({
        id: 123,
        filename: "test.txt",
        size: 24,
      });
      expect(data?.uploadedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe("GET /api/headers", () => {
    it("should return request headers and set custom response headers", async () => {
      const { data, status, response } = await api.headers.get({
        headers: {
          "x-test-header": "test-value",
          "user-agent": "bun-e2e-test",
        },
      });

      expect(status).toBe(200);
      expect(data?.message).toBe("Headers endpoint");
      expect(data?.receivedHeaders["x-test-header"]).toBe("test-value");
      expect(data?.receivedHeaders["user-agent"]).toBe("bun-e2e-test");
      expect(response.headers.get("x-custom-response")).toBe("custom-value");
      expect(response.headers.get("x-timestamp")).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    });
  });

  describe("POST /api/cookies", () => {
    it("should set cookies correctly", async () => {
      const { data, error, status, response } = await api.cookies.post();

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(data).toEqual({ message: "Cookies set successfully" });

      const cookies = response.headers.get("set-cookie");
      expect(cookies).toContain("sessionId=abc123");
      expect(cookies).toContain("HttpOnly");
      expect(cookies).toContain("Secure");
      expect(cookies).toContain("SameSite=Strict");
      expect(cookies).toContain("preferences=theme-dark");
    });
  });

  describe("GET /api/cache", () => {
    it("should set cache control headers", async () => {
      const { data, error, status, response } = await api.cache.get();

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(data?.message).toBe("Cache control header set");
      expect(data?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(response.headers.get("cache-control")).toContain("public");
      expect(response.headers.get("cache-control")).toContain("max-age=60");
    });
  });
});
