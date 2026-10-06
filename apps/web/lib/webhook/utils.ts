import { EXTERNAL_PAYOUTS_PROGRAM_IDS } from "@/lib/constants/program";
import type { WorkspaceProps } from "@/lib/types";
import { WebhookReceiver } from "@prisma/client";
import {
  DEPRECATED_WEBHOOK_TRIGGERS,
  PROGRAM_LEVEL_WEBHOOK_TRIGGERS,
  WORKSPACE_LEVEL_WEBHOOK_TRIGGERS,
} from "./constants";
import type { WebhookTrigger } from "./types";

const webhookReceivers: Record<string, WebhookReceiver> = {
  "zapier.com": "zapier",
  "hooks.zapier.com": "zapier",
  "make.com": "make",
  "hooks.slack.com": "slack",
  "api.segment.io": "segment",
};

export const identifyWebhookReceiver = (url: string): WebhookReceiver => {
  const { hostname } = new URL(url);

  return webhookReceivers[hostname] || "user";
};

/**
 * Filters `triggers` so only one event from each legacy/current pair in
 * `DEPRECATED_WEBHOOK_TRIGGERS` is shown in the webhook picker.
 *
 * `subscribedTriggers` is the saved webhook's events:
 * - `null` (creating a new webhook): show the current event, hide the legacy one.
 * - array (editing): show both events if the webhook is already subscribed to
 *   the legacy one (so it can migrate in a single edit), otherwise show only
 *   the current event.
 * - `undefined` (saved webhook loading or failed to load): treated like `null`,
 *   so the current event is never hidden. The legacy event appears once the
 *   saved webhook is known to be subscribed to it.
 *
 * Hidden events that are already subscribed stay in the webhook's saved
 * triggers; this only affects which checkboxes are rendered.
 */
export function getVisibleWebhookTriggers(
  triggers: readonly WebhookTrigger[],
  subscribedTriggers: readonly WebhookTrigger[] | null | undefined,
): WebhookTrigger[] {
  const hiddenTriggers = new Set<WebhookTrigger>(
    [...DEPRECATED_WEBHOOK_TRIGGERS].flatMap(([legacy]) => {
      const showLegacy = subscribedTriggers?.includes(legacy) ?? false;

      return showLegacy ? [] : [legacy];
    }),
  );

  return triggers.filter((trigger) => !hiddenTriggers.has(trigger));
}

/**
 * Returns the webhook events a workspace can subscribe to in the webhook
 * picker, in display order.
 *
 * - Always includes workspace-level events.
 * - Adds program-level events when the workspace has a program;
 *   `payout.confirmed` only for programs in `EXTERNAL_PAYOUTS_PROGRAM_IDS`.
 * - When `supportedTriggers` is passed (integrations like Zapier or Slack),
 *   keeps only the events that integration supports.
 * - Applies legacy/current event visibility via `getVisibleWebhookTriggers`.
 */
export function getAvailableWebhookTriggers({
  defaultProgramId,
  subscribedTriggers,
  supportedTriggers,
}: {
  defaultProgramId: WorkspaceProps["defaultProgramId"] | undefined;
  subscribedTriggers: readonly WebhookTrigger[] | null | undefined;
  supportedTriggers?: readonly WebhookTrigger[];
}): WebhookTrigger[] {
  const programTriggers = defaultProgramId
    ? PROGRAM_LEVEL_WEBHOOK_TRIGGERS.filter(
        (trigger) =>
          trigger !== "payout.confirmed" ||
          EXTERNAL_PAYOUTS_PROGRAM_IDS.includes(defaultProgramId),
      )
    : [];

  const triggers = [...WORKSPACE_LEVEL_WEBHOOK_TRIGGERS, ...programTriggers];

  return getVisibleWebhookTriggers(
    supportedTriggers
      ? triggers.filter((trigger) => supportedTriggers.includes(trigger))
      : triggers,
    subscribedTriggers,
  );
}
