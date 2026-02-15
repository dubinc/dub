import { type FilterOperator } from "@dub/utils";
import { LucideIcon } from "lucide-react";
import { ComponentType, ReactNode, SVGProps } from "react";

type FilterIcon =
  | LucideIcon
  | ReactNode
  | ComponentType<SVGProps<SVGSVGElement>>;

export type { FilterOperator };

export type Filter = {
  key: string;
  icon: FilterIcon;
  label: string;
  labelPlural?: string; // Plural form of the label (optional, defaults to pluralize(label))
  options: FilterOption[] | null;
  hideInFilterDropdown?: boolean; // Hide in Filter.Select dropdown
  shouldFilter?: boolean; // Disable filtering for this filter
  separatorAfter?: boolean; // Add a separator after the filter in Filter.Select dropdown
  multiple?: boolean; // Allow multiple selection of values
  hideMultipleIcons?: boolean; // Hide multiple "stacked icons" view for the filter (fallback to icon display)
  singleSelect?: boolean; // Force single-select behavior even if multiSelect is enabled globally
  hideOperator?: boolean; // Hide the operator dropdown (is/is not) even when multiple is enabled
  getOptionIcon?: (
    value: FilterOption["value"],
    props: { key: Filter["key"]; option?: FilterOption },
  ) => FilterIcon | null;
  getOptionLabel?: (
    value: FilterOption["value"],
    props: { key: Filter["key"]; option?: FilterOption },
  ) => string | null;
  getOptionPermalink?: (value: FilterOption["value"]) => string | null;
};

export type FilterOption = {
  value: any;
  label: string;
  right?: ReactNode;
  icon?: FilterIcon;
  hideDuringSearch?: boolean;
  data?: Record<string, any>;
  permalink?: string;
};

export type ActiveFilter = {
  key: Filter["key"];
  values: FilterOption["value"][];
  operator: FilterOperator;
};

export type LegacyActiveFilterSingular = {
  key: Filter["key"];
  value: FilterOption["value"];
};

export type LegacyActiveFilterPlural = {
  key: Filter["key"];
  values: FilterOption["value"][];
};

export type ActiveFilterInput =
  | ActiveFilter
  | LegacyActiveFilterSingular
  | LegacyActiveFilterPlural;

/**
 * Normalize active filter to the new format with operator support
 * Handles backward compatibility with legacy formats:
 * - { key, value } → { key, values: [value], operator: 'IS' }
 * - { key, values } → { key, values, operator: 'IS' or 'IS_ONE_OF' }
 * - { key, values, operator } → unchanged (already correct)
 */
export function normalizeActiveFilter(filter: ActiveFilterInput): ActiveFilter {
  if ("operator" in filter && filter.operator && Array.isArray(filter.values)) {
    return filter as ActiveFilter;
  }

  if ("value" in filter && !("values" in filter)) {
    return {
      key: filter.key,
      operator: "IS" as FilterOperator,
      values: [filter.value],
    };
  }

  if (
    Array.isArray((filter as any).values) &&
    (!("operator" in filter) || !filter.operator)
  ) {
    const values = (filter as LegacyActiveFilterPlural).values;
    return {
      key: filter.key,
      operator: values.length > 1 ? "IS_ONE_OF" : "IS",
      values: values,
    };
  }

  return {
    key: filter.key,
    operator: "IS",
    values: [],
  };
}
