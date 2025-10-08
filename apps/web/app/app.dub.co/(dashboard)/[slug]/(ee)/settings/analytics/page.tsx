"use client";

import Link from "next/link";

import useWorkspace from "@/lib/swr/use-workspace";
import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { useLocalStorage, useRouterStuff } from "@dub/ui";
import { cn } from "@dub/utils";
import BaseScriptSection from "./base-script-section";
import { CompleteStepButton } from "./complete-step-button";
import ConnectionInstructions from "./connection-instructions";
import ConversionTrackingSection from "./conversion-tracking-section";
import OutboundDomainTrackingSection from "./outbound-domain-tracking-section";
import { SiteVisitTrackingSection } from "./site-visit-tracking-section";
import Step, { BaseStepProps, type Step as StepType } from "./step";
import TrackLeadsGuidesSection from "./track-lead-guides-section";
import TrackSalesGuidesSection from "./track-sales-guides-section";

const ConnectStep = ({
  expanded,
  toggleExpanded,
  onComplete,
}: BaseStepProps & { onComplete: () => void }) => {
  const { flags } = useWorkspace();

  const { searchParams } = useRouterStuff();
  const guide = searchParams.get("guide");

  const [complete, markComplete, { loading }] = useWorkspaceStore<boolean>(
    "analyticsSettingsConnectionSetupComplete",
  );

  return (
    <Step
      id="connect"
      step={1}
      title="Connect to Dub"
      subtitle="Select scripts to enable page, conversion, and outbound tracking"
      expanded={expanded}
      toggleExpanded={toggleExpanded}
      complete={complete}
      contentClassName="flex flex-col gap-8"
    >
      <div
        className={cn(
          "transition-opacity",
          guide === "shopify" && "cursor-not-allowed opacity-50",
        )}
      >
        <div className="flex flex-col gap-3" inert={guide === "shopify"}>
          <BaseScriptSection />

          <ConversionTrackingSection />

          {flags?.analyticsSettingsSiteVisitTracking && (
            <SiteVisitTrackingSection />
          )}

          <OutboundDomainTrackingSection />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <div className="font-semibold text-black">
            Connection Instructions
          </div>

          <p className="text-content-subtle text-sm font-medium">
            Select your integration method to show specific instructions
          </p>
        </div>

        <ConnectionInstructions />
      </div>

      {!complete && (
        <CompleteStepButton
          onClick={() => {
            markComplete(true);
            onComplete();
          }}
          loading={loading}
        />
      )}
      {/* <VerifyInstall /> */}
    </Step>
  );
};

const LeadEventsStep = ({
  expanded,
  toggleExpanded,
  onComplete,
}: BaseStepProps & { onComplete: () => void }) => {
  const [complete, markComplete, { loading }] = useWorkspaceStore<boolean>(
    "analyticsSettingsLeadTrackingSetupComplete",
  );

  return (
    <Step
      id="lead"
      step={2}
      title="Track lead events"
      subtitle="For lead events from your server using our server side SDKs or the REST API"
      expanded={expanded}
      toggleExpanded={toggleExpanded}
      complete={complete}
      contentClassName="flex flex-col gap-5"
    >
      <TrackLeadsGuidesSection />

      {!complete && (
        <CompleteStepButton
          onClick={() => {
            markComplete(true);
            onComplete();
          }}
          loading={loading}
        />
      )}
    </Step>
  );
};

const SaleEventsStep = ({
  expanded,
  toggleExpanded,
  onComplete,
}: BaseStepProps & { onComplete: () => void }) => {
  const [complete, markComplete, { loading }] = useWorkspaceStore<boolean>(
    "analyticsSettingsSaleTrackingSetupComplete",
  );

  return (
    <Step
      id="sale"
      step={3}
      title="Track sale events"
      subtitle="For tracking purchases using our Stripe integration or our server side SDKs"
      expanded={expanded}
      toggleExpanded={toggleExpanded}
      complete={complete}
      contentClassName="flex flex-col gap-5"
    >
      <TrackSalesGuidesSection />

      {!complete && (
        <CompleteStepButton
          onClick={() => {
            markComplete(true);
            onComplete();
          }}
          loading={loading}
        />
      )}
    </Step>
  );
};

export default function WorkspaceAnalytics() {
  const [expandedStep, setExpandedStep] = useLocalStorage<StepType | null>(
    "analytics-settings",
    "connect",
  );

  const toggleStep = (step: StepType) => {
    if (expandedStep === step) {
      setExpandedStep(null);
    } else {
      setExpandedStep(step);
    }
  };

  const closeStep = (step: StepType) => {
    if (expandedStep === step) {
      setExpandedStep(null);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-[800px] flex-col gap-8 overflow-hidden">
      <div className="flex flex-wrap justify-between gap-6">
        <h1 className="text-2xl font-semibold tracking-tight text-black">
          Analytics
        </h1>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <Link
            href={"/docs"}
            className="text-content-emphasis border-border-subtle rounded-lg border px-3 py-1.5 text-sm font-medium"
          >
            Docs ↗
          </Link>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-8 overflow-hidden">
        <ConnectStep
          expanded={expandedStep === "connect"}
          toggleExpanded={() => toggleStep("connect")}
          onComplete={() => closeStep("connect")}
        />
        <LeadEventsStep
          expanded={expandedStep === "lead"}
          toggleExpanded={() => toggleStep("lead")}
          onComplete={() => closeStep("lead")}
        />
        <SaleEventsStep
          expanded={expandedStep === "sale"}
          toggleExpanded={() => toggleStep("sale")}
          onComplete={() => closeStep("sale")}
        />
      </div>
    </div>
  );
}
