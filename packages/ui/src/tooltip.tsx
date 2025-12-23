"use client";

import { cn } from "@dub/utils";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { HelpCircle } from "lucide-react";
import Link from "next/link";
import { ReactNode, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Badge } from "./badge";
import { Button, ButtonProps, buttonVariants } from "./button";
import { useScrollProgress } from "./hooks/use-scroll-progress";
import { PROSE_STYLES } from "./rich-text-area";

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

const TooltipMarkdown = ({
  className,
  children,
}: {
  className?: string;
  children: string;
}) => {
  return (
    <ReactMarkdown
      className={cn(
        "prose prose-sm prose-neutral max-w-xs text-pretty px-4 py-2 text-center leading-snug transition-all",
        "prose-a:cursor-alias prose-a:underline prose-a:decoration-dotted prose-a:underline-offset-2",
        "prose-code:inline-block prose-code:leading-none",
        PROSE_STYLES.condensed,
        className,
      )}
      components={{
        a: ({ node, ...props }) => (
          <a
            {...props}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        code: ({ node, ...props }) => (
          <code {...props} className="rounded-md bg-neutral-100 px-1 py-0.5" />
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
};
export interface TooltipProps
  extends Omit<TooltipPrimitive.TooltipContentProps, "content"> {
  content:
    | ReactNode
    | string
    | ((props: { setOpen: (open: boolean) => void }) => ReactNode);
  contentClassName?: string;
  disabled?: boolean;
  disableHoverableContent?: TooltipPrimitive.TooltipProps["disableHoverableContent"];
  delayDuration?: TooltipPrimitive.TooltipProps["delayDuration"];
}

export function Tooltip({
  children,
  content,
  contentClassName,
  disabled,
  side = "top",
  disableHoverableContent,
  delayDuration = 0,
  ...rest
}: TooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipPrimitive.Root
      open={disabled ? false : open}
      onOpenChange={setOpen}
      delayDuration={delayDuration}
      disableHoverableContent={disableHoverableContent}
    >
      <TooltipPrimitive.Trigger
        asChild
        onClick={() => {
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
        }}
      >
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={8}
          side={side}
          className="animate-slide-up-fade pointer-events-auto z-[99] items-center overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
          collisionPadding={0}
          {...rest}
        >
          {typeof content === "string" ? (
            <TooltipMarkdown className={contentClassName}>
              {content}
            </TooltipMarkdown>
          ) : typeof content === "function" ? (
            content({ setOpen })
          ) : (
            content
          )}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export function TooltipContent({
  title,
  cta,
  href,
  target,
  onClick,
}: {
  title: string;
  cta?: string;
  href?: string;
  target?: string;
  onClick?: () => void;
}) {
  return (
    <div className="flex max-w-xs flex-col items-center space-y-3 p-4 text-center">
      <TooltipMarkdown className="p-0">{title}</TooltipMarkdown>
      {cta &&
        (href ? (
          <Link
            href={href}
            {...(target ? { target } : {})}
            className={cn(
              buttonVariants({ variant: "primary" }),
              "flex h-8 w-full items-center justify-center whitespace-nowrap rounded-lg border px-4 text-sm",
            )}
          >
            {cta}
          </Link>
        ) : onClick ? (
          <Button
            onClick={onClick}
            text={cta}
            variant="primary"
            className="h-8"
          />
        ) : null)}
    </div>
  );
}

export function InfoTooltip(props: Omit<TooltipProps, "children">) {
  return (
    <Tooltip {...props}>
      <HelpCircle className="h-4 w-4 text-neutral-500" />
    </Tooltip>
  );
}

export function BadgeTooltip({ children, content, ...props }: TooltipProps) {
  return (
    <Tooltip content={content} {...props}>
      <div className="flex cursor-pointer items-center">
        <Badge
          variant="gray"
          className="border-neutral-300 transition-all hover:bg-neutral-200"
        >
          {children}
        </Badge>
      </div>
    </Tooltip>
  );
}

export function ButtonTooltip({
  children,
  tooltipProps,
  ...props
}: {
  children: ReactNode;
  tooltipProps: TooltipProps;
} & ButtonProps) {
  return (
    <Tooltip {...tooltipProps}>
      <button
        type="button"
        {...props}
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-md text-neutral-500 transition-colors duration-75 hover:bg-neutral-100 active:bg-neutral-200 disabled:cursor-not-allowed disabled:hover:bg-transparent",
          props.className,
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}

export function DynamicTooltipWrapper({
  children,
  tooltipProps,
}: {
  children: ReactNode;
  tooltipProps?: TooltipProps;
}) {
  return tooltipProps ? (
    <Tooltip {...tooltipProps}>
      <div>{children}</div>
    </Tooltip>
  ) : (
    children
  );
}

export function ScrollableTooltipContent({
  children,
  maxHeight = "240px",
  className,
}: {
  children: ReactNode;
  maxHeight?: string;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(
    scrollRef,
    {
      direction: "vertical",
    },
  );

  const [showTopGradient, setShowTopGradient] = useState(false);
  const [showBottomGradient, setShowBottomGradient] = useState(false);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const { scrollHeight, clientHeight } = element;
    const canScroll = scrollHeight > clientHeight;

    // Show top gradient if not at top and can scroll
    setShowTopGradient(canScroll && scrollProgress > 0);
    // Show bottom gradient if not at bottom and can scroll
    setShowBottomGradient(canScroll && scrollProgress < 1);
  }, [scrollProgress]);

  return (
    <div className="relative">
      {showTopGradient && (
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-6 rounded-t-xl bg-gradient-to-b from-white to-transparent" />
      )}
      <div
        ref={scrollRef}
        onScroll={updateScrollProgress}
        className={cn(
          "flex flex-col gap-2 overflow-y-auto px-3 py-2",
          className,
        )}
        style={{ maxHeight }}
      >
        {children}
      </div>
      {showBottomGradient && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-6 rounded-b-xl bg-gradient-to-t from-white to-transparent" />
      )}
    </div>
  );
}
