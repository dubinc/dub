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
  onRemove: (key: string, value: FilterOption["value"]) => void;
  onRemoveAll: () => void;
  className?: string;
};

export function FilterList({
  filters,
  activeFilters,
  onRemove,
  onRemoveAll,
  className,
}: FilterListProps) {
  return (
    <AnimatedSizeContainer
      height
      className="w-full"
      transition={{ type: "tween", duration: 0.3 }}
    >
      <div
        className={cn(
          "flex w-full flex-wrap items-start gap-4 sm:flex-nowrap sm:items-center",
          className,
        )}
      >
        <div className="flex grow flex-wrap gap-x-4 gap-y-2">
          <AnimatePresence>
            {activeFilters?.map(({ key, value: filterValue }) => {
              if (key === "loader") {
                return (
                  <motion.div
                    key={`loader-${filterValue}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="h-9 w-48 animate-pulse rounded-md border border-gray-200 bg-white"
                  />
                );
              }

              const filter = filters.find((f) => f.key === key);
              if (!filter) {
                throw new Error(
                  "Filter.List received an activeFilter without a corresponding filter",
                );
              }

              return (
                filter.multiple && Array.isArray(filterValue)
                  ? filterValue
                  : [filterValue]
              ).map((value) => {
                const option = filter.options?.find((o) =>
                  typeof o.value === "string" && typeof value === "string"
                    ? o.value.toLowerCase() === value.toLowerCase()
                    : o.value === value,
                );

                const OptionIcon =
                  option?.icon ??
                  filter.getOptionIcon?.(value, {
                    key: filter.key,
                    option,
                  }) ??
                  filter.icon;

                const optionLabel =
                  option?.label ??
                  filter.getOptionLabel?.(value, { key: filter.key, option }) ??
                  value;

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
                        <>
                          <span className="shrink-0 text-gray-600">
                            {isReactNode(OptionIcon) ? (
                              OptionIcon
                            ) : (
                              <OptionIcon className="h-4 w-4" />
                            )}
                          </span>
                          {truncate(optionLabel, 30)}
                        </>
                      ) : (
                        <div className="h-5 w-12 animate-pulse rounded-md bg-gray-200" />
                      )}
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      className="h-full rounded-r-md p-2 text-gray-500 ring-inset ring-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus-visible:ring-1"
                      onClick={() => onRemove(key, value)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                );
              });
            })}
          </AnimatePresence>
        </div>
        {activeFilters?.length !== 0 && (
          <button
            type="button"
            className="whitespace-nowrap rounded-lg border border-transparent px-3 py-2 text-sm text-gray-500 ring-inset ring-gray-500 transition-colors hover:border-gray-200 hover:bg-white hover:text-black focus:outline-none"
            onClick={onRemoveAll}
          >
            Clear Filters
          </button>
        )}
      </div>
    </AnimatedSizeContainer>
  );
}

const isReactNode = (element: any): element is ReactNode =>
  isValidElement(element);
