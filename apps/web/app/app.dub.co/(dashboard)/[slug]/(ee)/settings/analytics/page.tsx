import { PublishableKeyForm } from "app/app.dub.co/(dashboard)/[slug]/(ee)/settings/analytics/publishable-key-form";
import { AllowedHostnamesForm } from "./allowed-hostnames-form";
import { ConversionTrackingToggle } from "./conversion-tracking-toggle";

export default function WorkspaceAnalytics() {
  return (
    <div className="flex h-full flex-col gap-10">
      <AllowedHostnamesForm />
      <PublishableKeyForm />
      <ConversionTrackingToggle />
    </div>
  );
}
