"use client";

import { cn } from "@dub/utils";
import { PropsWithChildren } from "react";

export function SupportMessage({
  avatar,
  content,
  animate = false,
  children,
  isUser = false,
}: PropsWithChildren<{
  avatar?: string;
  content?: string;
  animate?: boolean;
  isUser?: boolean;
}>) {
  return (
    <div
      className={cn(
        "flex origin-top-left items-start gap-3",
        isUser && "flex-row-reverse items-end",
        animate && "animate-scale-in-fade",
      )}
    >
      {avatar && (
        <img
          src={avatar}
          alt="avatar"
          className={cn("size-8 shrink-0 rounded-full", isUser && "mb-1")}
          draggable={false}
        />
      )}

      <div
        className={cn(
          "max-w-[85%] grow py-1",
          isUser && "flex flex-col items-end",
        )}
      >
        {content && (
          <p
            className={cn(
              "rounded-2xl rounded-br px-3 py-2 text-sm",
              isUser ? "bg-neutral-900 text-white" : "text-neutral-800",
            )}
          >
            {content}
          </p>
        )}
        {children && (
          <div
            className={cn(
              "text-sm",
              isUser &&
                "rounded-2xl rounded-br bg-neutral-900 px-3 py-2 text-white",
            )}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
