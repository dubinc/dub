import type { GroupMoveRules } from "@/lib/api/workflows/move-group/types";
import { groupRulesSchema } from "@/lib/zod/schemas/groups";
import * as z from "zod/v4";
import { WorkflowCondition } from "../workflows/types";

export const findGroupsWithMatchingRules = ({
  groups,
  currentRules,
  currentGroupId,
}: {
  groups: z.infer<typeof groupRulesSchema>;
  currentRules: GroupMoveRules | null | undefined;
  currentGroupId: string;
}): Array<{ id: string; name: string }> => {
  if (
    !currentRules ||
    currentRules.length === 0 ||
    !groups ||
    groups.length === 0
  ) {
    return [];
  }

  return groups
    .filter(
      (group) =>
        group.id !== currentGroupId &&
        group.moveRules &&
        group.moveRules.length > 0 &&
        doRuleSetsOverlap(currentRules, group.moveRules),
    )
    .map((group) => ({ id: group.id, name: group.name }));
};

// Two rule sets conflict if there exists ANY set of attribute values that would satisfy both simultaneously.
// This ensures that for any given set of attribute values, at most one group rule set will match.
const doRuleSetsOverlap = (
  rules1: GroupMoveRules,
  rules2: GroupMoveRules,
): boolean => {
  const rules1ByAttribute = new Map<string, WorkflowCondition>();
  for (const rule of rules1) {
    rules1ByAttribute.set(rule.attribute, rule);
  }

  const rules2ByAttribute = new Map<string, WorkflowCondition>();
  for (const rule of rules2) {
    rules2ByAttribute.set(rule.attribute, rule);
  }

  const partnerGroup1 = rules1ByAttribute.get("partnerGroup");
  const partnerGroup2 = rules2ByAttribute.get("partnerGroup");

  if (partnerGroup1 && partnerGroup2) {
    const partnerGroupOverlap = doPartnerGroupConditionsOverlap(
      partnerGroup1,
      partnerGroup2,
    );

    // Disjoint eq/in partner-group filters cannot both match the same partner.
    if (partnerGroupOverlap === false) {
      return false;
    }
  }

  // Get all metric attributes that appear in BOTH rule sets (intersection).
  const sharedAttributes = Array.from(rules1ByAttribute.keys()).filter(
    (attr) => attr !== "partnerGroup" && rules2ByAttribute.has(attr),
  );

  // If there are no shared attributes, the rule sets cannot conflict
  // (e.g., one checks conversions, the other checks leads - they're independent)
  if (sharedAttributes.length === 0) {
    return false;
  }

  // For rule sets to conflict, ALL shared attributes must overlap
  // This means there exists a set of values that satisfies both rule sets
  for (const attribute of sharedAttributes) {
    const condition1 = rules1ByAttribute.get(attribute);
    const condition2 = rules2ByAttribute.get(attribute);

    if (!condition1 || !condition2) {
      return false;
    }

    // If any shared attribute doesn't overlap, the rule sets cannot both match
    if (!doConditionsOverlap(condition1, condition2)) {
      return false;
    }
  }

  return true;
};

const partnerGroupConditionToIdSet = (
  condition: WorkflowCondition,
): Set<string> | null => {
  if (condition.attribute !== "partnerGroup") {
    return null;
  }

  switch (condition.operator) {
    case "eq":
      if (typeof condition.value === "string") {
        return new Set([condition.value]);
      }
      return null;

    case "in":
      if (Array.isArray(condition.value)) {
        return new Set(condition.value);
      }
      return null;

    default:
      return null;
  }
};

const doPartnerGroupConditionsOverlap = (
  condition1: WorkflowCondition,
  condition2: WorkflowCondition,
): boolean | null => {
  const ids1 = partnerGroupConditionToIdSet(condition1);
  const ids2 = partnerGroupConditionToIdSet(condition2);

  if (!ids1 || !ids2) {
    return null;
  }

  for (const id of ids1) {
    if (ids2.has(id)) {
      return true;
    }
  }

  return false;
};

const conditionToInterval = (
  condition: WorkflowCondition,
): { min: number; max: number } | null => {
  switch (condition.operator) {
    case "gte":
      if (typeof condition.value === "number") {
        return {
          min: condition.value,
          max: Number.POSITIVE_INFINITY,
        };
      }
      return null;

    case "between":
      if (
        typeof condition.value === "object" &&
        condition.value !== null &&
        !Array.isArray(condition.value)
      ) {
        const { min, max } = condition.value;

        if (typeof min !== "number" || typeof max !== "number") {
          return null;
        }

        return { min, max };
      }
      return null;

    default:
      return null;
  }
};

const doConditionsOverlap = (
  condition1: WorkflowCondition,
  condition2: WorkflowCondition,
): boolean => {
  // Conditions must be for the same attribute to overlap
  if (condition1.attribute !== condition2.attribute) {
    return false;
  }

  const interval1 = conditionToInterval(condition1);
  const interval2 = conditionToInterval(condition2);

  if (!interval1 || !interval2) {
    return false;
  }

  return interval1.min <= interval2.max && interval2.min <= interval1.max;
};
