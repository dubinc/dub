import {
  GROUP_MOVE_ATTRIBUTES,
  GROUP_MOVE_OPERATORS,
} from "@/lib/api/workflows/move-group/schema";
import type {
  GroupMoveAttributeKey,
  GroupMoveCondition,
  GroupMoveRules,
} from "@/lib/api/workflows/move-group/types";
import { WORKFLOW_OPERATORS } from "@/lib/api/workflows/operator-definitions";

type GroupMoveAttributeValidator = (params: {
  rule: GroupMoveCondition;
  ruleIndex: number;
  destinationGroupId: string;
}) => void;

// Add business rules for each attribute
// NOTE: Keeping this empty for now, next PR will use this
const GROUP_MOVE_ATTRIBUTE_VALIDATORS: Record<
  GroupMoveAttributeKey,
  GroupMoveAttributeValidator
> = {
  // Operator validators already cover performance value shape/constraints.
  totalLeads: () => {},
  totalConversions: () => {},
  totalSaleAmount: () => {},
  totalCommissions: () => {},
};

export const validateGroupMoveRules = ({
  rules,
  destinationGroupId,
}: {
  rules?: GroupMoveRules;
  destinationGroupId: string;
}) => {
  if (!rules || rules.length === 0) {
    return;
  }

  for (let i = 0; i < rules.length; i++) {
    validateRule({
      rule: rules[i],
      ruleIndex: i,
      destinationGroupId,
    });
  }
};

// Validates a single group move rule
const validateRule = ({
  rule,
  ruleIndex,
  destinationGroupId,
}: {
  rule: GroupMoveCondition;
  ruleIndex: number;
  destinationGroupId: string;
}) => {
  if (!rule.attribute) {
    throw new Error(`Rule ${ruleIndex + 1}: Please select an activity.`);
  }

  // Check if operator is valid for the attribute
  const allowedOperators = GROUP_MOVE_ATTRIBUTES[rule.attribute]
    .operators as readonly string[];

  const operatorLabel = GROUP_MOVE_OPERATORS[rule.operator].label;

  if (!allowedOperators.includes(rule.operator)) {
    throw new Error(
      `Operator "${operatorLabel}" is not valid for the activity "${rule.attribute}".`,
    );
  }

  // Check if value is set
  if (rule.value == null || rule.value === undefined) {
    throw new Error(`Rule ${ruleIndex + 1}: Please enter a value.`);
  }

  // Validate value shape/constraints for the selected operator
  const operator = WORKFLOW_OPERATORS[rule.operator];

  if (operator) {
    try {
      operator.validate(rule.value);
    } catch (error) {
      throw new Error(
        `Rule ${ruleIndex + 1}: ${error instanceof Error ? error.message : "Invalid value."}`,
      );
    }
  }

  // Validate attribute-specific constraints (business rules)
  GROUP_MOVE_ATTRIBUTE_VALIDATORS[rule.attribute]({
    rule,
    ruleIndex,
    destinationGroupId,
  });
};
