import { describe, expect, it } from "bun:test";

import { getApiClient } from "@/e2e/utils";

const api = getApiClient();

describe("E2E API Tests - Content Types", () => {
  describe("GET /api/content/json", () => {
    it("should return JSON content with correct headers", async () => {
      const { data, error, status, response } = await api.content.json.get();

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/json");
      expect(data).toMatchObject({
        message: "JSON response",
      });
      expect(data?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should return valid JSON that can be parsed", async () => {
      const { data, status, response } = await api.content.json.get();

      expect(status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/json");

      // Ensure it's valid JSON
      expect(data?.message).toBe("JSON response");
      expect(data?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe("GET /api/content/text", () => {
    it("should return plain text content with correct headers", async () => {
      const { data, error, status, response } = await api.content.text.get();

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/plain");
      expect(data).toBe("Plain text response");
    });

    it("should return actual plain text", async () => {
      const { data, status, response } = await api.content.text.get();

      expect(status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/plain");
      expect(data).toBe("Plain text response");
    });
  });

  describe("GET /api/content/html", () => {
    it("should return HTML content with correct headers", async () => {
      const { data, error, status, response } = await api.content.html.get();

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/html");
      expect(data).toBe("<html><body><h1>HTML Response</h1></body></html>");
    });

    it("should return valid HTML content", async () => {
      const { data, status, response } = await api.content.html.get();

      expect(status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/html");
      expect(data).toBe("<html><body><h1>HTML Response</h1></body></html>");

      // Ensure it contains valid HTML structure
      expect(data).toContain("<html>");
      expect(data).toContain("<body>");
      expect(data).toContain("<h1>HTML Response</h1>");
      expect(data).toContain("</body>");
      expect(data).toContain("</html>");
    });
  });

  describe("GET /api/content/xml", () => {
    it("should return XML content with correct headers", async () => {
      const { data, error, status, response } = await api.content.xml.get();

      expect(error).toBeNull();
      expect(status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/xml");
      expect(data).toBe(
        '<?xml version="1.0"?><root><message>XML response</message></root>'
      );
    });

    it("should return valid XML content", async () => {
      const { data, status, response } = await api.content.xml.get();

      expect(status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/xml");
      expect(data).toBe(
        '<?xml version="1.0"?><root><message>XML response</message></root>'
      );

      // Ensure it contains valid XML structure
      expect(data).toContain('<?xml version="1.0"?>');
      expect(data).toContain("<root>");
      expect(data).toContain("<message>XML response</message>");
      expect(data).toContain("</root>");
    });
  });
});
