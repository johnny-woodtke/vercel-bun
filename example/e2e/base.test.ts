import { describe, expect, it } from "bun:test";

import { getApiClient } from "@/e2e/utils";

const api = getApiClient(false);

describe("E2E API Tests - Base Routes", () => {
  describe("/base/content", () => {
    it("should return a JSON response", async () => {
      const { data, response } = await api.base.content.json.get();

      expect(response.headers.get("content-type")).toBe("application/json");
      expect(data).toMatchObject({ message: "JSON response" });
    });

    it("should return a text response", async () => {
      const { data, response } = await api.base.content.text.get();

      expect(response.headers.get("content-type")).toContain("text/plain");
      expect(data).toEqual("Plain text response");
    });

    it("should return an HTML response", async () => {
      const { data, response } = await api.base.content.html.get();

      expect(response.headers.get("content-type")).toContain("text/html");
      expect(data).toEqual("<html><body><h1>HTML Response</h1></body></html>");
    });

    it("should return an XML response", async () => {
      const { data, response } = await api.base.content.xml.get();

      expect(response.headers.get("content-type")).toContain("application/xml");
      expect(data).toEqual(
        '<?xml version="1.0"?><root><message>XML response</message></root>'
      );
    });
  });

  describe("/base/headers", () => {});

  describe("/base/methods", () => {});

  describe("/base/params", () => {});

  describe("/base/status", () => {});
});
