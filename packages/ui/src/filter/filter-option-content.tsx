import { truncate } from "@dub/utils";
import { isValidElement, ReactNode } from "react";
import { Filter } from "./types";

interface IOptionContentProps {
  filter: Filter;
  optionLabel: string;
  OptionIcon: Filter['icon'];
}

export function FilterOptionContent({
  filter,
  optionLabel,
  OptionIcon,
}: IOptionContentProps) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      {filter.options ? (
        <>
          <span className="shrink-0 text-neutral-600">
            {isReactNode(OptionIcon) ? (
              OptionIcon
            ) : (
              <OptionIcon className="h-4 w-4" />
            )}
          </span>
          {truncate(optionLabel, 30)}
        </>
      ) : (
        <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-200" />
      )}
    </div>
  );
}

const isReactNode = (element: any): element is ReactNode =>
  isValidElement(element);
