"use client";

import { Tooltip } from "@dub/ui";
import { cn } from "@dub/utils";
import { PropsWithChildren } from "react";

export function SupportMessage({
  name,
  avatar,
  content,
  animate = false,
  children,
  isUser = false,
}: PropsWithChildren<{
  name: string;
  avatar: string;
  content?: string;
  animate?: boolean;
  isUser?: boolean;
}>) {
  return (
    <div
      className={cn(
        "flex origin-top-left items-start gap-3",
        isUser && "flex-row-reverse",
        animate && "animate-scale-in-fade",
      )}
    >
      <Tooltip content={name}>
        <div className="relative shrink-0">
          <img
            src={avatar}
            alt={`${name} avatar`}
            className="size-8 rounded-full"
            draggable={false}
          />
        </div>
      </Tooltip>

      <div
        className={cn(
          "max-w-[85%] grow py-1",
          isUser && "flex flex-col items-end",
        )}
      >
        {content && (
          <p
            className={cn(
              "rounded-2xl px-3 py-2 text-sm",
              isUser
                ? "bg-neutral-900 text-white"
                : "text-neutral-800",
            )}
          >
            {content}
          </p>
        )}
        {children && (
          <div
            className={cn(
              "text-sm",
              isUser && "bg-neutral-900 text-white rounded-2xl px-3 py-2",
            )}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
