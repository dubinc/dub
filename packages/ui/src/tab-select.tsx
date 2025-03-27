import { cn } from "@dub/utils";
import { cva, VariantProps } from "class-variance-authority";
import { LayoutGroup, motion } from "framer-motion";
import { Dispatch, SetStateAction, useId } from "react";
import { ArrowUpRight } from "./icons";

const tabSelectButtonVariants = cva("p-4 transition-colors duration-75", {
  variants: {
    variant: {
      default:
        "text-content-subtle data-[selected=true]:text-content-emphasis data-[selected=false]:hover:text-content-default",
      accent:
        "text-content-subtle transition-[color,font-weight] data-[selected=true]:text-blue-600 data-[selected=false]:hover:text-content-default data-[selected=true]:font-medium",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const tabSelectIndicatorVariants = cva("absolute bottom-0 w-full px-1.5", {
  variants: {
    variant: {
      default: "text-bg-inverted",
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
  options: { id: T; label: string; href?: string }[];
  selected: string | null;
  onSelect?: Dispatch<SetStateAction<T>> | ((id: T) => void);
  className?: string;
}) {
  const layoutGroupId = useId();

  return (
    <div className={cn("flex text-sm", className)}>
      <LayoutGroup id={layoutGroupId}>
        {options.map(({ id, label, href }) => {
          const isSelected = id === selected;
          const As = href ? "a" : "div";
          return (
            <As
              key={id}
              className="relative"
              href={href ?? "#"}
              target={href ? "_blank" : undefined}
            >
              <button
                type="button"
                {...(!href && { onClick: () => onSelect?.(id) })}
                className={cn(
                  tabSelectButtonVariants({ variant }),
                  href && "group flex items-center gap-1.5",
                )}
                data-selected={isSelected}
                aria-selected={isSelected}
              >
                {label}
                {href && <ArrowUpRight className="size-2.5" />}
              </button>
              {isSelected && (
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
            </As>
          );
        })}
      </LayoutGroup>
    </div>
  );
}
