"use client";

import { ModalProvider } from "@/ui/modals/modal-provider.tsx";
import { SessionProvider } from "next-auth/react";
import { FC, ReactNode } from "react";

interface IClientProvidersProps {
  sessionId: string;
  children: ReactNode;
}

export const ClientProviders: FC<Readonly<IClientProvidersProps>> = ({
  sessionId,
  children,
}) => {
  return (
    <SessionProvider>
      <ModalProvider sessionId={sessionId!}>{children}</ModalProvider>
    </SessionProvider>
  );
};
