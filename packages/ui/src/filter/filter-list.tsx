import { cn, truncate } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { ReactNode, isValidElement } from "react";
import { AnimatedSizeContainer } from "../animated-size-container";
import { Filter, FilterOption } from "./types";

type FilterListProps = {
  filters: Filter[];
  activeFilters?: {
    key: Filter["key"];
    value: FilterOption["value"];
  }[];
  onRemove: (key: string) => void;
  className?: string;
};

export function FilterList({
  filters,
  activeFilters,
  onRemove,
  className,
}: FilterListProps) {
  return (
    <AnimatedSizeContainer
      height
      className="w-full"
      transition={{ type: "tween", duration: 0.3 }}
    >
      <div className={cn("flex flex-wrap gap-x-4 gap-y-2", className)}>
        <AnimatePresence>
          {activeFilters?.map(({ key, value }) => {
            const filter = filters.find((f) => f.key === key);
            if (!filter) {
              throw new Error(
                "Filter.List received an activeFilter without a corresponding filter",
              );
            }

            const option = filter.options?.find((o) => o.value === value);

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center divide-x rounded-md border border-gray-200 bg-white text-sm text-black"
              >
                {/* Filter */}
                <div className="flex items-center gap-2.5 px-3 py-2">
                  <span className="shrink-0 text-gray-600">
                    {isReactNode(filter.icon) ? (
                      filter.icon
                    ) : (
                      <filter.icon className="h-4 w-4" />
                    )}
                  </span>
                  {filter.label}
                </div>

                {/* is */}
                <div className="px-3 py-2 text-gray-500">is</div>

                {/* Option */}
                <div className="flex items-center gap-2.5 px-3 py-2">
                  {filter.options ? (
                    option ? (
                      <>
                        <span className="shrink-0 text-gray-600">
                          {isReactNode(option.icon) ? (
                            option.icon
                          ) : (
                            <option.icon className="h-4 w-4" />
                          )}
                        </span>
                        {truncate(option.label, 30)}
                      </>
                    ) : (
                      value
                    )
                  ) : (
                    <div className="h-5 w-12 animate-pulse rounded-md bg-gray-200" />
                  )}
                </div>

                {/* Remove */}
                <button
                  type="button"
                  className="h-full rounded-r-md p-2 text-gray-500 ring-inset ring-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus-visible:ring-1"
                  onClick={() => onRemove(key)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </AnimatedSizeContainer>
  );
}

const isReactNode = (element: any): element is ReactNode =>
  isValidElement(element);
