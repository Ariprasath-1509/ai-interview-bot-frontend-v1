"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { UserRole } from "@/server/roles";

export type StaffSession = {
  role: UserRole;
  branch?: string;
  username?: string;
  adminSource?: string;
};

const StaffSessionContext = createContext<StaffSession | null>(null);

export function StaffSessionProvider({
  session,
  children,
}: {
  session: StaffSession;
  children: ReactNode;
}) {
  return (
    <StaffSessionContext.Provider value={session}>{children}</StaffSessionContext.Provider>
  );
}

export function useStaffSession(): StaffSession | null {
  return useContext(StaffSessionContext);
}
