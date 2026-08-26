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

export type BuildTrackingSetupInput = {
  stack: string[];
  hostnames: string[];
  publishableKey: string | null;
  siteVisitEnabled: boolean;
  outboundEnabled: boolean;
  conversionEnabled: boolean;
};

export type TrackingSetup = {
  steps: TrackingSetupStep[];
  prompt: string;
};

function getSelectedStackItems(stack: string[]) {
  return stack
    .map((id) => stackItems.find((item) => item.id === id))
    .filter((item): item is StackItem => Boolean(item));
}

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

export function resolveTrackingSetupSteps(
  stack: string[],
): TrackingSetupStep[] {
  const selected = getSelectedStackItems(stack);
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

export function getAnalyticsScriptUrl({
  siteVisitEnabled,
  outboundEnabled,
  conversionEnabled,
}: Pick<
  BuildTrackingSetupInput,
  "siteVisitEnabled" | "outboundEnabled" | "conversionEnabled"
>) {
  const segments = [
    siteVisitEnabled ? "site-visit" : null,
    outboundEnabled ? "outbound-domains" : null,
    conversionEnabled ? "conversion-tracking" : null,
  ].filter(Boolean);

  if (segments.length === 0) {
    return ANALYTICS_SCRIPT_BASE;
  }

  return `https://www.dubcdn.com/analytics/script.${segments.join(".")}.js`;
}

export function composeTrackingSetupPrompt({
  steps,
  hostnames,
  publishableKey,
  siteVisitEnabled,
  outboundEnabled,
  conversionEnabled,
}: {
  steps: TrackingSetupStep[];
} & Omit<BuildTrackingSetupInput, "stack">) {
  const workspaceLines = [
    hostnames.length > 0 ? `- Hostnames: ${hostnames.join(", ")}` : null,
    publishableKey
      ? `- Publishable key (client-side): ${publishableKey}`
      : null,
    `- Analytics script: ${getAnalyticsScriptUrl({
      siteVisitEnabled,
      outboundEnabled,
      conversionEnabled,
    })}`,
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
    "Use the workspace values above. Do not invent a different publishable key or hostname.",
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
      conversionEnabled: input.conversionEnabled,
    }),
  };
}
