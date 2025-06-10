"use client";

import { useSession } from "next-auth/react";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface TrialStatusContextType {
  isTrialOver: boolean;
  setIsTrialOver: (value: boolean) => void; // TODO: remove it, still used for testing
}

const TrialStatusContext = createContext<TrialStatusContextType | undefined>(
  undefined,
);

export function TrialStatusProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession() as
    | {
        data: { user: { id: string } };
        status: "authenticated";
      }
    | { data: null; status: "loading" };

  const [isTrialOver, setIsTrialOver] = useState<boolean>(false);

  const checkTrialStatus = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch("/api/user/trial-status");
      const data = await response.json();

      if (data.isTrialOver) {
        setIsTrialOver(true);
      }
    } catch (error) {
      console.error("Error checking trial status:", error);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (status === "loading") return;

    checkTrialStatus();
  }, [status, checkTrialStatus]);

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
