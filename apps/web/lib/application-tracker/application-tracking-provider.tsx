"use client";

import { useApplicationTracking } from "@/lib/application-tracker/use-application-tracking";
import { ReactNode } from "react";

interface ApplicationTrackingProviderProps {
  programIdOrSlug?: string | null;
  children: ReactNode;
}

export function ApplicationTrackingProvider({
  programIdOrSlug,
  children,
}: ApplicationTrackingProviderProps) {
  useApplicationTracking({
    programIdOrSlug,
  });

  return <>{children}</>;
}
