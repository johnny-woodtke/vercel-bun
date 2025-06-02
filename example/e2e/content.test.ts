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
      const { response } = await api.content.json.get();
      const contentType = response.headers.get("content-type");
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(contentType).toBe("application/json");

      // Ensure it's valid JSON
      const parsed = JSON.parse(text);
      expect(parsed.message).toBe("JSON response");
      expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
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
      const { response } = await api.content.text.get();
      const contentType = response.headers.get("content-type");
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(contentType).toBe("text/plain");
      expect(text).toBe("Plain text response");
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
      const { response } = await api.content.html.get();
      const contentType = response.headers.get("content-type");
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(contentType).toBe("text/html");
      expect(text).toBe("<html><body><h1>HTML Response</h1></body></html>");

      // Ensure it contains valid HTML structure
      expect(text).toContain("<html>");
      expect(text).toContain("<body>");
      expect(text).toContain("<h1>HTML Response</h1>");
      expect(text).toContain("</body>");
      expect(text).toContain("</html>");
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
      const { response } = await api.content.xml.get();
      const contentType = response.headers.get("content-type");
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(contentType).toBe("application/xml");
      expect(text).toBe(
        '<?xml version="1.0"?><root><message>XML response</message></root>'
      );

      // Ensure it contains valid XML structure
      expect(text).toContain('<?xml version="1.0"?>');
      expect(text).toContain("<root>");
      expect(text).toContain("<message>XML response</message>");
      expect(text).toContain("</root>");
    });
  });

  describe("Content Parsing and Validation", () => {
    it("should handle different content types correctly when using Eden", async () => {
      // Test JSON through Eden
      const jsonResult = await api.content.json.get();
      expect(jsonResult.status).toBe(200);
      expect(typeof jsonResult.data).toBe("object");
      expect(jsonResult.data?.message).toBe("JSON response");

      // Test text through Eden
      const textResult = await api.content.text.get();
      expect(textResult.status).toBe(200);
      expect(typeof textResult.data).toBe("string");
      expect(textResult.data).toBe("Plain text response");

      // Test HTML through Eden
      const htmlResult = await api.content.html.get();
      expect(htmlResult.status).toBe(200);
      expect(typeof htmlResult.data).toBe("string");
      expect(htmlResult.data).toContain("<html>");

      // Test XML through Eden
      const xmlResult = await api.content.xml.get();
      expect(xmlResult.status).toBe(200);
      expect(typeof xmlResult.data).toBe("string");
      expect(xmlResult.data).toContain("<?xml");
    });
  });
});
