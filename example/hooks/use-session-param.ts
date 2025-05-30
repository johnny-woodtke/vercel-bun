"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { SESSION_ID_PARAM_NAME } from "@/lib/constants";

export function useSessionParam() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get the session ID from query parameters
  function getSessionIdParam() {
    return searchParams.get(SESSION_ID_PARAM_NAME);
  }

  // Set the session ID in query parameters
  function setSessionIdParam(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(SESSION_ID_PARAM_NAME, value);
    router.push(`?${params.toString()}`);
  }

  // Return session utils
  return { getSessionIdParam, setSessionIdParam };
}
