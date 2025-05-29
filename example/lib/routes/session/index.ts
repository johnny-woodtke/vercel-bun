import { Elysia, t } from "elysia";

import { sessionId, setSessionCookie } from "@/lib/session";

export const sessionRoutes = new Elysia({ prefix: "/session" })
  .use(sessionId())

  // Get the current sessionId
  .get("/", ({ sessionId }) => sessionId, {
    response: t.String(),
  })

  // Set a new sessionId and return it
  .post(
    "/",
    ({ body: { sessionId }, cookie }) => setSessionCookie(cookie, sessionId),
    {
      body: t.Object({
        sessionId: t.String(),
      }),
      response: t.String(),
    }
  );
