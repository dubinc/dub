import { ActivityLog } from "@/lib/types";
import { ActivityLogAction } from "@/lib/zod/schemas/activity-log";
import { CircleInfo, UserArrowRight } from "@dub/ui";
import { FileText } from "lucide-react";
import { ComponentType, ReactNode } from "react";
import { PartnerGroupChangedRenderer } from "./action-renderes/partner-group-changed-renderer";
import { ReferralCreatedRenderer } from "./action-renderes/referral-created-renderer";
import { ReferralStatusChangedRenderer } from "./action-renderes/referral-status-changed-renderer";

export type ActorType = "USER" | "SYSTEM";

export interface FieldDiff<T = unknown> {
  old: T | null;
  new: T | null;
}

type ActivityLogRenderer = (props: { log: ActivityLog }) => ReactNode;

export function getActorType(log: ActivityLog): ActorType {
  return log.user ? "USER" : "SYSTEM";
}

const ACTIVITY_LOG_ICONS: Partial<
  Record<ActivityLogAction, ComponentType<{ className?: string }>>
> = {
  "partner.groupChanged": UserArrowRight,
  "referral.created": FileText,
  "referral.qualified": UserArrowRight,
  "referral.meeting": UserArrowRight,
  "referral.negotiation": UserArrowRight,
  "referral.unqualified": UserArrowRight,
  "referral.closedWon": UserArrowRight,
  "referral.closedLost": UserArrowRight,
};

const ACTIVITY_LOG_REGISTRY: Array<{
  action: ActivityLogAction;
  renderer: ActivityLogRenderer;
}> = [
  {
    action: "partner.groupChanged",
    renderer: PartnerGroupChangedRenderer,
  },
  {
    action: "referral.created",
    renderer: ReferralCreatedRenderer,
  },
  ...(
    [
      "referral.qualified",
      "referral.meeting",
      "referral.negotiation",
      "referral.unqualified",
      "referral.closedWon",
      "referral.closedLost",
    ] as const
  ).map((action) => ({
    action,
    renderer: ReferralStatusChangedRenderer,
  })),
];

const renderers = new Map(
  ACTIVITY_LOG_REGISTRY.map(({ action, renderer }) => [action, renderer]),
);

export function getActivityLogRenderer(
  action: ActivityLogAction,
): ActivityLogRenderer | null {
  return renderers.get(action) ?? null;
}

export function getActivityLogIcon(log: ActivityLog): ReactNode {
  const Icon = ACTIVITY_LOG_ICONS[log.action];

  if (Icon) {
    return <Icon className="size-5 text-neutral-500" />;
  }

  return <CircleInfo className="size-5 text-neutral-400" />;
}
