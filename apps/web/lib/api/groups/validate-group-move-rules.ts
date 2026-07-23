import { COMPARISON_OPERATORS } from "@/lib/api/workflows/operators";
import { prisma } from "@/lib/prisma";
import {
  GROUP_MOVE_ATTRIBUTE_CONFIG,
  GROUP_MOVE_OPERATOR_LABELS,
  GROUP_MOVE_PERFORMANCE_ATTRIBUTES,
  GroupMoveAttribute,
  type GroupMoveCondition,
  type GroupMoveRules,
} from "@/lib/zod/schemas/group-move-workflows";

type GroupMoveAttributeValidator = (params: {
  rule: GroupMoveCondition;
  ruleIndex: number;
  destinationGroupId: string;
  programId: string;
}) => void | Promise<void>;

const PERFORMANCE_ATTRIBUTES = new Set<string>(
  GROUP_MOVE_PERFORMANCE_ATTRIBUTES,
);

// Add business rules for each attribute
const GROUP_MOVE_ATTRIBUTE_VALIDATORS: Record<
  GroupMoveAttribute,
  GroupMoveAttributeValidator
> = {
  // Operator validators already cover performance value shape/constraints.
  totalLeads: () => {},
  totalConversions: () => {},
  totalSaleAmount: () => {},
  totalCommissions: () => {},

  fromPartnerGroup: async ({
    rule,
    ruleIndex,
    destinationGroupId,
    programId,
  }) => {
    const groupIds =
      typeof rule.value === "string"
        ? [rule.value]
        : Array.isArray(rule.value)
          ? rule.value
          : [];

    if (groupIds.includes(destinationGroupId)) {
      throw new Error(
        `Rule ${ruleIndex + 1}: Source group cannot be the same as the destination group.`,
      );
    }

    if (groupIds.length === 0) {
      return;
    }

    const partnerGroups = await prisma.partnerGroup.findMany({
      where: {
        programId,
        id: {
          in: groupIds,
        },
      },
      select: {
        id: true,
      },
    });

    const validGroupIds = new Set(partnerGroups.map((group) => group.id));
    const invalidGroupIds = groupIds.filter((id) => !validGroupIds.has(id));

    if (invalidGroupIds.length > 0) {
      throw new Error(
        `Rule ${ruleIndex + 1}: One or more selected groups do not exist.`,
      );
    }
  },
};

export const validateGroupMoveRules = async ({
  rules,
  destinationGroupId,
  programId,
}: {
  rules?: GroupMoveRules;
  destinationGroupId: string;
  programId: string;
}) => {
  if (!rules || rules.length === 0) {
    return;
  }

  const performanceRules = rules.filter((rule) =>
    PERFORMANCE_ATTRIBUTES.has(rule.attribute),
  );

  const fromPartnerGroupRules = rules.filter(
    (rule) => rule.attribute === "fromPartnerGroup",
  );

  if (fromPartnerGroupRules.length > 0 && performanceRules.length === 0) {
    throw new Error(
      "A performance condition is required to use a partner group condition.",
    );
  }

  if (fromPartnerGroupRules.length > 1) {
    throw new Error("Only one partner group condition is allowed.");
  }

  for (let i = 0; i < rules.length; i++) {
    await validateRule({
      rule: rules[i],
      ruleIndex: i,
      destinationGroupId,
      programId,
    });
  }
};

// Validates a single group move rule
const validateRule = async ({
  rule,
  ruleIndex,
  destinationGroupId,
  programId,
}: {
  rule: GroupMoveCondition;
  ruleIndex: number;
  destinationGroupId: string;
  programId: string;
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
  await GROUP_MOVE_ATTRIBUTE_VALIDATORS[rule.attribute]({
    rule,
    ruleIndex,
    destinationGroupId,
    programId,
  });
};
