import { describe, expect, it } from "bun:test";

import { getApiClient } from "@/e2e/utils";

const api = getApiClient();

describe("E2E API Tests - Users Endpoints", () => {
  describe("OPTIONS /api/users", () => {
    it("should return correct CORS headers", async () => {
      const { response } = await api.users.options();

      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBe("*");
      expect(response.headers.get("access-control-allow-methods")).toBe(
        "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS"
      );
      expect(response.headers.get("access-control-allow-headers")).toBe(
        "Content-Type, Authorization"
      );
      expect(response.headers.get("access-control-max-age")).toBe("86400");
    });
  });

  describe("POST /api/users", () => {
    it("should create a user with valid data", async () => {
      const userData = {
        name: "John Doe",
        email: "john.doe@example.com",
      };

      const { data, error, status } = await api.users.post(userData);

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: userData,
      });
    });

    it("should validate required fields", async () => {
      const { data, error, status } = await api.users.post({
        name: "John Doe",
      } as any); // Missing email

      expect(status).toBe(422);
      expect(error).toBeDefined();
    });
  });

  describe("OPTIONS /api/users/:id", () => {
    it("should return correct CORS headers for valid user ID", async () => {
      const { response } = await api.users({ id: "123" }).options();

      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBe("*");
      expect(response.headers.get("access-control-allow-methods")).toBe(
        "GET, PUT, PATCH, DELETE, HEAD, OPTIONS"
      );
      expect(response.headers.get("access-control-allow-headers")).toBe(
        "Content-Type, Authorization"
      );
      expect(response.headers.get("access-control-max-age")).toBe("86400");
    });

    it("should return 400 for invalid user ID", async () => {
      const { error, status } = await api.users({ id: "invalid" }).options();

      expect(status).toBe(400);
      expect(error?.value).toMatchObject({ error: "Invalid user ID" });
    });
  });

  describe("GET /api/users/:id", () => {
    it("should return user data for valid ID", async () => {
      const userId = 123;
      const { data, error, status } = await api
        .users({ id: userId.toString() })
        .get();

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(data).toMatchObject({
        id: userId,
        name: "John Doe",
        email: "john@example.com",
      });
      expect((data as any).createdAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    });

    it("should return 400 for invalid user ID", async () => {
      const { error, status } = await api.users({ id: "invalid" }).get();

      expect(status).toBe(400);
      expect(error?.value).toMatchObject({ error: "Invalid user ID" });
    });
  });

  describe("PUT /api/users/:id", () => {
    it("should update user with valid data", async () => {
      const userId = 123;
      const updateData = {
        name: "Jane Smith",
        email: "jane.smith@example.com",
      };

      const { data, error, status } = await api
        .users({ id: userId.toString() })
        .put(updateData);

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(data).toMatchObject({
        id: userId,
        name: updateData.name,
        email: updateData.email,
      });
      expect((data as any).updatedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    });

    it("should return 400 for invalid user ID", async () => {
      const updateData = {
        name: "Jane Smith",
        email: "jane.smith@example.com",
      };

      const { error, status } = await api
        .users({ id: "invalid" })
        .put(updateData);

      expect(status).toBe(400);
      expect(error?.value).toMatchObject({ error: "Invalid user ID" });
    });

    it("should validate required fields", async () => {
      const { data, error, status } = await api.users({ id: "123" }).put({
        name: "Jane Smith",
      } as any); // Missing email

      expect(status).toBe(422);
      expect(error).toBeDefined();
    });
  });

  describe("PATCH /api/users/:id", () => {
    it("should partially update user with valid data", async () => {
      const userId = 123;
      const patchData = {
        name: "Updated Name",
      };

      const { data, error, status } = await api
        .users({ id: userId.toString() })
        .patch(patchData);

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(data).toMatchObject({
        id: userId,
        name: patchData.name,
        email: "john@example.com", // Should keep existing email
      });
      expect((data as any).updatedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    });

    it("should update only email", async () => {
      const userId = 456;
      const patchData = {
        email: "newemail@example.com",
      };

      const { data, error, status } = await api
        .users({ id: userId.toString() })
        .patch(patchData);

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(data).toMatchObject({
        id: userId,
        name: "John Doe", // Should keep existing name
        email: patchData.email,
      });
      expect((data as any).updatedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    });

    it("should update both name and email", async () => {
      const userId = 789;
      const patchData = {
        name: "Full Update",
        email: "fullupdate@example.com",
      };

      const { data, error, status } = await api
        .users({ id: userId.toString() })
        .patch(patchData);

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(data).toMatchObject({
        id: userId,
        name: patchData.name,
        email: patchData.email,
      });
      expect((data as any).updatedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    });

    it("should return 400 for invalid user ID", async () => {
      const patchData = {
        name: "Test Name",
      };

      const { error, status } = await api
        .users({ id: "invalid" })
        .patch(patchData);

      expect(status).toBe(400);
      expect(error?.value).toMatchObject({ error: "Invalid user ID" });
    });
  });

  describe("DELETE /api/users/:id", () => {
    it("should delete user successfully", async () => {
      const userId = 123;
      const { data, error, status } = await api
        .users({ id: userId.toString() })
        .delete();

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(data).toBeFalsy();
    });

    it("should return 400 for invalid user ID", async () => {
      const { error, status } = await api.users({ id: "invalid" }).delete();

      expect(status).toBe(400);
      expect(error?.value).toMatchObject({ error: "Invalid user ID" });
    });
  });

  describe("HEAD /api/users/:id", () => {
    it("should return correct headers for existing user", async () => {
      const { response } = await api.users({ id: "123" }).head();

      expect(response.status).toBe(200);
      expect(response.headers.get("x-user-exists")).toBe("true");
      expect(response.headers.get("content-type")).toBe("application/json");
      expect(response.headers.get("content-length")).toBe("100");
    });

    it("should return 404 for invalid user ID", async () => {
      const { response } = await api.users({ id: "invalid" }).head();

      expect(response.status).toBe(404);
    });
  });

  describe("HTTP Method Validation Tests", () => {
    it("should handle all supported methods correctly", async () => {
      const userId = "123";
      const testData = {
        name: "Test User",
        email: "test@example.com",
      };

      // Test POST
      const postResponse = await api.users.post(testData);
      expect(postResponse.status).toBe(200);

      // Test GET
      const getResponse = await api.users({ id: userId }).get();
      expect(getResponse.status).toBe(200);

      // Test PUT
      const putResponse = await api.users({ id: userId }).put(testData);
      expect(putResponse.status).toBe(200);

      // Test PATCH
      const patchResponse = await api
        .users({ id: userId })
        .patch({ name: "Updated" });
      expect(patchResponse.status).toBe(200);

      // Test DELETE
      const deleteResponse = await api.users({ id: userId }).delete();
      expect(deleteResponse.status).toBe(200);

      // Test HEAD
      const headResponse = await api.users({ id: userId }).head();
      expect(headResponse.response.status).toBe(200);

      // Test OPTIONS
      const optionsResponse = await api.users({ id: userId }).options();
      expect(optionsResponse.response.status).toBe(200);
    });
  });
});
