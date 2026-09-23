"use client";

import { cn } from "@dub/utils";
import { useState } from "react";
import { CircleQuestion } from "./icons/circle-question";

export function HelpButton({
  variant = "default",
}: {
  variant?: "default" | "secondary";
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href="https://dub.co/contact/support"
      target="_blank"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={cn(
        "shrink-0 items-center justify-center rounded-lg",
        variant === "secondary"
          ? "flex h-8 w-8 border border-neutral-200 bg-white text-neutral-700 shadow-sm transition-colors hover:bg-neutral-100"
          : "text-content-default hover:bg-bg-inverted/5 flex size-11",
      )}
    >
      <CircleQuestion
        className="size-5"
        strokeWidth={2}
        data-hovered={hovered}
      />
    </a>
  );
}
