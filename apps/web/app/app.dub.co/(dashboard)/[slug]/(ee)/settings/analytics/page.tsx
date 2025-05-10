import { ConversionTrackingToggle } from "@/ui/workspaces/conversion-tracking-toggle";
import { AllowedHostnames } from "./allowed-hostnames";

export default function WorkspaceAnalytics() {
  return (
    <div className="flex h-full flex-col gap-10">
      <AllowedHostnames />
      <ConversionTrackingToggle />
    </div>
  );
}
