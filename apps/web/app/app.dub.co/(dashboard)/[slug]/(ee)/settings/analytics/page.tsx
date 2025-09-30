import { AllowedHostnamesForm } from "./allowed-hostnames-form";
import { ConversionTrackingToggle } from "./conversion-tracking-toggle";
import { PublishableKeyForm } from "./publishable-key-form";

export default function WorkspaceAnalytics() {
  return (
    <div className="flex h-full flex-col gap-10">
      <AllowedHostnamesForm />
      <PublishableKeyForm />
      <ConversionTrackingToggle />
    </div>
  );
}
