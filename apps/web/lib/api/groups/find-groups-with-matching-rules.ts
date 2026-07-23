import { WorkflowCondition } from "@/lib/types";
import { groupRulesSchema } from "@/lib/zod/schemas/groups";
import * as z from "zod/v4";

export const findGroupsWithMatchingRules = ({
  groups,
  currentRules,
  currentGroupId,
}: {
  groups: z.infer<typeof groupRulesSchema>;
  currentRules: WorkflowCondition[] | null | undefined;
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
  rules1: WorkflowCondition[],
  rules2: WorkflowCondition[],
): boolean => {
  const rules1ByAttribute = new Map<string, WorkflowCondition>();
  for (const rule of rules1) {
    rules1ByAttribute.set(rule.attribute, rule);
  }

  const rules2ByAttribute = new Map<string, WorkflowCondition>();
  for (const rule of rules2) {
    rules2ByAttribute.set(rule.attribute, rule);
  }

  // Get all attributes that appear in BOTH rule sets (intersection)
  const sharedAttributes = Array.from(rules1ByAttribute.keys()).filter((attr) =>
    rules2ByAttribute.has(attr),
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
        return {
          min: condition.value.min,
          max: condition.value.max,
        };
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

  if (condition1.attribute === "groupId") {
    return doGroupConditionsOverlap(condition1, condition2);
  }

  const interval1 = conditionToInterval(condition1);
  const interval2 = conditionToInterval(condition2);

  if (!interval1 || !interval2) {
    return false;
  }

  return interval1.min <= interval2.max && interval2.min <= interval1.max;
};

// Normalize a group condition to either an allowed set (is / is one of)
// or an excluded set (is not / is not one of) of group IDs
const conditionToGroupSet = (
  condition: WorkflowCondition,
): { mode: "include" | "exclude"; groupIds: string[] } | null => {
  const groupIds = Array.isArray(condition.value)
    ? condition.value
    : typeof condition.value === "string"
      ? [condition.value]
      : null;

  if (!groupIds) {
    return null;
  }

  switch (condition.operator) {
    case "equals_to":
    case "in":
      return { mode: "include", groupIds };
    case "not_equals":
    case "not_in":
      return { mode: "exclude", groupIds };
    default:
      return null;
  }
};

// Two group conditions overlap if there exists a group that satisfies both
const doGroupConditionsOverlap = (
  condition1: WorkflowCondition,
  condition2: WorkflowCondition,
): boolean => {
  const set1 = conditionToGroupSet(condition1);
  const set2 = conditionToGroupSet(condition2);

  if (!set1 || !set2) {
    return false;
  }

  if (set1.mode === "include" && set2.mode === "include") {
    return set1.groupIds.some((id) => set2.groupIds.includes(id));
  }

  if (set1.mode === "include") {
    return set1.groupIds.some((id) => !set2.groupIds.includes(id));
  }

  if (set2.mode === "include") {
    return set2.groupIds.some((id) => !set1.groupIds.includes(id));
  }

  // Both are exclusions: any group outside both excluded sets satisfies both
  return true;
};
