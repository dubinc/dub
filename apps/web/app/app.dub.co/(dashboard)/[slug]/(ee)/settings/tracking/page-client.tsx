"use client";

import { ConfigureTrackingSection } from "./configure-tracking-section";
import { InstallationSection } from "./installation-section";

export function WorkspaceTrackingSettingsPageClient() {
  return (
    <div className="flex flex-1 flex-col gap-8 overflow-hidden">
      <ConfigureTrackingSection />
      <InstallationSection />
    </div>
  );
}
