export type ConditionValue =
  | number
  | { min: number; max?: number }
  | string
  | string[];

type WorkflowOperator = {
  name: string;
  label: string;
  validate: (value: ConditionValue) => void;
  evaluate: (
    attributeValue: number | string,
    conditionValue: ConditionValue,
  ) => boolean;
};

export const WORKFLOW_OPERATORS = {
  // Greater than or equal to
  gte: {
    name: "gte",
    label: "at least",
    validate(value: ConditionValue) {
      if (typeof value !== "number" || isNaN(value) || value < 0) {
        throw new Error("Please enter a value greater than or equal to 0.");
      }
    },
    evaluate(attributeValue: number | string, conditionValue: ConditionValue) {
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
    name: "between",
    label: "between",
    validate(value: ConditionValue) {
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
    evaluate(attributeValue: number | string, conditionValue: ConditionValue) {
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

  // Equality (string)
  eq: {
    name: "eq",
    label: "is",
    validate(value: ConditionValue) {
      if (typeof value !== "string" || value.length === 0) {
        throw new Error("Please select a valid value.");
      }
    },
    evaluate(attributeValue: number | string, conditionValue: ConditionValue) {
      if (
        typeof attributeValue !== "string" ||
        typeof conditionValue !== "string"
      ) {
        return false;
      }

      return attributeValue === conditionValue;
    },
  },

  // Not equal (string)
  ne: {
    name: "ne",
    label: "is not",
    validate(value: ConditionValue) {
      if (typeof value !== "string" || value.length === 0) {
        throw new Error("Please select a valid value.");
      }
    },
    evaluate(attributeValue: number | string, conditionValue: ConditionValue) {
      if (
        typeof attributeValue !== "string" ||
        typeof conditionValue !== "string"
      ) {
        return false;
      }

      return attributeValue !== conditionValue;
    },
  },

  // In list (string[])
  in: {
    name: "in",
    label: "is any of",
    validate(value: ConditionValue) {
      if (
        !Array.isArray(value) ||
        value.length === 0 ||
        value.some((v) => typeof v !== "string" || v.length === 0)
      ) {
        throw new Error("Please select at least one valid value.");
      }
    },
    evaluate(attributeValue: number | string, conditionValue: ConditionValue) {
      if (
        typeof attributeValue !== "string" ||
        !Array.isArray(conditionValue)
      ) {
        return false;
      }

      return conditionValue.includes(attributeValue);
    },
  },

  // Not in list (string[])
  notIn: {
    name: "notIn",
    label: "is not any of",
    validate(value: ConditionValue) {
      if (
        !Array.isArray(value) ||
        value.length === 0 ||
        value.some((v) => typeof v !== "string" || v.length === 0)
      ) {
        throw new Error("Please select at least one valid value.");
      }
    },
    evaluate(attributeValue: number | string, conditionValue: ConditionValue) {
      if (
        typeof attributeValue !== "string" ||
        !Array.isArray(conditionValue)
      ) {
        return false;
      }

      return !conditionValue.includes(attributeValue);
    },
  },
} satisfies Record<string, WorkflowOperator>;

export const WORKFLOW_OPERATOR_KEYS = Object.keys(
  WORKFLOW_OPERATORS,
) as readonly (keyof typeof WORKFLOW_OPERATORS)[];
