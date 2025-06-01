"use client";

import { createContext, useContext } from "react";

type MemberIdContextType = {
  memberId: string;
};

const MemberIdContext = createContext<MemberIdContextType | null>(null);

type MemberIdProviderProps = {
  memberId: string;
  children: React.ReactNode;
};

export function MemberIdProvider({
  memberId,
  children,
}: MemberIdProviderProps) {
  return (
    <MemberIdContext.Provider value={{ memberId }}>
      {children}
    </MemberIdContext.Provider>
  );
}

export function useMemberId() {
  const context = useContext(MemberIdContext);
  if (!context) {
    throw new Error("useMemberId must be used within a MemberIdProvider");
  }
  return context;
}
