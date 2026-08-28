import { StackItem, stackItems } from "@/ui/guides/integrations";

const ANALYTICS_SCRIPT_BASE = "https://www.dubcdn.com/analytics/script.js";

const REACT_PACKAGE_LINE =
  "Use the @dub/analytics package with this workspace's publishable key. Do not add the Dub script tag unless a guide says to.";

const KEY_PRESENT_FOOTER =
  "Use the workspace values above. Do not invent a different publishable key or hostname.";

const KEY_MISSING_FOOTER =
  "Generate a publishable key in Tracking settings before tracking conversion events. Do not invent a key.";

const ATTRIBUTION_URL = "https://dub.co/docs/concepts/attribution";
const SERVER_TRACKING_URL = "https://dub.co/docs/quickstart/server";
const CLIENT_TRACKING_URL = "https://dub.co/docs/quickstart/client";

type IntegrationSlot = {
  id: string;
  title: string;
  url: string;
  stackIds: string[];
};

const INTEGRATION_SLOTS: IntegrationSlot[] = [
  {
    id: "stripe",
    title: "Stripe",
    url: "https://dub.co/docs/integrations/stripe",
    stackIds: ["stripe-checkout", "stripe-payment-links", "stripe-customers"],
  },
  {
    id: "shopify",
    title: "Shopify",
    url: "https://dub.co/docs/integrations/shopify",
    stackIds: ["shopify"],
  },
  {
    id: "gtm",
    title: "Google Tag Manager",
    url: "https://dub.co/docs/integrations/google-tag-manager",
    stackIds: ["gtm"],
  },
  {
    id: "segment",
    title: "Segment",
    url: "https://dub.co/docs/integrations/segment",
    stackIds: ["segment"],
  },
];

type TrackingSetupStepType = "attribution" | "tracking" | "integration";

export type TrackingSetupStep = {
  type: TrackingSetupStepType;
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

function toDocUrl(step: TrackingSetupStep) {
  return step.url.replace(/^https:\/\//, "");
}

function resolveIntegrationSteps(stack: string[]): TrackingSetupStep[] {
  const seen = new Set<string>();
  const steps: TrackingSetupStep[] = [];

  for (const id of stack) {
    const slot = INTEGRATION_SLOTS.find((item) => item.stackIds.includes(id));
    if (!slot || seen.has(slot.id)) {
      continue;
    }

    seen.add(slot.id);
    const item = stackItems.find((stackItem) => stackItem.id === id);

    steps.push({
      type: "integration",
      label: slot.title,
      url: slot.url,
      guideKey: slot.id,
      icon: item?.icon ?? null,
      iconProps: item?.iconProps,
    });
  }

  return steps;
}

function resolveTrackingSetupSteps({
  stack,
  publishableKey,
}: Pick<
  BuildTrackingSetupInput,
  "stack" | "publishableKey"
>): TrackingSetupStep[] {
  const trackingUrl = publishableKey
    ? CLIENT_TRACKING_URL
    : SERVER_TRACKING_URL;
  const trackingLabel = publishableKey
    ? "Client-side tracking"
    : "Server-side tracking";

  return [
    {
      type: "attribution",
      label: "Attribution",
      url: ATTRIBUTION_URL,
      guideKey: null,
      icon: null,
    },
    {
      type: "tracking",
      label: trackingLabel,
      url: trackingUrl,
      guideKey: null,
      icon: null,
    },
    ...resolveIntegrationSteps(stack),
  ];
}

function composeTrackingSetupPrompt({
  steps,
  stack,
  hostnames,
  publishableKey,
  siteVisitEnabled,
  outboundEnabled,
}: {
  steps: TrackingSetupStep[];
} & BuildTrackingSetupInput) {
  const reactSelected = stack.includes("react");
  const scriptSegments = [
    siteVisitEnabled ? "site-visit" : null,
    outboundEnabled ? "outbound-domains" : null,
    publishableKey ? "conversion-tracking" : null,
  ].filter(Boolean);
  const analyticsScriptUrl =
    scriptSegments.length === 0
      ? ANALYTICS_SCRIPT_BASE
      : `https://www.dubcdn.com/analytics/script.${scriptSegments.join(".")}.js`;
  const stackTitles = stack
    .map((id) => stackItems.find((item) => item.id === id)?.title)
    .filter((title): title is string => Boolean(title));
  const workspaceLines = [
    hostnames.length > 0 ? `- Hostnames: ${hostnames.join(", ")}` : null,
    publishableKey
      ? `- Publishable key (client-side): ${publishableKey}`
      : null,
    stackTitles.length > 0 ? `- Stack: ${stackTitles.join(", ")}` : null,
    reactSelected ? null : `- Analytics script: ${analyticsScriptUrl}`,
  ].filter(Boolean);

  return [
    "Help me set up conversion tracking with Dub.co by referencing the following articles (and the linked articles within them):",
    "",
    ...steps.map((step) => `- ${toDocUrl(step)}`),
    "",
    "Workspace:",
    ...workspaceLines,
    ...(reactSelected ? ["", REACT_PACKAGE_LINE] : []),
    "",
    "Make sure to tailor the implementation to my existing tech stack, and leverage server-side tracking if possible for the most accurate results.",
    "",
    publishableKey ? KEY_PRESENT_FOOTER : KEY_MISSING_FOOTER,
  ].join("\n");
}

export function buildTrackingSetup(
  input: BuildTrackingSetupInput,
): TrackingSetup {
  const steps = resolveTrackingSetupSteps({
    stack: input.stack,
    publishableKey: input.publishableKey,
  });

  return {
    steps,
    prompt: composeTrackingSetupPrompt({
      steps,
      ...input,
    }),
  };
}
