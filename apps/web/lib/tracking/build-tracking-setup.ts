import {
  guides,
  IntegrationType,
  StackItem,
  stackItems,
} from "@/ui/guides/integrations";

const STEP_TYPES: IntegrationType[] = [
  "client-sdk",
  "track-lead",
  "track-sale",
];

const TYPE_LABELS: Record<IntegrationType, string> = {
  "client-sdk": "Client-side",
  "track-lead": "Lead tracking",
  "track-sale": "Sale tracking",
};

const FALLBACK_CLIENT_STEP = {
  type: "client-sdk" as const,
  title: "Client-side script",
  url: "https://dub.co/docs/sdks/client-side",
  guideKey: null,
};

const ANALYTICS_SCRIPT_BASE = "https://www.dubcdn.com/analytics/script.js";

const REACT_PACKAGE_LINE =
  "Use the @dub/analytics package with this workspace's publishable key. Do not add the Dub script tag unless a guide says to.";

const KEY_PRESENT_FOOTER =
  "Use the workspace values above. Do not invent a different publishable key or hostname.";

const KEY_MISSING_FOOTER =
  "Generate a publishable key in Tracking settings before tracking conversion events. Do not invent a key.";

export type TrackingSetupStep = {
  type: IntegrationType;
  typeLabel: string;
  title: string;
  label: string;
  url: string;
  guideKey: string | null;
  icon: StackItem["icon"] | null;
  iconProps?: StackItem["iconProps"];
};

type BuildTrackingSetupInput = {
  stack: string[];
  hostnames: string[];
  publishableKey: string | null;
  siteVisitEnabled: boolean;
  outboundEnabled: boolean;
};

export type TrackingSetup = {
  steps: TrackingSetupStep[];
  prompt: string;
};

function getGuideForType(item: StackItem, type: IntegrationType) {
  return item.guideKeys
    .map((key) => guides.find((guide) => guide.key === key))
    .find((guide) => guide?.type === type);
}

function toStep(
  item: StackItem,
  type: IntegrationType,
  guide: NonNullable<ReturnType<typeof getGuideForType>>,
): TrackingSetupStep {
  const typeLabel = TYPE_LABELS[type];

  return {
    type,
    typeLabel,
    title: item.title,
    label: `${typeLabel} — ${item.title}`,
    url: guide.url,
    guideKey: guide.key,
    icon: item.icon,
    iconProps: item.iconProps,
  };
}

function resolveTrackingSetupSteps(stack: string[]): TrackingSetupStep[] {
  const selected = stack
    .map((id) => stackItems.find((item) => item.id === id))
    .filter((item): item is StackItem => Boolean(item));
  const steps: TrackingSetupStep[] = [];

  for (const type of STEP_TYPES) {
    const explicit = selected.filter((item) => item.type === type);

    if (explicit.length > 0) {
      for (const item of explicit) {
        const guide = getGuideForType(item, type);
        if (guide) {
          steps.push(toStep(item, type, guide));
        }
      }
      continue;
    }

    for (const item of selected) {
      const guide = getGuideForType(item, type);
      if (guide) {
        steps.push(toStep(item, type, guide));
      }
    }
  }

  if (!steps.some((step) => step.type === "client-sdk")) {
    const typeLabel = TYPE_LABELS["client-sdk"];
    steps.unshift({
      ...FALLBACK_CLIENT_STEP,
      typeLabel,
      label: FALLBACK_CLIENT_STEP.title,
      icon: null,
    });
  }

  return steps;
}

function composeTrackingSetupPrompt({
  steps,
  hostnames,
  publishableKey,
  siteVisitEnabled,
  outboundEnabled,
}: {
  steps: TrackingSetupStep[];
} & Omit<BuildTrackingSetupInput, "stack">) {
  const clientSteps = steps.filter((step) => step.type === "client-sdk");
  const reactOnlyClient =
    clientSteps.length === 1 && clientSteps[0]?.guideKey === "react";
  const scriptSegments = [
    siteVisitEnabled ? "site-visit" : null,
    outboundEnabled ? "outbound-domains" : null,
    publishableKey ? "conversion-tracking" : null,
  ].filter(Boolean);
  const analyticsScriptUrl =
    scriptSegments.length === 0
      ? ANALYTICS_SCRIPT_BASE
      : `https://www.dubcdn.com/analytics/script.${scriptSegments.join(".")}.js`;
  const workspaceLines = [
    hostnames.length > 0 ? `- Hostnames: ${hostnames.join(", ")}` : null,
    publishableKey
      ? `- Publishable key (client-side): ${publishableKey}`
      : null,
    reactOnlyClient ? null : `- Analytics script: ${analyticsScriptUrl}`,
  ].filter(Boolean);

  const hasDuplicateTypes = STEP_TYPES.some(
    (type) => steps.filter((step) => step.type === type).length > 1,
  );

  const stepLines = steps.map((step, index) => {
    const heading =
      step.guideKey === null ? step.title : `${step.typeLabel} — ${step.title}`;

    return `${index + 1}. ${heading}\n   Read ${step.url} and implement it.`;
  });

  return [
    "Install Dub conversion tracking for this workspace.",
    "",
    "Workspace:",
    ...workspaceLines,
    ...(reactOnlyClient ? ["", REACT_PACKAGE_LINE] : []),
    "",
    "Implement these steps in order:",
    ...stepLines,
    ...(hasDuplicateTypes
      ? [
          "",
          "If multiple guides share a step, use the one that matches this codebase.",
        ]
      : []),
    "",
    publishableKey ? KEY_PRESENT_FOOTER : KEY_MISSING_FOOTER,
  ].join("\n");
}

export function buildTrackingSetup(
  input: BuildTrackingSetupInput,
): TrackingSetup {
  const steps = resolveTrackingSetupSteps(input.stack);

  return {
    steps,
    prompt: composeTrackingSetupPrompt({
      steps,
      hostnames: input.hostnames,
      publishableKey: input.publishableKey,
      siteVisitEnabled: input.siteVisitEnabled,
      outboundEnabled: input.outboundEnabled,
    }),
  };
}
