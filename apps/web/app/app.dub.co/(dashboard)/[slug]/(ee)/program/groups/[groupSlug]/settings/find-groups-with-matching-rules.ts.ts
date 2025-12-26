import { GroupProps, WorkflowCondition } from "@/lib/types";

export const findGroupsWithMatchingRules = ({
  groups,
  currentRules,
  currentGroupId,
}: {
  groups: Pick<GroupProps, "id" | "name" | "moveRules">[];
  currentRules: WorkflowCondition[] | null | undefined;
  currentGroupId: string;
}): Array<{ id: string; name: string }> => {
  if (!currentRules || currentRules.length === 0) {
    return [];
  }

  return groups
    .filter(
      (group) =>
        group.id !== currentGroupId &&
        group.moveRules &&
        group.moveRules.length > 0 &&
        areRuleSetsEqual(currentRules, group.moveRules),
    )
    .map((group) => ({ id: group.id, name: group.name }));
};

const areRulesEqual = (
  rule1: WorkflowCondition,
  rule2: WorkflowCondition,
): boolean => {
  if (rule1.attribute !== rule2.attribute) return false;
  if (rule1.operator !== rule2.operator) return false;

  // Compare values
  if (typeof rule1.value === "number" && typeof rule2.value === "number") {
    return rule1.value === rule2.value;
  }

  if (
    typeof rule1.value === "object" &&
    typeof rule2.value === "object" &&
    rule1.value !== null &&
    rule2.value !== null
  ) {
    return (
      rule1.value.min === rule2.value.min && rule1.value.max === rule2.value.max
    );
  }

  return false;
};

const areRuleSetsEqual = (
  rules1: WorkflowCondition[],
  rules2: WorkflowCondition[],
): boolean => {
  if (rules1.length !== rules2.length) return false;

  // Sort rules by attribute for comparison
  const sorted1 = [...rules1].sort((a, b) =>
    (a.attribute || "").localeCompare(b.attribute || ""),
  );
  const sorted2 = [...rules2].sort((a, b) =>
    (a.attribute || "").localeCompare(b.attribute || ""),
  );

  return sorted1.every((rule1, index) => areRulesEqual(rule1, sorted2[index]));
};
