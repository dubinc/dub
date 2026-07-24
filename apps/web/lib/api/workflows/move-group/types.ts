import type * as z from "zod/v4";

import type {
  GROUP_MOVE_ATTRIBUTES,
  GROUP_MOVE_OPERATORS,
  groupMoveConditionSchema,
  groupMoveRulesSchema,
} from "./schema";

export type GroupMoveCondition = z.infer<typeof groupMoveConditionSchema>;

export type GroupMoveRules = z.infer<typeof groupMoveRulesSchema>;

export type GroupMoveAttribute = (typeof GROUP_MOVE_ATTRIBUTES)[number];

type GroupMoveOperator = (typeof GROUP_MOVE_OPERATORS)[number];

export type GroupMoveAttributeConfig = {
  label: string;
  inputType: "number" | "currency";
  operators: readonly GroupMoveOperator[];
};
