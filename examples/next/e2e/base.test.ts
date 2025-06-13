import { describe, expect, it } from "bun:test";

import { getApiClient } from "@/e2e/utils";

const api = getApiClient(false);

describe("E2E API Tests - Base Routes", () => {
  describe("/base/content", () => {
    it("should return a JSON response", async () => {
      const { data, status, response } = await api.base.content.json.get();

      expect(status).toBe(200);
      expect(data).toMatchObject({ message: "JSON response" });
      expect(response.headers.get("content-type")).toBe("application/json");
    });

    it("should return a text response", async () => {
      const { data, status, response } = await api.base.content.text.get();

      expect(status).toBe(200);
      expect(data).toEqual("Plain text response");
      expect(response.headers.get("content-type")).toContain("text/plain");
    });

    it("should return an HTML response", async () => {
      const { data, status, response } = await api.base.content.html.get();

      expect(status).toBe(200);
      expect(data).toEqual("<html><body><h1>HTML Response</h1></body></html>");
      expect(response.headers.get("content-type")).toContain("text/html");
    });

    it("should return an XML response", async () => {
      const { data, status, response } = await api.base.content.xml.get();

      expect(status).toBe(200);
      expect(data).toEqual(
        '<?xml version="1.0"?><root><message>XML response</message></root>'
      );
      expect(response.headers.get("content-type")).toContain("application/xml");
    });

    it("should return a void response", async () => {
      const { data, status, response } = await api.base.content.void.get();

      expect(status).toBe(200);
      expect(data).toEqual("" as unknown as void);
      expect(response.headers.get("content-type")).toBeNull();
    });
  });

  describe("/base/headers", () => {
    it("should set a cache-control header", async () => {
      const { data, status, response } = await api.base.headers[
        "cache-control"
      ].get();

      expect(status).toBe(200);
      expect(data).toMatchObject({
        message: "Cache control header set",
        timestamp: expect.any(Number),
      });
      expect(response.headers.get("cache-control")).toBe("public, max-age=60");
    });

    it("should set a custom header", async () => {
      const { data, status, response } = await api.base.headers.custom.get();

      expect(status).toBe(200);
      expect(data).toMatchObject({
        headerName: "x-custom-header",
        message: "Custom header set",
      });
      expect(response.headers.get("x-custom-header")).toBe("test");
    });

    it("should set a cookie", async () => {
      const { data, status, response } = await api.base.headers.cookie.get();

      expect(status).toBe(200);
      expect(data).toMatchObject({
        cookieName: "x-elysia-cookie",
        message: "Cookie set",
      });
      expect(response.headers.get("set-cookie")).toContain(
        "x-elysia-cookie=test"
      );
    });

    it("should receive a cookie", async () => {
      const { data, status, error } = await api.base.headers.cookie.post(
        {},
        {
          headers: {
            cookie: "x-test-cookie=test",
          },
        }
      );

      expect(status).toBe(200);
      expect(data).toMatchObject({ receivedCookie: "test" });
      expect(error?.value).toBeUndefined();
    });

    it("should validate the received cookie", async () => {
      const { data, status, error } = await api.base.headers.cookie.post({});

      expect(status).toBe(422);
      expect(data).toBeNull();
      expect(error?.value).toBeDefined();
    });
  });

  describe("/base/methods", () => {
    it("should GET", async () => {
      const { data, status } = await api.base.methods.get.get();

      expect(status).toBe(200);
      expect(data).toBe("GET request");
    });

    it("should POST", async () => {
      const { data, status } = await api.base.methods.post.post();

      expect(status).toBe(200);
      expect(data).toBe("POST request");
    });

    it("should PATCH", async () => {
      const { data, status } = await api.base.methods.patch.patch();

      expect(status).toBe(200);
      expect(data).toBe("PATCH request");
    });

    it("should PUT", async () => {
      const { data, status } = await api.base.methods.put.put();

      expect(status).toBe(200);
      expect(data).toBe("PUT request");
    });

    it("should DELETE", async () => {
      const { data, status } = await api.base.methods.delete.delete();

      expect(status).toBe(200);
      expect(data).toBe("DELETE request");
    });

    it("should OPTIONS", async () => {
      const { data, status } = await api.base.methods.options.options();

      expect(status).toBe(200);
      expect(data).toBe("OPTIONS request");
    });

    it("should HEAD", async () => {
      const { data, status } = await api.base.methods.head.head();

      expect(status).toBe(200);
      expect(data).toEqual("");
    });
  });

  describe("/base/params", () => {
    it("should receive a body", async () => {
      const { data, status } = await api.base.params.body.post({
        name: "John Doe",
      });

      expect(status).toBe(200);
      expect(data).toMatchObject({ receivedBody: { name: "John Doe" } });
    });

    it("should validate the received body", async () => {
      const { data, status, error } = await api.base.params.body.post({
        name: 123 as unknown as string,
      });

      expect(status).toBe(422);
      expect(data).toBeNull();
      expect(error?.value).toBeDefined();
    });

    it("should receive a query", async () => {
      const { data, status } = await api.base.params.query.post(
        {},
        {
          query: {
            name: "John Doe",
          },
        }
      );

      expect(status).toBe(200);
      expect(data).toMatchObject({ receivedQuery: { name: "John Doe" } });
    });

    it("should validate the received query", async () => {
      const { data, status, error } = await api.base.params.query.post(
        {},
        {
          query: {} as { name: string },
        }
      );

      expect(status).toBe(422);
      expect(data).toBeNull();
      expect(error?.value).toBeDefined();
    });

    it("should receive a dynamic path", async () => {
      const { data, status } = await api.base.params.path({ id: "123" }).post();

      expect(status).toBe(200);
      expect(data).toMatchObject({ receivedPath: { id: "123" } });
    });
  });

  describe("/base/status", () => {
    it("should return 200", async () => {
      const { data, status } = await api.base.status["200"].post();

      expect(status).toBe(200);
      expect(data).toBe("OK");
    });

    it("should return 400", async () => {
      const { data, status, error } = await api.base.status["400"].post();

      expect(status).toBe(400);
      expect(data).toBeNull();
      expect(error?.value).toBe("Bad Request");
    });

    it("should return 404", async () => {
      const { data, status, error } = await api.base.status["404"].post();

      expect(status).toBe(404);
      expect(data).toBeNull();
      expect(error?.value).toBe("Not Found");
    });

    it("should return 405", async () => {
      const { data, status, error } = await api.base.status["405"].post();

      expect(status).toBe(405);
      expect(data).toBeNull();
      expect(error?.value).toBe("Method Not Allowed");
    });

    it("should return 429", async () => {
      const { data, status, error } = await api.base.status["429"].post();

      expect(status).toBe(429);
      expect(data).toBeNull();
      expect(error?.value).toBe("Too Many Requests");
    });

    it("should return 500", async () => {
      const { data, status, error } = await api.base.status["500"].post();

      expect(status).toBe(500);
      expect(data).toBeNull();
      expect(error?.value).toBe("Internal Server Error");
    });
  });
});
