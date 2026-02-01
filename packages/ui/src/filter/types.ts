import { LucideIcon } from "lucide-react";
import { ComponentType, ReactNode, SVGProps } from "react";

type FilterIcon =
  | LucideIcon
  | ReactNode
  | ComponentType<SVGProps<SVGSVGElement>>;

export type FilterOperator = "IS" | "IS_NOT" | "IS_ONE_OF" | "IS_NOT_ONE_OF";

export type Filter = {
  key: string;
  icon: FilterIcon;
  label: string;
  options: FilterOption[] | null;
  hideInFilterDropdown?: boolean;
  shouldFilter?: boolean;
  separatorAfter?: boolean;
  multiple?: boolean;
  singleSelect?: boolean; // Force single-select behavior even if multiSelect is enabled globally
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
