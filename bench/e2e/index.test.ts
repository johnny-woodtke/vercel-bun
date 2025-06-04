import { describe, expect, it } from "bun:test";

import { getApiClient } from "./utils";

const client = getApiClient();

describe("E2E API Tests", () => {
  describe("/api/bun", () => {
    const endpoint = "/api/bun";

    it("should return 200", async () => {
      const res = await client(endpoint, {
        method: "POST",
      });

      expect(res.status).toBe(200);
    });
  });

  describe("/api/bun/workload", () => {
    const endpoint = "/api/bun/workload";

    it("should return 200", async () => {
      const res = await client(endpoint, {
        method: "POST",
      });

      expect(res.status).toBe(200);
    });
  });

  describe("/api/node", () => {
    const endpoint = "/api/node";

    it("should return 200", async () => {
      const res = await client(endpoint, {
        method: "POST",
      });

      expect(res.status).toBe(200);
    });
  });

  describe("/api/node/workload", () => {
    const endpoint = "/api/node/workload";

    it("should return 200", async () => {
      const res = await client(endpoint, {
        method: "POST",
      });

      expect(res.status).toBe(200);
    });
  });
});
