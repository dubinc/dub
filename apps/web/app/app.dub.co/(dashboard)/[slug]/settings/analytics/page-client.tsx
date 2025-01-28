"use client";

import { ConversionTrackingToggle } from "@/ui/workspaces/conversion-tracking-toggle";
import { AllowedHostnames } from "./allowed-hostnames";

export default function WorkspaceAnalyticsClient() {
  return (
    <>
      <ConversionTrackingToggle />
      <AllowedHostnames />
    </>
  );
}
