import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

import { AddEntryCard } from "@/components/add-entry-card";
import { EntriesTable } from "@/components/entries-table";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { SessionCard } from "@/components/session-card";
import { MemberIdProvider } from "@/hooks/use-member-id";
import { SessionParamProvider } from "@/hooks/use-session-param";
import { MEMBER_ID_COOKIE_NAME, SESSION_ID_PARAM_NAME } from "@/lib/constants";
import { eden } from "@/lib/eden";
import { getEntriesQueryKey } from "@/lib/tanstack";

type HomePageProps = {
  searchParams: Promise<{
    [SESSION_ID_PARAM_NAME]: string | string[] | undefined;
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  // Get session ID from search params and member ID from cookies
  const [sessionId, memberId] = await Promise.all([
    searchParams.then((params) => params.sessionId),
    cookies().then((cookies) => cookies.get(MEMBER_ID_COOKIE_NAME)?.value),
  ]);

  // Redirect if session ID is not provided
  if (typeof sessionId !== "string") {
    redirect(`/?${SESSION_ID_PARAM_NAME}=${uuidv4()}`);
  }

  // Fetch entries from API
  const res = await eden.api.redis.entries.get({
    query: {
      sessionId,
    },
    headers: {
      cookie: `${MEMBER_ID_COOKIE_NAME}=${memberId}`,
    },
  });

  // Set entries in query client
  const queryClient = new QueryClient();
  if (res.data) {
    queryClient.setQueryData(getEntriesQueryKey(sessionId), res.data);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <SessionParamProvider sessionId={sessionId}>
            <MemberIdProvider memberId={memberId ?? ""}>
              <HydrationBoundary state={dehydrate(queryClient)}>
                <SessionCard />
                <AddEntryCard />
                <EntriesTable />
              </HydrationBoundary>
            </MemberIdProvider>
          </SessionParamProvider>
        </div>
      </main>
      <Footer />
    </div>
  );
}
