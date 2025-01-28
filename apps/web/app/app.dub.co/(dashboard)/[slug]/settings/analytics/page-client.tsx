"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { ConversionTrackingToggle } from "@/ui/workspaces/conversion-tracking-toggle";
import { AllowedHostnames } from "./allowed-hostnames";

export default function WorkspaceAnalyticsClient() {
  const { id, name, slug, role } = useWorkspace();

  const permissionsError = clientAccessCheck({
    action: "workspaces.write",
    role,
  }).error;

  return (
    <>
      <ConversionTrackingToggle />
      <AllowedHostnames />
    </>
  );
}
