"use client";

import { FramePreloadProvider } from "@/ui/qr-builder/providers/frame-preload-provider";
import { FC, ReactNode } from "react";

interface IDomainClientProvidersProps {
  children: ReactNode;
}

export const DomainClientProviders: FC<
  Readonly<IDomainClientProvidersProps>
> = ({ children }) => {
  return <FramePreloadProvider>{children}</FramePreloadProvider>;
};
