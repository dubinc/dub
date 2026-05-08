import { cn } from "@dub/utils";
import {
  Children,
  ComponentPropsWithoutRef,
  ElementType,
  PropsWithChildren,
  ReactNode,
  memo,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

type TruncatedListState = {
  total: number;
  visible: number;
  hidden: number;
};

type TruncatedListProps<T extends ElementType> = PropsWithChildren<
  ComponentPropsWithoutRef<T>
> & {
  as?: T;
  overflowIndicator: (state: TruncatedListState) => ReactNode;
  className?: string;
  itemProps?: {
    className?: string;
  };
};

export const TruncatedList = memo(
  <T extends ElementType>({
    as,
    overflowIndicator,
    className,
    itemProps = {},
    children,
    ...rest
  }: TruncatedListProps<T>) => {
    const As = as || "div";
    const ItemAs = As === "ul" ? "li" : "div";

    const [visible, setVisible] = useState<number>(0);

    const containerRef = useRef<HTMLElement>(null);

    const truncate = useCallback(() => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const childNodes = Array.from(container.children) as HTMLElement[];
      const tagItems = childNodes.slice(0, -1); // everything except the overflow slot
      const overflowSlot = childNodes[childNodes.length - 1];

      // 1. Show all tags, hide overflow chip
      tagItems.forEach((n) => (n.hidden = false));
      overflowSlot.hidden = true;

      if (tagItems.length === 0) {
        setVisible(0);
        return;
      }

      // Force a synchronous layout reflow before measuring
      void container.offsetWidth;

      const containerRight = container.getBoundingClientRect().right;

      // If the last tag fits, every earlier one does too (left-to-right layout)
      const lastTagRight =
        tagItems[tagItems.length - 1].getBoundingClientRect().right;

      if (lastTagRight <= containerRight + 0.5) {
        setVisible(tagItems.length);
        return;
      }

      // 2. At least one tag overflows — show the chip, then hide tags from the
      //    right one-by-one until the chip itself fits inside the container.
      overflowSlot.hidden = false;

      let visibleCount = tagItems.length;
      while (visibleCount > 0) {
        // Reflow so getBoundingClientRect reflects the latest DOM state
        void container.offsetWidth;

        const chipRight = overflowSlot.getBoundingClientRect().right;
        const currentContainerRight = container.getBoundingClientRect().right;

        if (chipRight <= currentContainerRight + 0.5) break;

        // Hide the rightmost still-visible tag
        tagItems[visibleCount - 1].hidden = true;
        visibleCount--;
      }

      setVisible(visibleCount);
    }, []);

    // Set up a resize observer
    useLayoutEffect(() => {
      if (!containerRef.current) {
        console.error("Failed to get container element for TruncatedList");
        return;
      }

      const resizeObserver = new ResizeObserver(() => truncate());

      resizeObserver.observe(containerRef.current);

      truncate();

      return () => resizeObserver.disconnect();
    }, [truncate, children]);

    const childNodes = Children.toArray(children);

    return (
      <As
        ref={containerRef as any}
        className={cn("overflow-hidden", className)}
        {...rest}
      >
        {childNodes.map((child, index) => (
          <ItemAs key={index} {...itemProps}>
            {child}
          </ItemAs>
        ))}

        <ItemAs className="shrink-0" data-overflow-indicator="">
          {overflowIndicator({
            visible,
            total: childNodes.length,
            hidden: childNodes.length - visible,
          })}
        </ItemAs>
      </As>
    );
  },
  (prevProps, nextProps) => {
    const prev = JSON.stringify(prevProps, circular());
    const next = JSON.stringify(nextProps, circular());
    return prev === next;
  },
);

// https://github.com/facebook/react/issues/8669#issuecomment-531515508
const circular = () => {
  const seen = new WeakSet();
  return (key: string, value: any) => {
    if (key.startsWith("_")) return; // Don't compare React's internal props.
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return;
      seen.add(value);
    }
    return value;
  };
};
