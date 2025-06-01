"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo } from "react";

import { SESSION_ID_PARAM_NAME } from "@/lib/constants";

type SessionParamContextType = {
  sessionIdParam: string;
  setSessionIdParam: (value: string) => void;
};

const SessionParamContext = createContext<SessionParamContextType | null>(null);

type SessionParamProviderProps = {
  sessionId: string;
  children: React.ReactNode;
};

export function SessionParamProvider({
  children,
  sessionId,
}: SessionParamProviderProps) {
  const router = useRouter();

  function setSessionIdParam(newSessionId: string) {
    router.push(`/?${SESSION_ID_PARAM_NAME}=${newSessionId}`);
  }

  const sessionIdParam = useMemo(() => sessionId, [sessionId]);

  return (
    <SessionParamContext.Provider value={{ sessionIdParam, setSessionIdParam }}>
      {children}
    </SessionParamContext.Provider>
  );
}

export function useSessionParam() {
  const context = useContext(SessionParamContext);
  if (!context) {
    throw new Error(
      "useSessionParam must be used within a SessionParamProvider"
    );
  }
  return context;
}
