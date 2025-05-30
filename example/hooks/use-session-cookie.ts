import { getCookie, setCookie } from "cookies-next/client";

export const COOKIE_NAME = "sessionId";

export function useSessionCookie() {
  // Get the cookie value
  function getSessionIdCookie() {
    return getCookie(COOKIE_NAME);
  }

  // Set the cookie value
  function setSessionIdCookie(value: string) {
    setCookie(COOKIE_NAME, value, {
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day expiry
    });
  }

  // Return cookie utils
  return { getSessionIdCookie, setSessionIdCookie };
}
