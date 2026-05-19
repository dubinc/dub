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
import { RewardActivityRenderer } from "./action-renderers/reward-activity-renderer";
import { SubmittedLeadCreatedRenderer } from "./action-renderers/submitted-lead-created-renderer";
import { SubmittedLeadStatusChangedRenderer } from "./action-renderers/submitted-lead-status-changed-renderer";

export type ActorType = "USER" | "SYSTEM";

type ActivityLogRenderer = (props: { log: ActivityLog }) => ReactNode;

export function getActorType(log: ActivityLog): ActorType {
  return log.user ? "USER" : "SYSTEM";
}

const ACTIVITY_LOG_ICONS: Partial<
  Record<ActivityLogAction, ComponentType<{ className?: string }>>
> = {
  "partner.groupChanged": UserArrowRight,

  "submittedLead.created": FileSend,
  "submittedLead.qualified": UserClock,
  "submittedLead.meeting": UserClock,
  "submittedLead.negotiation": UserClock,
  "submittedLead.unqualified": UserClock,
  "submittedLead.closedWon": UserClock,
  "submittedLead.closedLost": UserClock,

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
    action: "submittedLead.created",
    renderer: SubmittedLeadCreatedRenderer,
  },
  ...(
    [
      "submittedLead.qualified",
      "submittedLead.meeting",
      "submittedLead.negotiation",
      "submittedLead.unqualified",
      "submittedLead.closedWon",
      "submittedLead.closedLost",
    ] as const
  ).map((action) => ({
    action,
    renderer: SubmittedLeadStatusChangedRenderer,
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
