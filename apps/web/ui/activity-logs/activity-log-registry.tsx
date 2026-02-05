import { ActivityLog } from "@/lib/types";
import { ActivityLogAction } from "@/lib/zod/schemas/activity-log";
import { CircleInfo, UserArrowRight } from "@dub/ui";
import { ReactNode } from "react";
import { PartnerGroupChangedRenderer } from "./partner-group-changed-renderer";
import { ReferralStatusChangedRenderer } from "./referral-status-changed-renderer";

export type ActorType = "USER" | "SYSTEM";

export interface FieldDiff<T = unknown> {
  old: T | null;
  new: T | null;
}

type ActivityLogRenderer = (props: { log: ActivityLog }) => ReactNode;

type ActivityLogIconResolver = (log: ActivityLog) => ReactNode;

export function getActorType(log: ActivityLog): ActorType {
  return log.user ? "USER" : "SYSTEM";
}

const partnerGroupChangedIcon: ActivityLogIconResolver = () => (
  <UserArrowRight className="size-5 text-neutral-500" />
);

const referralStatusChangedIcon: ActivityLogIconResolver = () => (
  <UserArrowRight className="size-5 text-neutral-500" />
);

const defaultIcon: ActivityLogIconResolver = () => (
  <CircleInfo className="size-5 text-neutral-400" />
);

const ACTIVITY_LOG_REGISTRY: Array<{
  action: ActivityLogAction;
  renderer: ActivityLogRenderer;
  icon: ActivityLogIconResolver;
}> = [
  {
    action: "partner.groupChanged",
    renderer: PartnerGroupChangedRenderer,
    icon: partnerGroupChangedIcon,
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
    icon: referralStatusChangedIcon,
  })),
];

const renderers = new Map(
  ACTIVITY_LOG_REGISTRY.map(({ action, renderer }) => [action, renderer]),
);

const icons = new Map(
  ACTIVITY_LOG_REGISTRY.map(({ action, icon }) => [action, icon]),
);

export function getActivityLogRenderer(
  action: ActivityLogAction,
): ActivityLogRenderer | null {
  return renderers.get(action) ?? null;
}

export function getActivityLogIcon(log: ActivityLog): ReactNode {
  const resolver = icons.get(log.action);
  return resolver ? resolver(log) : defaultIcon(log);
}
