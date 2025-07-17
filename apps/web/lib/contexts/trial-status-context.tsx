"use client";

import { checkFeaturesAccess } from "@/lib/actions/check-features-access.ts";
import { useGetUserProfileQuery } from "core/api/user/user.hook.tsx";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  useGetUserProfileQuery();

  const checkTrialStatus = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const res = await checkFeaturesAccess();

      if (!res?.data?.featuresAccess) {
        setIsTrialOver(true);
      }
    } catch (error) {
      console.error("Error checking trial status:", error);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (status === "loading") return;

    checkTrialStatus();
  }, [status, checkTrialStatus, pathname]);

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
