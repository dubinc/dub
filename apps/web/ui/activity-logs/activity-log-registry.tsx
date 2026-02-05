import { ActivityLog } from "@/lib/types";
import { ActivityLogAction } from "@/lib/zod/schemas/activity-log";
import { CircleInfo, UserArrowRight } from "@dub/ui";
import { ReactNode } from "react";
import { FallbackRenderer } from "./fallback-renderer";
import { PartnerGroupChangedRenderer } from "./partner-group-changed-renderer";

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

const defaultIcon: ActivityLogIconResolver = () => (
  <CircleInfo className="size-5 text-neutral-400" />
);

const renderers = new Map<ActivityLogAction, ActivityLogRenderer>([
  ["partner.groupChanged", PartnerGroupChangedRenderer],
]);

const icons = new Map<ActivityLogAction, ActivityLogIconResolver>([
  ["partner.groupChanged", partnerGroupChangedIcon],
]);

export function getActivityLogRenderer(
  action: ActivityLogAction,
): ActivityLogRenderer {
  return renderers.get(action) ?? FallbackRenderer;
}

export function getActivityLogIcon(log: ActivityLog): ReactNode {
  const resolver = icons.get(log.action);
  return resolver ? resolver(log) : defaultIcon(log);
}
