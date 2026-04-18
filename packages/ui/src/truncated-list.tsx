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

      const childNodes = Array.from(
        containerRef.current.children,
      ) as HTMLElement[];

      // Show all items except for the overflow indicator
      childNodes.forEach((node) => {
        node.hidden = Boolean(node.getAttribute("data-overflow-indicator"));
      });

      // No need to truncate if there's only one item
      if (childNodes.length <= 2) {
        setVisible(childNodes.length - 1);
        return;
      }

      // Check if last item already fits
      const lastElement = childNodes[childNodes.length - 2];
      if (
        contains(
          containerRef.current.getBoundingClientRect(),
          lastElement.getBoundingClientRect(),
        )
      ) {
        setVisible(childNodes.length - 1);
        return;
      }

      // Last item doesn't fit: show the overflow indicator
      childNodes
        .filter((node) => node.getAttribute("data-overflow-indicator"))
        .forEach((node) => {
          node.hidden = false;
        });

      // Find all non-overflow-indicator elements that don't fit
      const elementsToHide = childNodes.filter(
        (node) =>
          containerRef.current &&
          !node.getAttribute("data-overflow-indicator") &&
          !contains(
            containerRef.current.getBoundingClientRect(),
            node.getBoundingClientRect(),
          ),
      );

      // Hide the elements that don't fit
      elementsToHide.forEach((node) => {
        node.hidden = true;
      });

      setVisible(childNodes.length - 1 - elementsToHide.length);
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

        <ItemAs hidden data-overflow-indicator>
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

const contains = (parent: DOMRect, child: DOMRect) => {
  return (
    child.top >= parent.top &&
    child.bottom <= parent.bottom &&
    child.left >= parent.left &&
    child.right <= parent.right
  );
};

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
