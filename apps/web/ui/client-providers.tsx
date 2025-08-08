"use client";

import { ModalProvider } from "@/ui/modals/modal-provider.tsx";
import { FramePreloadProvider } from "@/ui/qr-builder/providers/frame-preload-provider";
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
      <FramePreloadProvider>
        <ModalProvider sessionId={sessionId!}>{children}</ModalProvider>
      </FramePreloadProvider>
    </SessionProvider>
  );
};
