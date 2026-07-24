import type * as z from "zod/v4";

import type { GROUP_MOVE_ATTRIBUTES, groupMoveRulesSchema } from "./schema";

export type GroupMoveRules = z.infer<typeof groupMoveRulesSchema>;

export type GroupMoveCondition = GroupMoveRules[number];

export type GroupMoveAttributeKey = keyof typeof GROUP_MOVE_ATTRIBUTES;

export type GroupMoveAttribute =
  (typeof GROUP_MOVE_ATTRIBUTES)[GroupMoveAttributeKey];
