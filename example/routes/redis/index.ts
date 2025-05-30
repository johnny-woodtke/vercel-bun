import { Elysia, t } from "elysia";

import { SESSION_ID_COOKIE_NAME } from "@/lib/constants";
import { getImageUrl, r2 } from "@/lib/r2";
import { SessionRedisService } from "@/lib/redis";

const MIN_TTL = 10;
const MAX_TTL = 300;

export const redisRoutes = new Elysia({ prefix: "/redis" })

  .post(
    "/entries",
    async ({
      body,
      cookie: {
        [SESSION_ID_COOKIE_NAME]: { value: sessionId },
      },
      set,
    }) => {
      try {
        const redisService = new SessionRedisService(sessionId);
        let imageUrl: string | undefined;

        // Convert ttl to number if it's a string
        let ttl = body.ttl;
        if (typeof ttl === "string") {
          const parsedTtl = parseInt(ttl, 10);
          if (
            Number.isNaN(parsedTtl) ||
            parsedTtl < MIN_TTL ||
            parsedTtl > MAX_TTL
          ) {
            set.status = 400;
            return {
              success: false,
              error: "TTL must be a number between 10 and 300",
            };
          }
          ttl = parsedTtl;
        }

        // Handle image upload if present
        if (body.image) {
          const imageFile = body.image;
          const fileExtension = imageFile.name.split(".").pop() || "jpg";
          const fileName = `images/${sessionId}/${crypto.randomUUID()}.${fileExtension}`;

          try {
            // Upload to R2
            console.log("S3_SESSION_TOKEN", Bun.env.S3_SESSION_TOKEN);
            Bun.env.S3_SESSION_TOKEN = "";
            console.log("S3_SESSION_TOKEN", Bun.env.S3_SESSION_TOKEN);

            await r2.write(fileName, imageFile, {
              type: imageFile.type,
              acl: "public-read",
            });

            // Construct the public URL
            imageUrl = getImageUrl(fileName);
          } catch (uploadError) {
            console.error("Failed to upload image:", uploadError);
            set.status = 500;
            return {
              success: false,
              error: "Failed to upload image",
            };
          }
        }

        const entry = await redisService.addEntry(body.text, ttl, imageUrl);

        set.status = 201;
        return {
          success: true,
          data: entry,
        };
      } catch (error) {
        console.error("Failed to add entry:", error);
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
        ttl: t.Optional(
          t.Union([
            t.Number({ minimum: MIN_TTL, maximum: MAX_TTL }),
            t.String({}),
          ])
        ),
        image: t.Optional(t.File()),
      }),
      cookie: t.Object({
        [SESSION_ID_COOKIE_NAME]: t.String(),
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
            imageUrl: t.Optional(t.String()),
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
        [SESSION_ID_COOKIE_NAME]: { value: sessionId },
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
        [SESSION_ID_COOKIE_NAME]: t.String(),
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
              imageUrl: t.Optional(t.String()),
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
        [SESSION_ID_COOKIE_NAME]: { value: sessionId },
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
        [SESSION_ID_COOKIE_NAME]: t.String(),
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
