import { nFormatter } from "@dub/utils";
import { Slot } from "@radix-ui/react-slot";
import React, {
  ElementType,
  ForwardedRef,
  ReactNode,
  useEffect,
  useState,
} from "react";

interface CountingNumbersProps {
  asChild?: boolean;
  className?: string;
  children: ReactNode;
  prefix?: ReactNode;
  duration?: number;
  as?: ElementType; // Allows defining the component as 'h1', 'h2', 'p', etc.
  variant?: "full" | "compact";
}

const CountingNumbers = React.forwardRef<HTMLSpanElement, CountingNumbersProps>(
  (
    {
      asChild,
      className,
      children,
      prefix,
      duration = 250,
      as: Component = "span",
      variant = "compact",
      ...props
    },
    ref: ForwardedRef<any>,
  ) => {
    const [displayValue, setDisplayValue] = useState(Number(children));

    useEffect(() => {
      if (isNaN(Number(children))) {
        console.warn("CountingNumbers expects a numeric value as children.");
        return;
      }
      const target = Number(children);
      const startValue = displayValue;
      const endValue = target;
      const startTime = performance.now();

      const tick = () => {
        const now = performance.now();
        const progress = Math.min((now - startTime) / duration, 1);
        const currentValue = startValue + (endValue - startValue) * progress;
        setDisplayValue(Math.round(currentValue));

        if (progress < 1) {
          requestAnimationFrame(tick);
        }
      };

      requestAnimationFrame(tick);
    }, [children, duration]); // Depend on children and duration for changes

    const Comp = asChild ? Slot : Component;

    return (
      <Comp ref={ref} className={className} {...props}>
        {prefix}
        {nFormatter(
          displayValue,
          variant === "full" ? { full: true } : undefined,
        )}
      </Comp>
    );
  },
);

CountingNumbers.displayName = "CountingNumbers";

export { CountingNumbers };
