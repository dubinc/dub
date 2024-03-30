"use client";

import ModalProvider from "@/ui/modals/provider";
import { SessionProvider, useSession } from "next-auth/react";
import posthog from "posthog-js";
import { ReactNode, useEffect } from "react";

const Identify = () => {
  const { data: session } = useSession();

  useEffect(() => {
    if (session && session?.user) {
      posthog.identify(session.user?.id, {
        email: session.user?.email,
        name: session.user?.name,
      });
    }
  }, [session]);

  return null;
};

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Identify />
      <ModalProvider>{children}</ModalProvider>
    </SessionProvider>
  );
}
