"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { AnimatedSizeContainer, useRouterStuff } from "@dub/ui";
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
    >
      <AnimatedSizeContainer height>
        {guide !== "shopify" && (
          <div className="grid gap-3 pb-8">
            <BaseScriptSection />

            <ConversionTrackingSection />

            {flags?.analyticsSettingsSiteVisitTracking && (
              <SiteVisitTrackingSection />
            )}

            <OutboundDomainTrackingSection />
          </div>
        )}
      </AnimatedSizeContainer>

      <ConnectionInstructions />

      {!complete && (
        <div className="mt-5">
          <CompleteStepButton
            onClick={() => {
              markComplete(true);
              onComplete();
            }}
            loading={loading}
          />
        </div>
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
      contentClassName="grid gap-5"
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
      contentClassName="grid gap-5"
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

export default function WorkspaceAnalyticsPageClient() {
  const { searchParams, queryParams } = useRouterStuff();
  const expandedStep = (searchParams.get("step") as StepType) || "connect";

  const toggleStep = (step: StepType) => {
    if (expandedStep === step) {
      queryParams({
        del: ["step", "guide"],
        scroll: false,
      });
    } else {
      queryParams({
        del: "guide",
        set: {
          step,
        },
        scroll: false,
      });
    }
  };

  const closeStep = (step: StepType) => {
    if (expandedStep === step) {
      queryParams({
        del: ["step", "guide"],
        scroll: false,
      });
    }
  };

  return (
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
  );
}
