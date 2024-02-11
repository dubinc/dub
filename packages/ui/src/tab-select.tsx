import { cn } from "@dub/utils";
import { motion } from "framer-motion";

export function TabSelect({
  options,
  selected,
  selectAction,
}: {
  options: string[];
  selected: string;
  selectAction: (option: string) => void;
}) {
  return (
    <div className="relative inline-flex items-center space-x-1">
      {options.map((option) => (
        <button
          key={option}
          className={cn(
            "relative z-10 px-3 py-1 text-sm font-medium capitalize",
            {
              "transition-all hover:text-gray-500": option !== selected,
            },
          )}
          onClick={() => selectAction(option)}
        >
          <p>{option}</p>
          {option === selected && (
            <motion.div
              layoutId={options.join("-")}
              className="absolute left-0 top-0 h-full w-full rounded-lg border border-gray-200 bg-gray-50"
              style={{ zIndex: -1 }}
              transition={{ duration: 0.25 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
