import { WorkflowCondition } from "@/lib/types";

export const validateGroupMoveRules = (rules?: WorkflowCondition[]) => {
  if (!rules || rules.length === 0) {
    return;
  }

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];

    // Check if attribute is selected
    if (!rule.attribute) {
      throw new Error(`Rule ${i + 1}: Please select an activity.`);
    }

    // Check if value is set
    if (rule.value == null || rule.value === undefined) {
      throw new Error(`Rule ${i + 1}: Please enter a value.`);
    }

    // For gte operator, value should be a number greater than 0
    if (rule.operator === "gte") {
      if (
        typeof rule.value !== "number" ||
        isNaN(rule.value) ||
        rule.value <= 0
      ) {
        throw new Error(`Rule ${i + 1}: Please enter a value greater than 0.`);
      }
    }

    // For between operator, check min and max
    if (rule.operator === "between") {
      if (typeof rule.value !== "object" || rule.value === null) {
        throw new Error(`Rule ${i + 1}: Please enter a valid value.`);
      }

      const min = rule.value.min;
      const max = rule.value.max;

      if (min == null || min === undefined || isNaN(min) || min <= 0) {
        throw new Error(
          `Rule ${i + 1}: Please enter a minimum value greater than 0.`,
        );
      }

      if (max == null || max === undefined || isNaN(max) || max <= 0) {
        throw new Error(
          `Rule ${i + 1}: Please enter a maximum value (limit) greater than 0.`,
        );
      }

      // Ensure max is greater than min
      if (max <= min) {
        throw new Error(
          `Rule ${i + 1}: Maximum value must be greater than minimum value.`,
        );
      }
    }
  }
};
