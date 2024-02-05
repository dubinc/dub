"use client";

import { nFormatter, timeAgo } from "@dub/utils";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { HelpCircle } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

export function TooltipProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <TooltipPrimitive.Provider delayDuration={100}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function Tooltip({
  children,
  content,
  side = "top",
}: {
  children: ReactNode;
  content: ReactNode | string;
  side?: "top" | "bottom" | "left" | "right";
}): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <TooltipPrimitive.Root onOpenChange={setOpen} open={open}>
      <TooltipPrimitive.Trigger
        asChild
        onBlur={() => {
          setOpen(false);
        }}
        onClick={() => {
          setOpen(true);
        }}
      >
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className="animate-slide-up-fade z-[99] items-center overflow-hidden rounded-md border border-gray-200 bg-white shadow-md"
          side={side}
          sideOffset={8}
        >
          {typeof content === "string" ? (
            <span className="block max-w-xs px-4 py-2 text-center text-sm text-gray-700">
              {content}
            </span>
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
}): JSX.Element {
  return (
    <div className="flex max-w-xs flex-col items-center space-y-3 p-4 text-center">
      <p className="text-sm text-gray-700">{title}</p>
      {cta ? href ? (
          <Link
            href={href}
            {...(target ? { target } : {})}
            className="mt-4 w-full rounded-md border border-black bg-black px-3 py-1.5 text-center text-sm text-white transition-all hover:bg-white hover:text-black"
          >
            {cta}
          </Link>
        ) : onClick ? (
          <button
            className="mt-4 w-full rounded-md border border-black bg-black px-3 py-1.5 text-center text-sm text-white transition-all hover:bg-white hover:text-black"
            onClick={onClick}
            type="button"
          >
            {cta}
          </button>
        ) : null : null}
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
}): JSX.Element {
  return (
    <div className="max-w-xs px-4 py-2 text-center text-sm text-gray-700">
      {title}{" "}
      <a
        className="inline-flex text-gray-500 underline underline-offset-4 hover:text-gray-800"
        href={href}
        rel="noopener" target="_blank"
      >
        {cta}
      </a>
    </div>
  );
}

export function InfoTooltip({
  content,
}: {
  content: ReactNode | string;
}): JSX.Element {
  return (
    <Tooltip content={content}>
      <HelpCircle className="h-4 w-4 text-gray-500" />
    </Tooltip>
  );
}

export function NumberTooltip({
  value,
  unit = "total clicks",
  children,
  lastClicked,
}: {
  value?: number | null;
  unit?: string;
  children: ReactNode;
  lastClicked?: Date | null;
}) {
  if ((!value || value < 1000) && !lastClicked) {
    return children;
  }
  return (
    <Tooltip
      content={
        <div className="block max-w-xs px-4 py-2 text-center text-sm text-gray-700">
          <p className="text-sm font-semibold text-gray-700">
            {nFormatter(value || 0, { full: true })} {unit}
          </p>
          {lastClicked ? <p className="mt-1 text-xs text-gray-500" suppressHydrationWarning>
              Last clicked {timeAgo(lastClicked, { withAgo: true })}
            </p> : null}
        </div>
      }
    >
      {children}
    </Tooltip>
  );
}
