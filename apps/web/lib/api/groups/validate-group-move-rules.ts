import {
  GROUP_MOVE_ATTRIBUTE_CONFIG,
  GROUP_MOVE_ATTRIBUTE_VALIDATORS,
  GROUP_MOVE_OPERATOR_LABELS,
  GROUP_MOVE_OPERATOR_VALIDATORS,
  type GroupMoveCondition,
  type GroupMoveRules,
} from "@/lib/zod/schemas/group-move-workflows";

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
  const validateOperator =
    GROUP_MOVE_OPERATOR_VALIDATORS[
      rule.operator as keyof typeof GROUP_MOVE_OPERATOR_VALIDATORS
    ];

  if (validateOperator) {
    validateOperator(rule, ruleIndex);
  }

  // Validate attribute-specific constraints (business rules)
  GROUP_MOVE_ATTRIBUTE_VALIDATORS[rule.attribute]({
    rule,
    ruleIndex,
    destinationGroupId,
  });
};
