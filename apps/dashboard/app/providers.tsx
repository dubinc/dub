"use client";

import { Dispatch, ReactNode, SetStateAction, createContext } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import useCMDK from "#/ui/cmdk";

export const AppContext = createContext<{
  setShowCMDK: Dispatch<SetStateAction<boolean>>;
}>({
  setShowCMDK: () => {},
});

export default function Providers({ children }: { children: ReactNode }) {
  const { CMDK, setShowCMDK } = useCMDK();

  return (
    <SessionProvider>
      <AppContext.Provider
        value={{
          setShowCMDK,
        }}
      >
        <CMDK />
        <Toaster closeButton />
        {children}
        <Analytics />
      </AppContext.Provider>
    </SessionProvider>
  );
}
