import { QueryKey } from "@tanstack/react-query";

export function getEntriesQueryKey<T extends string | null>(
  sessionId: T
): QueryKey {
  return ["entries", sessionId] as const;
}
