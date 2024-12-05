"use client";

import { DubOptions, init } from "@dub/embed-core";
import {
  Children,
  cloneElement,
  HTMLAttributes,
  HTMLProps,
  isValidElement,
  memo,
  PropsWithChildren,
  ReactNode,
  useEffect,
  useId,
  useRef,
} from "react";

type Options = Omit<DubOptions, "variant" | "token">;

type DubWidgetProps = {
  token: DubOptions["token"];
  options?: Options;
} & (
  | ({
      variant: "inline";
    } & HTMLProps<HTMLDivElement>)
  | {
      variant?: "popup";
      children?: ReactNode;
    }
);

export const DubWidget = memo(
  ({ variant = "popup", token, options, ...rest }: DubWidgetProps) => {
    return variant === "inline" ? (
      <DubInline options={{ ...options, token }} {...rest} />
    ) : (
      <DubPopup options={{ ...options, token }} {...rest} />
    );
  },
);

function DubInline({
  options,
  ...rest
}: { options: Omit<DubOptions, "variant"> } & HTMLProps<HTMLDivElement>) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    const { destroy } =
      init({
        id,
        variant: "inline",
        root: rootRef.current,
        ...options,
      }) || {};

    return () => destroy?.();
  }, [id, options]);

  return <div {...rest} ref={rootRef} />;
}

function DubPopup({
  children,
  options,
}: PropsWithChildren<{ options: Omit<DubOptions, "variant"> }>) {
  const id = useId();
  const toggleWidgetRef = useRef<() => void>();

  useEffect(() => {
    const { destroy, toggleWidget } =
      init({
        id,
        variant: "popup",
        ...options,
      }) || {};

    toggleWidgetRef.current = toggleWidget;

    return () => destroy?.();
  }, [children, id, options]);

  return children ? (
    <Slot id={id} onClick={() => toggleWidgetRef.current?.()}>
      {children}
    </Slot>
  ) : null;
}

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
