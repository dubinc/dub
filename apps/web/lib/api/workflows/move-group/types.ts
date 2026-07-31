import type { WorkflowCondition } from "@/lib/api/workflows/types";
import type { GROUP_MOVE_ATTRIBUTES } from "./schema";

export type GroupMoveRules = WorkflowCondition[];

export type GroupMoveAttributeKey = keyof typeof GROUP_MOVE_ATTRIBUTES;

export type GroupMoveAttribute =
  (typeof GROUP_MOVE_ATTRIBUTES)[GroupMoveAttributeKey];
