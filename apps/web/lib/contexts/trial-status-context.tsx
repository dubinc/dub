"use client";

import { useGetUserProfileQuery } from "core/api/user/user.hook.tsx";
import { createContext, ReactNode, useContext, useState } from "react";

interface TrialStatusContextType {
  isTrialOver: boolean;
  setIsTrialOver: (value: boolean) => void;
}

const TrialStatusContext = createContext<TrialStatusContextType | undefined>(
  undefined,
);

export function TrialStatusProvider({ children }: { children: ReactNode }) {
  const [isTrialOver, setIsTrialOver] = useState<boolean>(true);

  useGetUserProfileQuery();

  return (
    <TrialStatusContext.Provider value={{ isTrialOver, setIsTrialOver }}>
      {children}
    </TrialStatusContext.Provider>
  );
}

export function useTrialStatus() {
  const context = useContext(TrialStatusContext);
  if (context === undefined) {
    throw new Error("useTrialStatus must be used within a TrialStatusProvider");
  }
  return context;
}
