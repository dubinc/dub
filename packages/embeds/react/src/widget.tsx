"use client";

import { DubOptions, init } from "@dub/embed-core";
import {
  Children,
  cloneElement,
  HTMLAttributes,
  isValidElement,
  memo,
  PropsWithChildren,
  useEffect,
  useId,
  useRef,
} from "react";

export const DubWidget = memo(
  ({ children, ...options }: PropsWithChildren<DubOptions>) => {
    const id = useId();
    const toggleWidgetRef = useRef<() => void>();

    useEffect(() => {
      const { destroy, toggleWidget } =
        init({
          ...options,
          anchorId: children && options.placement !== "center" ? id : undefined,
        }) || {};

      toggleWidgetRef.current = toggleWidget;

      return () => destroy?.();
    }, [children, id, options]);

    return children ? (
      <Slot id={id} onClick={() => toggleWidgetRef.current?.()}>
        {children}
      </Slot>
    ) : null;
  },
);

function Slot({
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLElement>>) {
  if (Children.count(children) > 1)
    throw new Error("DubWidget may only have one child");

  if (isValidElement(children))
    return cloneElement(children, { ...props, ...children.props });

  return null;
}
