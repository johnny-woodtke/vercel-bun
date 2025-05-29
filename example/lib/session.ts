import { Elysia, type Cookie } from "elysia";

export function setSessionCookie(
  cookie: Record<string, Cookie<string | undefined>>,
  newSessionId?: string
): string {
  // Set the sessionId cookie
  cookie.sessionId.value = newSessionId || crypto.randomUUID();
  cookie.sessionId.httpOnly = true;
  cookie.sessionId.maxAge = 86400; // 24 hours
  cookie.sessionId.sameSite = "none";
  cookie.sessionId.secure = true;

  // Return the new sessionId
  return cookie.sessionId.value;
}

/**
 * Creates a new sessionId/gets one if it exists and sets it in the context.
 */
export function sessionId() {
  return (
    new Elysia()
      // Upsert sessionId and set it to the context
      .resolve({ as: "global" }, ({ cookie }) => {
        let sessionId: string;
        if (!cookie.sessionId.value) {
          sessionId = setSessionCookie(cookie);
        } else {
          sessionId = cookie.sessionId.value;
        }

        return {
          sessionId,
        };
      })
  );
}
