"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { buildTrackingSetup } from "@/lib/tracking/build-tracking-setup";
import { useEffect, useMemo, useRef } from "react";
import { SectionCard } from "./section-card";
import { DeveloperGuides, SetupInstructions } from "./setup-instructions";
import { TrackingSettingsRow } from "./tracking-settings-row";
import { VerifyInstall } from "./verify-install";

const DEFAULT_STACK = ["custom"] as const;

export function InstallationSection() {
  const {
    allowedHostnames,
    publishableKey,
    loading: workspaceLoading,
  } = useWorkspace();
  const [savedStack, setSavedStack, { loading: stackLoading }] =
    useWorkspaceStore<string[]>("analyticsSettingsSelectedStack", {
      mutateOnSet: true,
    });
  const [siteVisitEnabled] = useWorkspaceStore<boolean>(
    "analyticsSettingsSiteVisitTrackingEnabled",
  );
  const [outboundEnabled] = useWorkspaceStore<boolean>(
    "analyticsSettingsOutboundDomainTrackingEnabled",
  );

  const stack = savedStack ?? [];
  const hostnames = allowedHostnames ?? [];
  const ready = stack.length > 0 && hostnames.length > 0;
  const seedingRef = useRef(false);

  useEffect(() => {
    if (workspaceLoading || stackLoading || seedingRef.current) {
      return;
    }

    if (savedStack !== undefined || hostnames.length === 0) {
      return;
    }

    seedingRef.current = true;
    void setSavedStack([...DEFAULT_STACK]);
  }, [
    workspaceLoading,
    stackLoading,
    savedStack,
    hostnames.length,
    setSavedStack,
  ]);

  const setup = useMemo(
    () =>
      buildTrackingSetup({
        stack,
        hostnames,
        publishableKey: publishableKey ?? null,
        siteVisitEnabled: Boolean(siteVisitEnabled),
        outboundEnabled: Boolean(outboundEnabled),
      }),
    [stack, hostnames, publishableKey, siteVisitEnabled, outboundEnabled],
  );

  return (
    <SectionCard number={2} title="Installation and verification">
      <div className="divide-y divide-neutral-200">
        <TrackingSettingsRow
          heading="Setup instructions"
          description="Use the prompts and instructions to install Dub."
          leftExtra={ready ? <DeveloperGuides /> : undefined}
          leftExtraAlign="end"
        >
          <SetupInstructions setup={setup} ready={ready} />
        </TrackingSettingsRow>

        <TrackingSettingsRow
          heading="Verify installation"
          description="Select your hostname to verify the Dub installation."
          align="center"
        >
          <VerifyInstall hostnames={hostnames} />
        </TrackingSettingsRow>
      </div>
    </SectionCard>
  );
}
