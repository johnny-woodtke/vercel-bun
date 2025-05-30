import { Elysia, t } from "elysia";

import { SessionRedisService } from "@/lib/redis";
import { COOKIE_NAME } from "@/hooks/use-session-cookie";

export const redisRoutes = new Elysia({ prefix: "/redis" })

  .post(
    "/entries",
    async ({
      body,
      cookie: {
        [COOKIE_NAME]: { value: sessionId },
      },
      set,
    }) => {
      try {
        const redisService = new SessionRedisService(sessionId);

        const entry = await redisService.addEntry(body.text);

        set.status = 201;
        return {
          success: true,
          data: entry,
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: "Failed to add entry",
        };
      }
    },
    {
      body: t.Object({
        text: t.String({ minLength: 1, maxLength: 1000 }),
      }),
      cookie: t.Object({
        [COOKIE_NAME]: t.String(),
      }),
      response: t.Union([
        t.Object({
          success: t.Literal(true),
          data: t.Object({
            id: t.String(),
            text: t.String(),
            createdAt: t.String(),
            expiresAt: t.String(),
            ttl: t.Number(),
          }),
        }),
        t.Object({
          success: t.Literal(false),
          error: t.String(),
        }),
      ]),
    }
  )

  .get(
    "/entries",
    async ({
      cookie: {
        [COOKIE_NAME]: { value: sessionId },
      },
      set,
    }) => {
      try {
        const redisService = new SessionRedisService(sessionId);

        const entries = await redisService.getAllEntries();

        return {
          success: true,
          data: entries,
          count: entries.length,
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: "Failed to fetch entries",
        };
      }
    },
    {
      cookie: t.Object({
        [COOKIE_NAME]: t.String(),
      }),
      response: t.Union([
        t.Object({
          success: t.Literal(true),
          data: t.Array(
            t.Object({
              id: t.String(),
              text: t.String(),
              createdAt: t.String(),
              expiresAt: t.String(),
              ttl: t.Number(),
            })
          ),
          count: t.Number(),
        }),
        t.Object({
          success: t.Literal(false),
          error: t.String(),
        }),
      ]),
    }
  )

  .delete(
    "/entries/:id",
    async ({
      params,
      cookie: {
        [COOKIE_NAME]: { value: sessionId },
      },
      set,
    }) => {
      try {
        const redisService = new SessionRedisService(sessionId);

        const deleted = await redisService.deleteEntry(params.id);

        if (!deleted) {
          set.status = 404;
          return {
            success: false,
            error: "Entry not found",
          };
        }

        return {
          success: true,
          message: "Entry deleted successfully",
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: "Failed to delete entry",
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      cookie: t.Object({
        [COOKIE_NAME]: t.String(),
      }),
      response: t.Union([
        t.Object({
          success: t.Literal(true),
          message: t.String(),
        }),
        t.Object({
          success: t.Literal(false),
          error: t.String(),
        }),
      ]),
    }
  );
