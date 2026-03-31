import { ActivityLog, ActivityLogAction } from "@/lib/types";
import {
  CircleInfo,
  FileSend,
  MoneyBill2,
  Pen2,
  UserArrowRight,
  UserClock,
} from "@dub/ui";
import { CircleMinus, CirclePlusIcon } from "lucide-react";
import { ComponentType, ReactNode } from "react";
import { PartnerGroupChangedRenderer } from "./action-renderers/partner-group-changed-renderer";
import { ReferralCreatedRenderer } from "./action-renderers/referral-created-renderer";
import { ReferralStatusChangedRenderer } from "./action-renderers/referral-status-changed-renderer";
import { RewardActivityRenderer } from "./action-renderers/reward-activity-renderer";

export type ActorType = "USER" | "SYSTEM";

type ActivityLogRenderer = (props: { log: ActivityLog }) => ReactNode;

export function getActorType(log: ActivityLog): ActorType {
  return log.user ? "USER" : "SYSTEM";
}

const ACTIVITY_LOG_ICONS: Partial<
  Record<ActivityLogAction, ComponentType<{ className?: string }>>
> = {
  "partner.groupChanged": UserArrowRight,

  "referral.created": FileSend,
  "referral.qualified": UserClock,
  "referral.meeting": UserClock,
  "referral.negotiation": UserClock,
  "referral.unqualified": UserClock,
  "referral.closedWon": UserClock,
  "referral.closedLost": UserClock,

  "reward.created": MoneyBill2,
  "reward.updated": Pen2,
  "reward.deleted": CircleMinus,
  "reward.conditionAdded": CirclePlusIcon,
  "reward.conditionRemoved": CircleMinus,
  "reward.conditionUpdated": Pen2,
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
  ...(
    [
      "reward.created",
      "reward.updated",
      "reward.deleted",
      "reward.conditionAdded",
      "reward.conditionRemoved",
      "reward.conditionUpdated",
    ] as const
  ).map((action) => ({
    action,
    renderer: RewardActivityRenderer,
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
    return <Icon className="size-4 text-neutral-600" />;
  }

  return <CircleInfo className="size-4 text-neutral-400" />;
}
