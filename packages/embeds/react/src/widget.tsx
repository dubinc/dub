"use client";

import { DubOptions, init, toggleWidget } from "@dub/embed-core";
import {
  Children,
  cloneElement,
  HTMLAttributes,
  isValidElement,
  memo,
  PropsWithChildren,
  useEffect,
  useId,
} from "react";

export const DubWidget = memo(
  ({ children, ...options }: PropsWithChildren<Omit<DubOptions, "type">>) => {
    const id = useId();

    useEffect(() => {
      const { destroy } = init({
        ...options,
        type: "widget",
        anchorId: children && options.placement !== "center" ? id : undefined,
      });

      return () => destroy();
    }, [children, id, options]);

    return children ? (
      <Slot id={id} onClick={() => toggleWidget()}>
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
