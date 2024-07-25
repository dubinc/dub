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
  separatorAfter?: boolean;
  options: FilterOption[] | null;
  multiple?: boolean;
  getOptionIcon?: (
    value: FilterOption["value"],
    props: { key: Filter["key"]; option?: FilterOption },
  ) => FilterIcon | null;
  getOptionLabel?: (
    value: FilterOption["value"],
    props: { key: Filter["key"]; option?: FilterOption },
  ) => string | null;
};

export type FilterOption = {
  value: any;
  label: string;
  right?: ReactNode;
  icon?: FilterIcon;
  data?: Record<string, any>;
};
