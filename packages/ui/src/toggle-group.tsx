import { cn } from "@dub/utils";
import { LayoutGroup, motion } from "framer-motion";
import { useId } from "react";

interface ToggleOption {
  value: string;
  label: string;
}

export function ToggleGroup({
  options,
  selected,
  selectAction,
}: {
  options: ToggleOption[];
  selected: string | null;
  selectAction: (option: string) => void;
}) {
  const layoutGroupId = useId();

  return (
    <div className="relative inline-flex items-center space-x-1 rounded-xl border border-gray-200 bg-white p-1">
      <LayoutGroup id={layoutGroupId}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={cn(
              "relative z-10 px-3 py-1 text-sm font-medium capitalize",
              {
                "transition-all hover:text-gray-500": option.value !== selected,
              },
            )}
            onClick={() => selectAction(option.value)}
          >
            <p>{option.label}</p>
            {option.value === selected && (
              <motion.div
                layoutId={options.join("-")}
                className="absolute left-0 top-0 h-full w-full rounded-lg border border-gray-200 bg-gray-50"
                style={{ zIndex: -1 }}
                transition={{ duration: 0.25 }}
              />
            )}
          </button>
        ))}
      </LayoutGroup>
    </div>
  );
}
