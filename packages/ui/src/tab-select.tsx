import { cn } from "@dub/utils";
import { cva, VariantProps } from "class-variance-authority";
import { LayoutGroup, motion } from "framer-motion";
import { Dispatch, SetStateAction, useId } from "react";

const tabSelectButtonVariants = cva("p-4 transition-colors duration-75", {
  variants: {
    variant: {
      default:
        "text-gray-400 data-[selected=true]:text-black data-[selected=false]:hover:text-gray-500",
      accent:
        "text-neutral-500 transition-[color,font-weight] data-[selected=true]:text-blue-600 data-[selected=false]:hover:text-neutral-700 data-[selected=true]:font-medium",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const tabSelectIndicatorVariants = cva("absolute bottom-0 w-full px-1.5", {
  variants: {
    variant: {
      default: "text-black",
      accent: "text-blue-600",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export function TabSelect<T extends string>({
  variant,
  options,
  selected,
  onSelect,
  className,
}: VariantProps<typeof tabSelectButtonVariants> & {
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
              className={tabSelectButtonVariants({ variant })}
              data-selected={id === selected}
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
                className={tabSelectIndicatorVariants({ variant })}
              >
                <div className="h-0.5 rounded-t-full bg-current" />
              </motion.div>
            )}
          </div>
        ))}
      </LayoutGroup>
    </div>
  );
}
