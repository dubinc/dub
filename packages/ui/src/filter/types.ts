import { LucideIcon } from "lucide-react";
import { ComponentType, ReactNode, SVGProps } from "react";

export type Filter = {
  key: string;
  icon: LucideIcon | ReactNode | ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  separatorAfter?: boolean;
  options: FilterOption[] | null;
};

export type FilterOption = {
  value: any;
  icon: LucideIcon | ReactNode | ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  right?: ReactNode;
};
