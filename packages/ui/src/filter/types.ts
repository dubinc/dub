import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export type Filter = {
  key: string;
  icon: LucideIcon | ReactNode;
  label: string;
  options: FilterOption[] | null;
};

export type FilterOption = {
  value: any;
  icon: LucideIcon | ReactNode;
  label: string;
  right?: ReactNode;
};
