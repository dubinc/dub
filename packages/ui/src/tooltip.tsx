"use client";

import { cn, nFormatter, timeAgo } from "@dub/utils";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import Linkify from "linkify-react";
import { HelpCircle } from "lucide-react";
import Link from "next/link";
import { ReactNode, useState } from "react";
import { Badge } from "./badge";
import { Button, ButtonProps, buttonVariants } from "./button";

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export interface TooltipProps
  extends Omit<TooltipPrimitive.TooltipContentProps, "content"> {
  content:
    | ReactNode
    | string
    | ((props: { setOpen: (open: boolean) => void }) => ReactNode);
  contentClassName?: string;
  disableHoverableContent?: TooltipPrimitive.TooltipProps["disableHoverableContent"];
  delayDuration?: TooltipPrimitive.TooltipProps["delayDuration"];
}

export function Tooltip({
  children,
  content,
  contentClassName,
  side = "top",
  disableHoverableContent,
  delayDuration = 0,
  ...rest
}: TooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipPrimitive.Root
      open={open}
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
            <span
              className={cn(
                "block max-w-xs text-pretty px-4 py-2 text-center text-sm text-neutral-700",
                contentClassName,
              )}
            >
              {content}
            </span>
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
  title: ReactNode;
  cta?: string;
  href?: string;
  target?: string;
  onClick?: () => void;
}) {
  return (
    <div className="flex max-w-xs flex-col items-center space-y-3 p-4 text-center">
      <p className="text-sm text-neutral-700">{title}</p>
      {cta &&
        (href ? (
          <Link
            href={href}
            {...(target ? { target } : {})}
            className={cn(
              buttonVariants({ variant: "primary" }),
              "flex h-9 w-full items-center justify-center whitespace-nowrap rounded-lg border px-4 text-sm",
            )}
          >
            {cta}
          </Link>
        ) : onClick ? (
          <Button
            onClick={onClick}
            text={cta}
            variant="primary"
            className="h-9"
          />
        ) : null)}
    </div>
  );
}

export function SimpleTooltipContent({
  title,
  cta,
  href,
}: {
  title: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="max-w-xs px-4 py-2 text-center text-sm text-neutral-700">
      {title}{" "}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex text-neutral-500 underline underline-offset-4 hover:text-neutral-800"
      >
        {cta}
      </a>
    </div>
  );
}

export function LinkifyTooltipContent({ children }: { children: ReactNode }) {
  return (
    <div className="block max-w-md whitespace-pre-wrap px-4 py-2 text-center text-sm text-neutral-700">
      <Linkify
        as="p"
        options={{
          target: "_blank",
          rel: "noopener noreferrer nofollow",
          className:
            "underline underline-offset-4 text-neutral-400 hover:text-neutral-700",
        }}
      >
        {children}
      </Linkify>
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

export function NumberTooltip({
  value,
  unit = "total clicks",
  prefix,
  children,
  lastClicked,
}: {
  value?: number | null;
  unit?: string;
  prefix?: string;
  children: ReactNode;
  lastClicked?: Date | null;
}) {
  if ((!value || value < 1000) && !lastClicked) {
    return children;
  }
  return (
    <Tooltip
      content={
        <div className="block max-w-xs px-4 py-2 text-center text-sm text-neutral-700">
          <p className="text-sm font-semibold text-neutral-700">
            {prefix}
            {nFormatter(value || 0, { full: true })} {unit}
          </p>
          {lastClicked && (
            <p
              className="mt-1 text-xs text-neutral-500"
              suppressHydrationWarning
            >
              Last clicked {timeAgo(lastClicked, { withAgo: true })}
            </p>
          )}
        </div>
      }
    >
      {children}
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
