import { getCookie, setCookie } from "cookies-next/client";

import { SESSION_ID_COOKIE_NAME } from "@/lib/constants";

export function useSessionCookie() {
  // Get the cookie value
  function getSessionIdCookie() {
    return getCookie(SESSION_ID_COOKIE_NAME);
  }

  // Set the cookie value
  function setSessionIdCookie(value: string) {
    setCookie(SESSION_ID_COOKIE_NAME, value, {
      httpOnly: true,
      sameSite: "none",
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day expiry
    });
  }

  // Return cookie utils
  return { getSessionIdCookie, setSessionIdCookie };
}
