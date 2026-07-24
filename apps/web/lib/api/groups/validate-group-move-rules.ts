import {
  GROUP_MOVE_ATTRIBUTE_CONFIG,
  GROUP_MOVE_OPERATOR_LABELS,
} from "@/lib/api/workflows/move-group/schema";
import type {
  GroupMoveAttribute,
  GroupMoveCondition,
  GroupMoveRules,
} from "@/lib/api/workflows/move-group/types";
import { COMPARISON_OPERATORS } from "@/lib/api/workflows/operators";

type GroupMoveAttributeValidator = (params: {
  rule: GroupMoveCondition;
  ruleIndex: number;
  destinationGroupId: string;
}) => void;

// Add business rules for each attribute
// NOTE: Keeping this empty for now, next PR will use this
const GROUP_MOVE_ATTRIBUTE_VALIDATORS: Record<
  GroupMoveAttribute,
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
  const allowedOperators = GROUP_MOVE_ATTRIBUTE_CONFIG[rule.attribute]
    .operators as readonly string[];

  const operatorLabel = GROUP_MOVE_OPERATOR_LABELS[rule.operator];

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
  const operator = COMPARISON_OPERATORS[rule.operator];

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
