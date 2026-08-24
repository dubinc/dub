"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { SectionCard } from "./section-card";
import {
  DeveloperGuides,
  isSetupInstructionsReady,
  SetupInstructions,
} from "./setup-instructions";
import { TrackingSettingsRow } from "./tracking-settings-row";
import { VerifyInstall } from "./verify-install";

export function InstallationSection() {
  const { allowedHostnames } = useWorkspace();
  const [savedStack] = useWorkspaceStore<string[]>(
    "analyticsSettingsSelectedStack",
  );

  const stack = savedStack ?? [];
  const hostnames = allowedHostnames ?? [];
  const ready = isSetupInstructionsReady(stack, hostnames.length > 0);

  return (
    <SectionCard number={2} title="Installation and verification">
      <div className="divide-y divide-neutral-200">
        <TrackingSettingsRow
          heading="Setup instructions"
          description="Use the prompts and instructions to install Dub."
          leftExtra={ready ? <DeveloperGuides /> : undefined}
        >
          <SetupInstructions stack={stack} hasHostname={hostnames.length > 0} />
        </TrackingSettingsRow>

        <TrackingSettingsRow
          heading="Verify installation"
          description="To make sure it's all working!"
          align="center"
        >
          <VerifyInstall hostnames={hostnames} />
        </TrackingSettingsRow>
      </div>
    </SectionCard>
  );
}
