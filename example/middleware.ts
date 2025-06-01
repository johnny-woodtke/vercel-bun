import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { MEMBER_ID_COOKIE_NAME } from "@/lib/constants";
import { getVercelEnv } from "@/lib/utils";

export function middleware(request: NextRequest) {
  // Get member ID cookie from request if it exists, otherwise generate a new one
  const memberId =
    request.cookies.get(MEMBER_ID_COOKIE_NAME)?.value ?? uuidv4();

  // Create response
  const response = NextResponse.next();

  // Set member ID cookie
  response.cookies.set(MEMBER_ID_COOKIE_NAME, memberId, {
    httpOnly: true, // Prevent JavaScript access
    maxAge: 24 * 60 * 60, // 24 hours in seconds
    // Only set these attributes in non-local environments
    ...(getVercelEnv() && { sameSite: "none", secure: true }),
  });

  // Return response
  return response;
}
