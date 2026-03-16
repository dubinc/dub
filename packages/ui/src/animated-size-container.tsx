import { cn } from "@dub/utils";
import { motion } from "motion/react";
import {
  ComponentPropsWithoutRef,
  ForwardRefExoticComponent,
  PropsWithChildren,
  RefAttributes,
  forwardRef,
  useRef,
} from "react";
import { useResizeObserver } from "./hooks";

const defaultTransition = { type: "spring" as const, duration: 0.3 };

type AnimatedSizeContainerProps = PropsWithChildren<{
  width?: boolean;
  height?: boolean;
}> &
  Omit<ComponentPropsWithoutRef<typeof motion.div>, "animate" | "children">;

/**
 * A container with animated width and height (each optional) based on children dimensions
 */
const AnimatedSizeContainer: ForwardRefExoticComponent<
  AnimatedSizeContainerProps & RefAttributes<HTMLDivElement>
> = forwardRef<HTMLDivElement, AnimatedSizeContainerProps>(
  (
    {
      width = false,
      height = false,
      className,
      transition,
      children,
      ...rest
    }: AnimatedSizeContainerProps,
    forwardedRef,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const resizeObserverEntry = useResizeObserver(containerRef);
    const hasMeasuredRef = useRef(false);

    const measuredWidth = resizeObserverEntry?.contentRect?.width;
    const measuredHeight = resizeObserverEntry?.contentRect?.height;
    const isFirstMeasurement =
      (width ? measuredWidth != null : true) &&
      (height ? measuredHeight != null : true) &&
      !hasMeasuredRef.current;

    if (resizeObserverEntry) {
      hasMeasuredRef.current = true;
    }

    const effectiveTransition =
      transition ?? (isFirstMeasurement ? { duration: 0 } : defaultTransition);

    return (
      <motion.div
        ref={forwardedRef}
        className={cn("overflow-hidden", className)}
        animate={{
          width: width ? measuredWidth ?? "auto" : "auto",
          height: height ? measuredHeight ?? "auto" : "auto",
        }}
        transition={effectiveTransition}
        {...rest}
      >
        <div
          ref={containerRef}
          className={cn(height && "h-max", width && "w-max")}
        >
          {children}
        </div>
      </motion.div>
    );
  },
);

AnimatedSizeContainer.displayName = "AnimatedSizeContainer";

export { AnimatedSizeContainer };
