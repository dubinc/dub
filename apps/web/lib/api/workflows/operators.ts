import { WorkflowComparisonOperator } from "@/lib/types";

type ConditionValue =
  | number
  | string
  | string[]
  | { min: number; max?: number };

type ComparisonOperator = {
  validate: (value: ConditionValue) => void;
  evaluate: (
    attributeValue: number | string,
    conditionValue: ConditionValue,
  ) => boolean;
};

export const COMPARISON_OPERATORS: Record<
  WorkflowComparisonOperator,
  ComparisonOperator
> = {
  // Greater than or equal to
  gte: {
    validate(value) {
      if (typeof value !== "number" || isNaN(value) || value <= 0) {
        throw new Error("Please enter a value greater than 0.");
      }
    },
    evaluate(attributeValue, conditionValue) {
      if (
        typeof attributeValue !== "number" ||
        typeof conditionValue !== "number"
      ) {
        return false;
      }

      return attributeValue >= conditionValue;
    },
  },

  // Between (inclusive)
  between: {
    validate(value) {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error("Please enter a valid value.");
      }

      const min = value.min;
      const max = value.max;

      if (min == null || min === undefined || isNaN(min) || min <= 0) {
        throw new Error("Please enter a minimum value greater than 0.");
      }

      if (max == null || max === undefined || isNaN(max) || max <= 0) {
        throw new Error("Please enter a maximum value (limit) greater than 0.");
      }

      if (max <= min) {
        throw new Error("Maximum value must be greater than minimum value.");
      }
    },
    evaluate(attributeValue, conditionValue) {
      if (
        typeof attributeValue !== "number" ||
        typeof conditionValue !== "object" ||
        conditionValue === null ||
        Array.isArray(conditionValue)
      ) {
        return false;
      }

      const { min, max } = conditionValue;

      if (min == null || max == null) {
        return false;
      }

      return attributeValue >= min && attributeValue <= max;
    },
  },

  // Equals (string)
  equals_to: {
    validate(value) {
      if (typeof value !== "string" || !value) {
        throw new Error("Please select a group.");
      }
    },
    evaluate(attributeValue, conditionValue) {
      if (typeof conditionValue !== "string") {
        return false;
      }

      return attributeValue === conditionValue;
    },
  },

  // Not equals (string)
  not_equals: {
    validate(value) {
      if (typeof value !== "string" || !value) {
        throw new Error("Please select a group.");
      }
    },
    evaluate(attributeValue, conditionValue) {
      if (typeof conditionValue !== "string") {
        return false;
      }

      return attributeValue !== conditionValue;
    },
  },

  // In (string array)
  in: {
    validate(value) {
      if (
        !Array.isArray(value) ||
        value.length === 0 ||
        value.some((id) => !id)
      ) {
        throw new Error("Please select at least one group.");
      }
    },
    evaluate(attributeValue, conditionValue) {
      if (!Array.isArray(conditionValue)) {
        return false;
      }

      return conditionValue.includes(attributeValue as string);
    },
  },

  // Not in (string array)
  not_in: {
    validate(value) {
      if (
        !Array.isArray(value) ||
        value.length === 0 ||
        value.some((id) => !id)
      ) {
        throw new Error("Please select at least one group.");
      }
    },
    evaluate(attributeValue, conditionValue) {
      if (!Array.isArray(conditionValue)) {
        return false;
      }

      return !conditionValue.includes(attributeValue as string);
    },
  },
};
