"use client";

import { ProgramProps } from "@/lib/types";
import { createContext, ReactNode, useContext } from "react";

export type ActivityLogView = "program" | "partner";

export interface ActivityLogContextValue {
  program: Pick<ProgramProps, "id" | "name" | "logo"> | null;
  view: ActivityLogView;
}

const ActivityLogContext = createContext<ActivityLogContextValue>({
  program: null,
  view: "program",
});

export function ActivityLogProvider({
  program,
  view = "program",
  children,
}: {
  program?: Pick<ProgramProps, "id" | "name" | "logo"> | null;
  view?: ActivityLogView;
  children: ReactNode;
}) {
  const value: ActivityLogContextValue = {
    program: program ?? null,
    view,
  };

  return (
    <ActivityLogContext.Provider value={value}>
      {children}
    </ActivityLogContext.Provider>
  );
}

export function useActivityLogContext(): ActivityLogContextValue {
  return useContext(ActivityLogContext);
}
