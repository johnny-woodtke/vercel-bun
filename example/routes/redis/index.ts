import { Elysia, t } from "elysia";
import { v4 as uuidv4 } from "uuid";

import {
  MAX_TEXT_LENGTH,
  MAX_TTL,
  MIN_TTL,
  SESSION_ID_PARAM_NAME,
} from "@/lib/constants";
import { getImageUrl, r2 } from "@/lib/r2";
import { redisEntrySchema, SessionRedisService } from "@/lib/redis";

export const redisRoutes = new Elysia({ prefix: "/redis" })

  .post(
    "/entries",
    async ({ body, query: { [SESSION_ID_PARAM_NAME]: sessionId }, set }) => {
      try {
        // Initialize Redis service
        const redisService = new SessionRedisService(sessionId);

        // Validate that either text or image is provided
        const text = body.text?.trim() ?? "";
        const image = body.image;
        if (text.length === 0 && !image) {
          set.status = 400;
          return {
            error: "Either text or image must be provided",
          };
        }

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
              error: "TTL must be a number between 10 and 300",
            };
          }
          ttl = parsedTtl;
        }

        // Handle image upload if present
        let imageUrl: string | undefined;
        if (body.image) {
          const imageFile = body.image;
          const fileExtension = imageFile.name.split(".").pop() || "jpg";
          const fileName = `images/${sessionId}/${uuidv4()}.${fileExtension}`;

          try {
            // Upload to R2
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
              error: "Failed to upload image",
            };
          }
        }

        // Add entry to Redis
        const entry = await redisService.addEntry(text, ttl, imageUrl);

        // Return the entry
        return {
          data: entry,
        };
      } catch (error) {
        console.error("Failed to add entry:", error);

        set.status = 500;
        return {
          error: "Failed to add entry",
        };
      }
    },
    {
      body: t.Object({
        text: t.Optional(t.String({ maxLength: MAX_TEXT_LENGTH })),
        ttl: t.Optional(
          t.Union([
            t.Number({ minimum: MIN_TTL, maximum: MAX_TTL }),
            t.String(),
          ])
        ),
        image: t.Optional(t.Nullable(t.File())),
      }),
      query: t.Object({
        [SESSION_ID_PARAM_NAME]: t.String(),
      }),
      response: {
        200: t.Object({
          data: redisEntrySchema,
        }),
        400: t.Object({
          error: t.String(),
        }),
        500: t.Object({
          error: t.String(),
        }),
      },
    }
  )

  .get(
    "/entries",
    async ({ query: { [SESSION_ID_PARAM_NAME]: sessionId }, set }) => {
      try {
        // Initialize Redis service
        const redisService = new SessionRedisService(sessionId);

        // Get all entries
        const entries = await redisService.getAllEntries();

        // Return entries and count
        return {
          data: entries,
          count: entries.length,
        };
      } catch (error) {
        console.error("Failed to fetch entries:", error);

        set.status = 500;
        return {
          error: "Failed to fetch entries",
        };
      }
    },
    {
      query: t.Object({
        [SESSION_ID_PARAM_NAME]: t.String(),
      }),
      response: {
        200: t.Object({
          data: t.Array(redisEntrySchema),
          count: t.Number(),
        }),
        500: t.Object({
          error: t.String(),
        }),
      },
    }
  )

  .delete(
    "/entries/:id",
    async ({ params, query: { [SESSION_ID_PARAM_NAME]: sessionId }, set }) => {
      try {
        // Initialize Redis service
        const redisService = new SessionRedisService(sessionId);

        // Delete entry
        const deleted = await redisService.deleteEntry(params.id);

        // Return error if entry not found
        if (!deleted) {
          set.status = 404;
          return {
            error: "Entry not found",
          };
        }

        // Return success message
        return {
          message: "Entry deleted successfully",
        };
      } catch (error) {
        set.status = 500;
        return {
          error: "Failed to delete entry",
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        [SESSION_ID_PARAM_NAME]: t.String(),
      }),
      response: {
        200: t.Object({
          message: t.String(),
        }),
        404: t.Object({
          error: t.String(),
        }),
        500: t.Object({
          error: t.String(),
        }),
      },
    }
  );
