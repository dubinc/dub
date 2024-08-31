import { cn } from "@dub/utils";
import { LayoutGroup, motion } from "framer-motion";
import { Dispatch, SetStateAction, useId } from "react";

export function TabSelect<T extends string>({
  options,
  selected,
  onSelect,
  className,
}: {
  options: { id: T; label: string }[];
  selected: string | null;
  onSelect?: Dispatch<SetStateAction<T>> | ((id: T) => void);
  className?: string;
}) {
  const layoutGroupId = useId();

  return (
    <div className={cn("flex text-sm", className)}>
      <LayoutGroup id={layoutGroupId}>
        {options.map(({ id, label }) => (
          <div key={id} className="relative">
            <button
              type="button"
              onClick={() => onSelect?.(id)}
              className={cn(
                "p-4 transition-colors duration-75",
                id === selected
                  ? "text-black"
                  : "text-gray-400 hover:text-gray-500",
              )}
              aria-selected={id === selected}
            >
              {label}
            </button>
            {id === selected && (
              <motion.div
                layoutId="indicator"
                transition={{
                  duration: 0.1,
                }}
                className="absolute bottom-0 w-full px-1.5"
              >
                <div className="h-0.5 bg-black" />
              </motion.div>
            )}
          </div>
        ))}
      </LayoutGroup>
    </div>
  );
}
