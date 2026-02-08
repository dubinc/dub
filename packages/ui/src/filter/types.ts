import { LucideIcon } from "lucide-react";
import { ComponentType, ReactNode, SVGProps } from "react";

type FilterIcon =
  | LucideIcon
  | ReactNode
  | ComponentType<SVGProps<SVGSVGElement>>;

export type Filter = {
  key: string;
  icon: FilterIcon;
  label: string;
  options: FilterOption[] | null;
  hideInFilterDropdown?: boolean;
  shouldFilter?: boolean;
  separatorAfter?: boolean;
  multiple?: boolean;
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
